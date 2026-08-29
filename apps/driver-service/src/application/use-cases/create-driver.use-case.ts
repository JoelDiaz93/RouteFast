import { randomUUID } from 'node:crypto';
import { Driver } from '../../domain/entities/driver.aggregate';
import { DriverRepository } from '../ports/driver.repository';
import { DriverView, toDriverView } from './driver.view';

export class CreateDriverUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(input: { displayName: string; capacity: number }): Promise<DriverView> {
    const driver = Driver.create({ id: randomUUID(), ...input });
    await this.repository.save(driver);
    return toDriverView(driver);
  }
}
