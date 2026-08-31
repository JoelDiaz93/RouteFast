export type OrderPriority = 'STANDARD' | 'EXPRESS' | 'SCHEDULED';
export type DriverStatus = 'AVAILABLE' | 'RESERVED' | 'OFFLINE';
export type DispatchStatus = 'SEARCHING_DRIVER' | 'ASSIGNED' | 'COMPENSATING' | 'CANCELLED' | 'FAILED';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInput extends Coordinates {
  label: string;
  address: string;
}

export interface Order {
  id: string;
  customerId: string;
  priority: OrderPriority;
  status: string;
  assignedDriverId: string | null;
  lastDispatchFailureReason: string | null;
  pickup: LocationInput;
  dropoff: LocationInput;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  displayName: string;
  capacity: number;
  currentLoad: number;
  remainingCapacity: number;
  status: DriverStatus;
  reservedOrderIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export interface Dispatch {
  id: string;
  orderId: string;
  driverId: string | null;
  status: DispatchStatus;
  failureReason: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchCandidate {
  driverId?: string;
  score?: number;
  distanceKm?: number;
  etaMinutes?: number;
  slaRisk?: string;
  [key: string]: unknown;
}

export interface DispatchDecision {
  id: string;
  dispatchId: string;
  strategyVersion: string;
  priority: string;
  searchRadiusKm: number;
  pickupLatitude: number;
  pickupLongitude: number;
  rankedCandidates: DispatchCandidate[];
  selectedCandidateId: string | null;
  createdAt: string;
}

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  headingDegrees: number | null;
  recordedAt: string;
  receivedAt: string;
}

export interface LocationUpdateResult {
  location: DriverLocation;
  acceptedAsCurrent: boolean;
}

export interface NearbyDriver extends DriverLocation {
  distanceKm: number;
  ageSeconds: number;
}

export interface EtaResult {
  driverId: string;
  distanceKm: number;
  estimatedMinutes: number;
  averageSpeedKph: number;
  roadFactor: number;
  locationAgeSeconds: number;
}

export interface RoutePlanOrder {
  orderId: string;
  demand: number;
  pickup: Coordinates;
  dropoff: Coordinates;
}

export interface PlannedStop extends Coordinates {
  sequence: number;
  orderId: string;
  type: 'PICKUP' | 'DROPOFF';
  demand: number;
  loadAfter: number;
  legDistanceKm: number;
}

export interface RoutePlanResult {
  strategyVersion: 'paired-insertion-v1';
  totalDistanceKm: number;
  sequentialDistanceKm: number;
  estimatedDistanceSavingsPct: number;
  stops: PlannedStop[];
  rejectedOrderIds: string[];
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp?: string;
}

export interface RequestTrace {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  correlationId: string | null;
  timestamp: string;
}

export interface DemoStep {
  label: string;
  state: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
}
