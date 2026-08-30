import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DriverGeoCandidate } from '../../application/scoring/driver-scoring.service';
import { MetricsService } from '../../observability/metrics.module';
import { CircuitBreaker, CircuitOpenError } from '../resilience/circuit-breaker';

interface NearbyResponse { driverId: string; distanceKm: number; ageSeconds: number; latitude: number; longitude: number; }

@Injectable()
export class TrackingGeoClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(private readonly http: HttpService, config: ConfigService, metrics: MetricsService) {
    this.baseUrl = config.get<string>('TRACKING_SERVICE_URL', 'http://localhost:3004');
    this.timeoutMs = Number(config.get<string>('DEPENDENCY_TIMEOUT_MS', '1500'));
    const dependency = 'tracking-service';
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

  async findNearby(input: {
    latitude: number; longitude: number; radiusKm: number; limit: number;
    candidateDriverIds: string[]; maxAgeSeconds: number;
  }): Promise<DriverGeoCandidate[]> {
    try {
      return await this.breaker.execute(async () => {
        const response = await firstValueFrom(this.http.post<NearbyResponse[]>(
          `${this.baseUrl}/tracking/nearby`, input, { timeout: this.timeoutMs },
        ));
        return response.data;
      });
    } catch (error) {
      if (error instanceof CircuitOpenError) throw new ServiceUnavailableException('Tracking dependency circuit is open');
      throw error;
    }
  }
}

function isDependencyFailure(error: unknown): boolean {
  return !(error instanceof AxiosError && error.response && error.response.status < 500);
}
