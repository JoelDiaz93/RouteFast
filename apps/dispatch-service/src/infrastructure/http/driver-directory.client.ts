import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DriverCapacityCandidate } from '../../application/scoring/driver-scoring.service';
import { MetricsService } from '../../observability/metrics.module';
import { CircuitBreaker, CircuitOpenError } from '../resilience/circuit-breaker';

@Injectable()
export class DriverDirectoryClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(private readonly http: HttpService, config: ConfigService, metrics: MetricsService) {
    this.baseUrl = config.get<string>('DRIVER_SERVICE_URL', 'http://localhost:3002');
    this.timeoutMs = Number(config.get<string>('DEPENDENCY_TIMEOUT_MS', '1500'));
    const dependency = 'driver-service';
    this.breaker = new CircuitBreaker({
      dependency,
      failureThreshold: Number(config.get<string>('CIRCUIT_BREAKER_FAILURE_THRESHOLD', '5')),
      resetTimeoutMs: Number(config.get<string>('CIRCUIT_BREAKER_RESET_TIMEOUT_MS', '10000')),
      shouldCountFailure: isDependencyFailure,
      hooks: {
        onTransition: (from, to) => metrics.observeCircuitTransition(dependency, from, to),
        onCall: (outcome, durationMs) => metrics.observeDependency(dependency, outcome, durationMs),
      },
    });
    metrics.setCircuitState(dependency, 'CLOSED');
  }

  async listCandidates(limit: number): Promise<DriverCapacityCandidate[]> {
    try {
      return await this.breaker.execute(async () => {
        const response = await firstValueFrom(this.http.get<DriverCapacityCandidate[]>(
          `${this.baseUrl}/drivers/candidates`, { params: { limit }, timeout: this.timeoutMs },
        ));
        return response.data;
      });
    } catch (error) {
      if (error instanceof CircuitOpenError) throw new ServiceUnavailableException('Driver dependency circuit is open');
      throw error;
    }
  }
}

function isDependencyFailure(error: unknown): boolean {
  return !(error instanceof AxiosError && error.response && error.response.status < 500);
}
