import type { Service } from '@dracing/contracts';

export interface ServiceRepository {
  listActive(): Promise<Service[]>;
}
