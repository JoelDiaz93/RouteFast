import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Dispatch } from '../../../domain/entities/dispatch.aggregate';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { DISPATCH_WORKFLOW_TRANSACTION, DispatchWorkflowTransaction } from '../../ports/dispatch-workflow.transaction';
import { DriverScoringService } from '../../scoring/driver-scoring.service';
import { DriverDirectoryClient } from '../../../infrastructure/http/driver-directory.client';
import { TrackingGeoClient } from '../../../infrastructure/http/tracking-geo.client';
import { DispatchTimeoutScheduler } from '../../../infrastructure/jobs/dispatch-timeout.scheduler';
import { StartDispatchCommand } from '../start-dispatch.command';

@CommandHandler(StartDispatchCommand)
export class StartDispatchHandler implements ICommandHandler<StartDispatchCommand> {
  constructor(
    @Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository,
    @Inject(DISPATCH_WORKFLOW_TRANSACTION) private readonly workflow: DispatchWorkflowTransaction,
    private readonly timeoutScheduler: DispatchTimeoutScheduler,
    private readonly driverDirectory: DriverDirectoryClient,
    private readonly trackingGeo: TrackingGeoClient,
    private readonly scoring: DriverScoringService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: StartDispatchCommand): Promise<void> {
    const existing = await this.repository.findByOrderId(command.orderId);
    if (existing) return;
    const dispatch = Dispatch.start({ id: randomUUID(), orderId: command.orderId, correlationId: command.correlationId });
    if (!command.pickup) {
      // Backward compatibility for Phase 2/3 events created before geo payloads existed.
      await this.workflow.start(dispatch);
      await this.timeoutScheduler.schedule(dispatch.id, dispatch.correlationId);
      return;
    }

    const candidateLimit = Number(this.config.get<string>('DISPATCH_CANDIDATE_LIMIT', '20'));
    const baseRadius = Number(this.config.get<string>('DISPATCH_SEARCH_RADIUS_KM', '8'));
    const searchRadiusKm = command.priority === 'EXPRESS' ? Math.min(baseRadius, 5)
      : command.priority === 'SCHEDULED' ? baseRadius * 1.5 : baseRadius;
    const maxAgeSeconds = Number(this.config.get<string>('DISPATCH_LOCATION_MAX_AGE_SECONDS', '90'));
    const capacityCandidates = await this.driverDirectory.listCandidates(candidateLimit);
    const geoCandidates = capacityCandidates.length === 0 ? [] : await this.trackingGeo.findNearby({
      latitude: command.pickup.latitude,
      longitude: command.pickup.longitude,
      radiusKm: searchRadiusKm,
      limit: candidateLimit,
      candidateDriverIds: capacityCandidates.map((candidate) => candidate.id),
      maxAgeSeconds,
    });
    const rankedCandidates = this.scoring.rank({
      drivers: capacityCandidates,
      locations: geoCandidates,
      radiusKm: searchRadiusKm,
      priority: command.priority,
    });

    await this.workflow.start(dispatch, {
      strategyVersion: 'geo-score-v1',
      priority: command.priority,
      searchRadiusKm,
      pickup: command.pickup,
      rankedCandidates,
    });
    await this.timeoutScheduler.schedule(dispatch.id, dispatch.correlationId);
  }
}
