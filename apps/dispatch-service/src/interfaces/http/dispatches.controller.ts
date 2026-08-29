import { Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { CancelDispatchCommand } from '../../application/commands/cancel-dispatch.command';
import { DispatchStatus } from '../../domain/entities/dispatch-status.enum';
import { DispatchView } from '../../application/queries/dispatch.view';
import { GetDispatchQuery } from '../../application/queries/get-dispatch.query';
import { ListDispatchesQuery } from '../../application/queries/list-dispatches.query';
import { CancelDispatchDto } from './dto/cancel-dispatch.dto';

@Controller('dispatches')
export class DispatchesController {
  constructor(private readonly queryBus: QueryBus, private readonly commandBus: CommandBus) {}

  @Get()
  list(): Promise<DispatchView[]> { return this.queryBus.execute(new ListDispatchesQuery()); }

  @Get(':dispatchId')
  async get(@Param('dispatchId') id: string): Promise<DispatchView> {
    const dispatch = await this.queryBus.execute<GetDispatchQuery, DispatchView | null>(new GetDispatchQuery(id));
    if (!dispatch) throw new NotFoundException(`Dispatch ${id} not found`);
    return dispatch;
  }

  @Post(':dispatchId/cancel')
  async cancel(
    @Param('dispatchId') dispatchId: string,
    @Body() body: CancelDispatchDto,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<{ dispatchId: string; status: 'COMPENSATION_REQUESTED' }> {
    const dispatch = await this.queryBus.execute<GetDispatchQuery, DispatchView | null>(new GetDispatchQuery(dispatchId));
    if (!dispatch) throw new NotFoundException(`Dispatch ${dispatchId} not found`);
    if (dispatch.status !== DispatchStatus.ASSIGNED && dispatch.status !== DispatchStatus.COMPENSATING && dispatch.status !== DispatchStatus.CANCELLED) {
      throw new ConflictException(`Dispatch ${dispatchId} cannot be cancelled from ${dispatch.status}`);
    }
    if (dispatch.status === DispatchStatus.ASSIGNED) {
      await this.commandBus.execute(new CancelDispatchCommand(
        dispatchId,
        body.reason?.trim() || 'OPERATOR_CANCELLED',
        correlationId || randomUUID(),
      ));
    }
    return { dispatchId, status: 'COMPENSATION_REQUESTED' };
  }
}
