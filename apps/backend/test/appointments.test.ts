import type { Appointment, AvailabilitySlot } from '@dracing/contracts';

import { buildApp } from '../src/app.js';
import { SessionService } from '../src/modules/auth/application/session-service.js';
import { MemoryAuthRepository } from './helpers/memory-auth-repository.js';

const serviceId = '984a5c7b-2163-47d7-964d-e882388e1a2c';
const motorcycleId = '0ed4fc0c-ea93-4dc7-9af0-cba493e67491';
const slot: AvailabilitySlot = {
  endsAt: '2027-01-15T14:00:00.000Z',
  startsAt: '2027-01-15T13:00:00.000Z',
};
const appointment: Appointment = {
  ...slot,
  id: '78c865ca-8224-4e9e-a2e2-a9eddf4fb844',
  motorcycle: { id: motorcycleId, label: 'La Roja' },
  services: [{ id: serviceId, name: 'Mantención básica' }],
  status: 'requested',
};

describe('appointment routes', () => {
  it('returns availability for a valid service and date', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'GET',
      url: `/v1/availability?date=2027-01-15&serviceIds=${serviceId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([slot]);
    await app.close();
  });

  it('creates an appointment for the authenticated owner', async () => {
    const app = await createApp();
    const response = await app.inject({
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'POST',
      payload: {
        motorcycleId,
        serviceIds: [serviceId],
        startsAt: slot.startsAt,
      },
      url: '/v1/appointments',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(appointment);
    await app.close();
  });
});

async function createApp() {
  const sessions = new SessionService(new MemoryAuthRepository());
  return buildApp({
    appOrigin: 'http://localhost:5173',
    appointments: {
      appOrigin: 'http://localhost:5173',
      appointments: {
        create: async () => appointment,
        getAvailability: async () => [slot],
        list: async () => [],
      },
      sessions,
    },
    checkDatabase: async () => undefined,
    logger: false,
  });
}
