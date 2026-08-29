import { DriverRepository } from '../ports/driver.repository';
import { DriverView, toDriverView } from './driver.view';

export class ListDriversUseCase {
  constructor(private readonly repository: DriverRepository) {}
  async execute(): Promise<DriverView[]> {
    return (await this.repository.findAll()).map(toDriverView);
  }
}
