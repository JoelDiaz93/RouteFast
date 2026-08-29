import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { DispatchView } from '../../application/queries/dispatch.view';
import { GetDispatchQuery } from '../../application/queries/get-dispatch.query';
import { ListDispatchesQuery } from '../../application/queries/list-dispatches.query';
@Controller('dispatches')
export class DispatchesController {
  constructor(private readonly queryBus: QueryBus) {}
  @Get() list(): Promise<DispatchView[]> { return this.queryBus.execute(new ListDispatchesQuery()); }
  @Get(':dispatchId') async get(@Param('dispatchId') id: string): Promise<DispatchView> {
    const dispatch = await this.queryBus.execute<GetDispatchQuery, DispatchView | null>(new GetDispatchQuery(id));
    if (!dispatch) throw new NotFoundException(`Dispatch ${id} not found`);
    return dispatch;
  }
}
