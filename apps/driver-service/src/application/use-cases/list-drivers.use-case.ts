import { DriverRepository } from '../ports/driver.repository';
import { DriverView, toDriverView } from './driver.view';

export class ListDriversUseCase {
  constructor(private readonly repository: DriverRepository) {}
  async execute(limit = 100): Promise<DriverView[]> {
    return (await this.repository.findAll(limit)).map(toDriverView);
  }
}
