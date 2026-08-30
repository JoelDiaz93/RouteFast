export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type CircuitCallOutcome = 'success' | 'failure' | 'ignored_failure' | 'short_circuited';

export class CircuitOpenError extends Error {
  constructor(readonly dependency: string) {
    super(`Circuit for ${dependency} is open`);
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerHooks {
  onTransition?(from: CircuitBreakerState, to: CircuitBreakerState): void;
  onCall?(outcome: CircuitCallOutcome, durationMs: number): void;
}

export interface CircuitBreakerConfig {
  dependency: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls?: number;
  shouldCountFailure?: (error: unknown) => boolean;
  hooks?: CircuitBreakerHooks;
}

/**
 * Small dependency-free circuit breaker for outbound service calls.
 *
 * It intentionally stays inside infrastructure: application/domain code does not know
 * whether a downstream call is protected by a breaker, retries, or another mechanism.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAtMs = 0;
  private halfOpenInFlight = 0;

  constructor(private readonly config: CircuitBreakerConfig) {
    if (config.failureThreshold < 1) throw new Error('failureThreshold must be >= 1');
    if (config.resetTimeoutMs < 1) throw new Error('resetTimeoutMs must be >= 1');
  }

  currentState(): CircuitBreakerState {
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const started = performance.now();
    this.moveToHalfOpenWhenReady();

    if (this.state === 'OPEN') {
      this.config.hooks?.onCall?.('short_circuited', performance.now() - started);
      throw new CircuitOpenError(this.config.dependency);
    }

    if (this.state === 'HALF_OPEN') {
      const limit = this.config.halfOpenMaxCalls ?? 1;
      if (this.halfOpenInFlight >= limit) {
        this.config.hooks?.onCall?.('short_circuited', performance.now() - started);
        throw new CircuitOpenError(this.config.dependency);
      }
      this.halfOpenInFlight += 1;
    }

    try {
      const result = await operation();
      this.onSuccess();
      this.config.hooks?.onCall?.('success', performance.now() - started);
      return result;
    } catch (error) {
      const shouldCount = this.config.shouldCountFailure?.(error) ?? true;
      if (shouldCount) {
        this.onFailure();
        this.config.hooks?.onCall?.('failure', performance.now() - started);
      } else {
        this.onSuccess();
        this.config.hooks?.onCall?.('ignored_failure', performance.now() - started);
      }
      throw error;
    } finally {
      if (this.state === 'HALF_OPEN' && this.halfOpenInFlight > 0) this.halfOpenInFlight -= 1;
    }
  }

  private moveToHalfOpenWhenReady(): void {
    if (this.state !== 'OPEN') return;
    if (Date.now() - this.openedAtMs < this.config.resetTimeoutMs) return;
    this.transition('HALF_OPEN');
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state !== 'CLOSED') this.transition('CLOSED');
  }

  private onFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.open();
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.config.failureThreshold) this.open();
  }

  private open(): void {
    this.consecutiveFailures = 0;
    this.openedAtMs = Date.now();
    this.transition('OPEN');
  }

  private transition(next: CircuitBreakerState): void {
    if (next === this.state) return;
    const previous = this.state;
    this.state = next;
    if (next !== 'HALF_OPEN') this.halfOpenInFlight = 0;
    this.config.hooks?.onTransition?.(previous, next);
  }
}
