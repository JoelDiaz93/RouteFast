import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  DriverReservationTransaction,
  ReleaseDriverInput,
  ReserveDriverInput,
} from '../../../application/ports/driver-reservation.transaction';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { OutboxOrmEntity, OutboxStatus } from '../../reliability/outbox.orm-entity';
import { DriverMapper } from './driver.mapper';
import {
  DriverReservationOrmEntity,
  DriverReservationStatus,
} from './driver-reservation.orm-entity';
import { DriverOrmEntity } from './driver.orm-entity';

@Injectable()
export class TypeOrmDriverReservationTransaction implements DriverReservationTransaction {
  private readonly dispatchQueue: string;

  constructor(private readonly dataSource: DataSource, config: ConfigService) {
    this.dispatchQueue = config.get<string>('DISPATCH_EVENTS_QUEUE', 'routefast.dispatch.events');
  }

  async reserve(input: ReserveDriverInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Per-order serialization prevents concurrent duplicate events from reserving two different drivers.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.orderId]);
      const reservations = manager.getRepository(DriverReservationOrmEntity);
      const existing = await reservations.findOne({ where: { orderId: input.orderId } });

      if (existing?.status === DriverReservationStatus.ACTIVE) {
        await this.enqueue(
          manager,
          'driver.reserved.v1',
          { ...input, driverId: existing.driverId },
          input.correlationId,
        );
        return;
      }

      const drivers = manager.getRepository(DriverOrmEntity);
      let entity: DriverOrmEntity | null = null;

      // Phase 4: Dispatch can provide a score-ranked candidate list. We preserve
      // that order while still locking capacity in the Driver bounded context.
      if (input.candidateDriverIds !== undefined) {
        if (input.candidateDriverIds.length === 0) {
          await this.enqueue(
            manager,
            'driver.reservation_failed.v1',
            { ...input, reason: 'NO_GEO_ELIGIBLE_DRIVER' },
            input.correlationId,
          );
          return;
        }
        for (const candidateDriverId of input.candidateDriverIds) {
          entity = await drivers
            .createQueryBuilder('driver')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .where('driver.id = :driverId', { driverId: candidateDriverId })
            .andWhere('driver.status = :status', { status: DriverStatus.AVAILABLE })
            .andWhere('jsonb_array_length(driver.reserved_order_ids) < driver.capacity')
            .getOne();
          if (entity) break;
        }
      } else {
        entity = await drivers
          .createQueryBuilder('driver')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('driver.status = :status', { status: DriverStatus.AVAILABLE })
          .andWhere('jsonb_array_length(driver.reserved_order_ids) < driver.capacity')
          .orderBy('jsonb_array_length(driver.reserved_order_ids)', 'ASC')
          .addOrderBy('driver.created_at', 'ASC')
          .getOne();
      }

      if (!entity) {
        await this.enqueue(
          manager,
          'driver.reservation_failed.v1',
          { ...input, reason: 'NO_AVAILABLE_DRIVER' },
          input.correlationId,
        );
        return;
      }

      const driver = DriverMapper.toDomain(entity);
      driver.reserve(input.orderId);
      entity.reservedOrderIds = [...driver.reservedOrderIds];
      entity.status = driver.status;
      entity.updatedAt = driver.updatedAt;
      await drivers.save(entity);

      await reservations.save({
        id: randomUUID(),
        orderId: input.orderId,
        dispatchId: input.dispatchId,
        driverId: driver.id,
        status: DriverReservationStatus.ACTIVE,
        releasedAt: null,
      });

      await this.enqueue(
        manager,
        'driver.reserved.v1',
        { ...input, driverId: driver.id },
        input.correlationId,
      );
    });
  }

  async release(input: ReleaseDriverInput): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Compensation is serialized by order for the same reason as reservation.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.orderId]);
      const reservations = manager.getRepository(DriverReservationOrmEntity);
      const reservation = await reservations.findOne({ where: { orderId: input.orderId } });

      if (!reservation || reservation.status === DriverReservationStatus.RELEASED) {
        await this.enqueue(
          manager,
          'driver.released.v1',
          { ...input, driverId: reservation?.driverId ?? input.driverId },
          input.correlationId,
        );
        return;
      }

      const drivers = manager.getRepository(DriverOrmEntity);
      const entity = await drivers
        .createQueryBuilder('driver')
        .setLock('pessimistic_write')
        .where('driver.id = :driverId', { driverId: reservation.driverId })
        .getOne();

      if (entity) {
        const driver = DriverMapper.toDomain(entity);
        driver.release(input.orderId);
        entity.reservedOrderIds = [...driver.reservedOrderIds];
        entity.status = driver.status;
        entity.updatedAt = driver.updatedAt;
        await drivers.save(entity);
      }

      reservation.status = DriverReservationStatus.RELEASED;
      reservation.releasedAt = new Date();
      await reservations.save(reservation);

      await this.enqueue(
        manager,
        'driver.released.v1',
        { ...input, driverId: reservation.driverId },
        input.correlationId,
      );
    });
  }

  private async enqueue(
    manager: EntityManager,
    eventType: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    await manager.getRepository(OutboxOrmEntity).save({
      id: eventId,
      eventType,
      targetQueue: this.dispatchQueue,
      payload: { eventId, ...payload },
      status: OutboxStatus.PENDING,
      attempts: 0,
      correlationId,
      availableAt: new Date(),
      publishedAt: null,
    });
  }
}
