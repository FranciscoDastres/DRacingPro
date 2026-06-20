export type ServiceStatus = 'ok' | 'degraded';

export interface HealthResponse {
  service: 'dracing-api';
  status: ServiceStatus;
  timestamp: string;
  checks?: {
    database: ServiceStatus;
  };
}
