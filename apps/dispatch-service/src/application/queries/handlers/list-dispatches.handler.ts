import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { DispatchView, toDispatchView } from '../dispatch.view';
import { ListDispatchesQuery } from '../list-dispatches.query';
@QueryHandler(ListDispatchesQuery)
export class ListDispatchesHandler implements IQueryHandler<ListDispatchesQuery> {
  constructor(@Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository) {}
  async execute(_: ListDispatchesQuery): Promise<DispatchView[]> { return (await this.repository.findAll()).map(toDispatchView); }
}
