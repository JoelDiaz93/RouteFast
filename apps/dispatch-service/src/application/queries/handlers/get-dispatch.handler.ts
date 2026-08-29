import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DISPATCH_REPOSITORY, DispatchRepository } from '../../ports/dispatch.repository';
import { DispatchView, toDispatchView } from '../dispatch.view';
import { GetDispatchQuery } from '../get-dispatch.query';
@QueryHandler(GetDispatchQuery)
export class GetDispatchHandler implements IQueryHandler<GetDispatchQuery> {
  constructor(@Inject(DISPATCH_REPOSITORY) private readonly repository: DispatchRepository) {}
  async execute(query: GetDispatchQuery): Promise<DispatchView | null> {
    const dispatch = await this.repository.findById(query.dispatchId); return dispatch ? toDispatchView(dispatch) : null;
  }
}
