import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  DispatchStartPlan,
  DispatchWorkflowTransaction,
  ReservationResultInput,
} from '../../../application/ports/dispatch-workflow.transaction';
import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DispatchStatus } from '../../../domain/entities/dispatch-status.enum';
import { OutboxOrmEntity, OutboxStatus } from '../../reliability/outbox.orm-entity';
import { DispatchMapper } from './dispatch.mapper';
import { DispatchDecisionOrmEntity } from './dispatch-decision.orm-entity';
import { DispatchOrmEntity } from './dispatch.orm-entity';

@Injectable()
export class TypeOrmDispatchWorkflowTransaction implements DispatchWorkflowTransaction {
  private readonly orderQueue: string;
  private readonly driverQueue: string;

  constructor(private readonly dataSource: DataSource, config: ConfigService) {
    this.orderQueue = config.get<string>('ORDER_EVENTS_QUEUE', 'routefast.order.events');
    this.driverQueue = config.get<string>('DRIVER_EVENTS_QUEUE', 'routefast.driver.events');
  }

  async start(dispatch: Dispatch, plan?: DispatchStartPlan): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const dispatches = manager.getRepository(DispatchOrmEntity);
      const existing = await dispatches.findOne({ where: { orderId: dispatch.orderId } });
      if (existing) return;
      await dispatches.save(DispatchMapper.toPersistence(dispatch));
      if (plan) {
        await manager.getRepository(DispatchDecisionOrmEntity).save({
          id: randomUUID(),
          dispatchId: dispatch.id,
          strategyVersion: plan.strategyVersion,
          priority: plan.priority,
          searchRadiusKm: plan.searchRadiusKm,
          pickupLatitude: plan.pickup.latitude,
          pickupLongitude: plan.pickup.longitude,
          rankedCandidates: plan.rankedCandidates,
          selectedCandidateId: plan.rankedCandidates[0]?.driverId ?? null,
        });
      }
      await this.enqueue(manager, this.orderQueue, 'dispatch.started.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        correlationId: dispatch.correlationId,
      }, dispatch.correlationId);
      await this.enqueue(manager, this.driverQueue, 'driver.reservation_requested.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        correlationId: dispatch.correlationId,
        candidateDriverIds: plan ? plan.rankedCandidates.map((candidate) => candidate.driverId) : undefined,
        selectionStrategy: plan?.strategyVersion ?? 'capacity-fallback-v1',
      }, dispatch.correlationId);
    });
  }

  async completeReservation(input: ReservationResultInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entity = await this.lockDispatch(manager, input.dispatchId);
      if (!entity) return;
      const dispatch = DispatchMapper.toDomain(entity);

      if (dispatch.status !== DispatchStatus.SEARCHING_DRIVER) {
        // A late successful reservation after timeout/failure must be released.
        if (input.driverId && dispatch.status !== DispatchStatus.ASSIGNED && dispatch.status !== DispatchStatus.COMPENSATING) {
          await this.enqueue(manager, this.driverQueue, 'driver.release_requested.v1', {
            dispatchId: dispatch.id,
            orderId: dispatch.orderId,
            driverId: input.driverId,
            correlationId: input.correlationId,
            reason: 'LATE_RESERVATION_COMPENSATION',
          }, input.correlationId);
        }
        return;
      }

      if (input.driverId) {
        dispatch.assign(input.driverId);
        await manager.getRepository(DispatchOrmEntity).save(DispatchMapper.toPersistence(dispatch));
        await this.enqueue(manager, this.orderQueue, 'dispatch.assigned.v1', {
          dispatchId: dispatch.id,
          orderId: dispatch.orderId,
          driverId: input.driverId,
          correlationId: input.correlationId,
        }, input.correlationId);
        return;
      }

      const reason = input.reason ?? 'DRIVER_RESERVATION_FAILED';
      dispatch.fail(reason);
      await manager.getRepository(DispatchOrmEntity).save(DispatchMapper.toPersistence(dispatch));
      await this.enqueue(manager, this.orderQueue, 'dispatch.failed.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        reason,
        correlationId: input.correlationId,
      }, input.correlationId);
    });
  }

  async startCompensation(dispatchId: string, reason: string, correlationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entity = await this.lockDispatch(manager, dispatchId);
      if (!entity) throw new Error(`Dispatch ${dispatchId} not found`);
      const dispatch = DispatchMapper.toDomain(entity);
      if (dispatch.status === DispatchStatus.CANCELLED || dispatch.status === DispatchStatus.COMPENSATING) return;
      dispatch.startCompensation(reason);
      await manager.getRepository(DispatchOrmEntity).save(DispatchMapper.toPersistence(dispatch));
      await this.enqueue(manager, this.driverQueue, 'driver.release_requested.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        driverId: dispatch.driverId,
        correlationId,
        reason,
      }, correlationId);
    });
  }

  async completeCompensation(dispatchId: string, correlationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entity = await this.lockDispatch(manager, dispatchId);
      if (!entity) return;
      const dispatch = DispatchMapper.toDomain(entity);
      if (dispatch.status === DispatchStatus.CANCELLED) return;
      if (dispatch.status !== DispatchStatus.COMPENSATING) return;
      dispatch.completeCompensation();
      await manager.getRepository(DispatchOrmEntity).save(DispatchMapper.toPersistence(dispatch));
      await this.enqueue(manager, this.orderQueue, 'dispatch.cancelled.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        correlationId,
      }, correlationId);
    });
  }

  async timeout(dispatchId: string, correlationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entity = await this.lockDispatch(manager, dispatchId);
      if (!entity) return;
      const dispatch = DispatchMapper.toDomain(entity);
      if (dispatch.status !== DispatchStatus.SEARCHING_DRIVER) return;
      const reason = 'ASSIGNMENT_TIMEOUT';
      dispatch.fail(reason);
      await manager.getRepository(DispatchOrmEntity).save(DispatchMapper.toPersistence(dispatch));
      await this.enqueue(manager, this.orderQueue, 'dispatch.failed.v1', {
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        reason,
        correlationId,
      }, correlationId);
    });
  }

  private lockDispatch(manager: EntityManager, dispatchId: string): Promise<DispatchOrmEntity | null> {
    return manager.getRepository(DispatchOrmEntity)
      .createQueryBuilder('dispatch')
      .setLock('pessimistic_write')
      .where('dispatch.id = :dispatchId', { dispatchId })
      .getOne();
  }

  private async enqueue(
    manager: EntityManager,
    targetQueue: string,
    eventType: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    await manager.getRepository(OutboxOrmEntity).save({
      id: eventId,
      eventType,
      targetQueue,
      payload: { eventId, ...payload },
      status: OutboxStatus.PENDING,
      attempts: 0,
      correlationId,
      availableAt: new Date(),
      publishedAt: null,
    });
  }
}
