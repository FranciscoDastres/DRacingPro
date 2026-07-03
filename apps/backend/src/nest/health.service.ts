import type { HealthResponse } from '@dracing/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';

export const HEALTH_CHECK_DATABASE = Symbol('HEALTH_CHECK_DATABASE');

export type CheckDatabase = () => Promise<void>;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(HEALTH_CHECK_DATABASE)
    private readonly checkDatabase: CheckDatabase,
  ) {}

  live(): HealthResponse {
    return {
      service: 'dracing-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async ready(): Promise<HealthResponse> {
    try {
      await this.checkDatabase();

      return {
        service: 'dracing-api',
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' },
      };
    } catch (error) {
      this.logger.error('Database readiness check failed', error);

      return {
        service: 'dracing-api',
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks: { database: 'degraded' },
      };
    }
  }
}
