import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxOrmEntity, InboxStatus } from './inbox.orm-entity';

export interface ReliableIntegrationEvent {
  eventId: string;
  correlationId: string;
}

@Injectable()
export class InboxService {
  constructor(@InjectRepository(InboxOrmEntity) private readonly repository: Repository<InboxOrmEntity>) {}

  async process<T>(eventType: string, event: ReliableIntegrationEvent, operation: () => Promise<T>): Promise<'processed' | 'duplicate'> {
    const existing = await this.repository.findOne({ where: { eventId: event.eventId } });
    if (existing?.status === InboxStatus.PROCESSED) return 'duplicate';

    if (!existing) {
      try {
        await this.repository.insert({
          eventId: event.eventId,
          eventType,
          correlationId: event.correlationId,
          status: InboxStatus.PROCESSING,
          processedAt: null,
        });
      } catch {
        const raced = await this.repository.findOne({ where: { eventId: event.eventId } });
        if (raced?.status === InboxStatus.PROCESSED) return 'duplicate';
      }
    }

    try {
      await operation();
      await this.repository.update(
        { eventId: event.eventId },
        { status: InboxStatus.PROCESSED, processedAt: new Date() },
      );
      return 'processed';
    } catch (error) {
      // A failed handler must remain eligible for RabbitMQ retry.
      await this.repository.delete({ eventId: event.eventId });
      throw error;
    }
  }
}
