import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  it('opens after the configured number of consecutive failures', async () => {
    const breaker = new CircuitBreaker({ dependency: 'tracking', failureThreshold: 2, resetTimeoutMs: 1000 });
    await expect(breaker.execute(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await expect(breaker.execute(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(breaker.currentState()).toBe('OPEN');
    await expect(breaker.execute(async () => 'ok')).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('does not count filtered errors as dependency failures', async () => {
    const breaker = new CircuitBreaker({
      dependency: 'driver',
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      shouldCountFailure: () => false,
    });
    await expect(breaker.execute(async () => { throw new Error('business error'); })).rejects.toThrow('business error');
    expect(breaker.currentState()).toBe('CLOSED');
  });
});
