import { Dispatch } from '../dispatch.aggregate';
import { DispatchStatus } from '../dispatch-status.enum';

describe('Dispatch aggregate', () => {
  it('starts by searching for a driver', () => {
    const dispatch = Dispatch.start({ id: '11111111-1111-1111-1111-111111111111', orderId: '22222222-2222-2222-2222-222222222222', correlationId: 'corr-1' });
    expect(dispatch.status).toBe(DispatchStatus.SEARCHING_DRIVER);
  });

  it('can complete with an assigned driver', () => {
    const dispatch = Dispatch.start({ id: '33333333-3333-3333-3333-333333333333', orderId: '44444444-4444-4444-4444-444444444444', correlationId: 'corr-2' });
    dispatch.assign('55555555-5555-5555-5555-555555555555');
    expect(dispatch.status).toBe(DispatchStatus.ASSIGNED);
    expect(dispatch.driverId).toBe('55555555-5555-5555-5555-555555555555');
  });

  it('records a driver search failure', () => {
    const dispatch = Dispatch.start({ id: '66666666-6666-6666-6666-666666666666', orderId: '77777777-7777-7777-7777-777777777777', correlationId: 'corr-3' });
    dispatch.fail('NO_AVAILABLE_DRIVER');
    expect(dispatch.status).toBe(DispatchStatus.FAILED);
    expect(dispatch.failureReason).toBe('NO_AVAILABLE_DRIVER');
  });
});
