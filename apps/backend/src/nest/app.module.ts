import { type DynamicModule, Module } from '@nestjs/common';

import { ApiController } from './api.controller.js';
import { HealthController } from './health.controller.js';
import {
  HEALTH_CHECK_DATABASE,
  HealthService,
  type CheckDatabase,
} from './health.service.js';

export interface AppModuleOptions {
  checkDatabase: CheckDatabase;
}

@Module({})
export class AppModule {
  static register(options: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      controllers: [ApiController, HealthController],
      providers: [
        HealthService,
        {
          provide: HEALTH_CHECK_DATABASE,
          useValue: options.checkDatabase,
        },
      ],
    };
  }
}
