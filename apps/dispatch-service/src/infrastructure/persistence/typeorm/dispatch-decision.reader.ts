import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DispatchDecisionOrmEntity } from './dispatch-decision.orm-entity';

@Injectable()
export class DispatchDecisionReader {
  constructor(
    @InjectRepository(DispatchDecisionOrmEntity)
    private readonly repository: Repository<DispatchDecisionOrmEntity>,
  ) {}

  findByDispatchId(dispatchId: string): Promise<DispatchDecisionOrmEntity | null> {
    return this.repository.findOne({ where: { dispatchId } });
  }
}
