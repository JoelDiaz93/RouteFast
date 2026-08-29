import { Driver } from '../driver.aggregate';
import { DriverStatus } from '../driver-status.enum';
import { DriverUnavailableError } from '../../errors/driver-unavailable.error';
describe('Driver aggregate', () => {
  it('tracks capacity across multiple reservations', () => {
    const driver=Driver.create({id:'11111111-1111-1111-1111-111111111111',displayName:'Driver One',capacity:2});
    driver.reserve('22222222-2222-2222-2222-222222222222');
    expect(driver.status).toBe(DriverStatus.AVAILABLE); expect(driver.currentLoad).toBe(1);
    driver.reserve('33333333-3333-3333-3333-333333333333');
    expect(driver.status).toBe(DriverStatus.RESERVED); expect(driver.currentLoad).toBe(2);
  });
  it('rejects a reservation beyond capacity', () => {
    const driver=Driver.create({id:'44444444-4444-4444-4444-444444444444',displayName:'Driver Two',capacity:1});
    driver.reserve('55555555-5555-5555-5555-555555555555');
    expect(()=>driver.reserve('66666666-6666-6666-6666-666666666666')).toThrow(DriverUnavailableError);
  });
  it('treats the same reservation as idempotent', () => {
    const orderId='12121212-1212-1212-1212-121212121212'; const driver=Driver.create({id:'13131313-1313-1313-1313-131313131313',displayName:'Driver Four',capacity:2});
    driver.reserve(orderId); driver.reserve(orderId); expect(driver.currentLoad).toBe(1);
  });
  it('releases capacity', () => {
    const orderId='77777777-7777-7777-7777-777777777777'; const driver=Driver.create({id:'88888888-8888-8888-8888-888888888888',displayName:'Driver Three',capacity:1});
    driver.reserve(orderId); driver.release(orderId); expect(driver.status).toBe(DriverStatus.AVAILABLE); expect(driver.currentLoad).toBe(0);
  });
});
