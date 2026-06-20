import type {
  AdminAppointment,
  AdminAppointmentFilters,
  Appointment,
  AvailabilitySlot,
  CancelAppointmentInput,
  CustomerMotorcycleUpdate,
} from '@dracing/contracts';

import { buildApp } from '../src/app.js';
import { SessionService } from '../src/modules/auth/application/session-service.js';
import {
  MemoryAuthRepository,
  testUser,
} from './helpers/memory-auth-repository.js';

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
const cancelledAppointment: Appointment = {
  ...appointment,
  status: 'cancelled',
};
const adminAppointment: AdminAppointment = {
  ...appointment,
  customer: {
    displayName: testUser.displayName,
    email: testUser.email,
    id: testUser.id,
  },
};
const motorcycleUpdate: CustomerMotorcycleUpdate = {
  appointmentId: appointment.id,
  createdAt: '2027-01-15T13:15:00.000Z',
  id: 'b05fc748-08f8-42cb-ba2a-ac4a09c6386b',
  message: 'Diagnóstico iniciado',
  motorcycleLabel: appointment.motorcycle.label,
  progressStatus: 'diagnosing',
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

  it('cancels an eligible appointment for its authenticated owner', async () => {
    const cancel = vi.fn(async () => cancelledAppointment);
    const app = await createApp(false, cancel);

    const rejected = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'PATCH',
      payload: { reason: 'Cambio de planes' },
      url: `/v1/appointments/${appointment.id}/cancel`,
    });
    expect(rejected.statusCode).toBe(403);

    const accepted = await app.inject({
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'PATCH',
      payload: { reason: 'Cambio de planes' },
      url: `/v1/appointments/${appointment.id}/cancel`,
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual(cancelledAppointment);
    expect(cancel).toHaveBeenCalledWith(testUser.id, appointment.id, {
      reason: 'Cambio de planes',
    });
    await app.close();
  });

  it('allows only administrators to read the workshop agenda', async () => {
    const customerApp = await createApp();
    const forbidden = await customerApp.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/admin/appointments',
    });
    expect(forbidden.statusCode).toBe(403);
    await customerApp.close();

    const adminApp = await createApp(true);
    const accepted = await adminApp.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/admin/appointments',
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual([adminAppointment]);
    await adminApp.close();
  });

  it('passes validated date and status filters to the admin agenda', async () => {
    const listAdmin = vi.fn(async () => [adminAppointment]);
    const app = await createApp(true, undefined, listAdmin);
    const response = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/admin/appointments?from=2027-01-12&to=2027-01-19&statuses=requested,confirmed',
    });

    expect(response.statusCode).toBe(200);
    expect(listAdmin).toHaveBeenCalledWith({
      from: '2027-01-12',
      statuses: ['requested', 'confirmed'],
      to: '2027-01-19',
    });
    await app.close();
  });

  it('returns customer-visible motorcycle updates', async () => {
    const app = await createApp();
    const response = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/notifications',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([motorcycleUpdate]);
    await app.close();
  });
});

async function createApp(
  admin = false,
  cancel: (
    customerUserId: string,
    appointmentId: string,
    input: CancelAppointmentInput,
  ) => Promise<Appointment> = async () => cancelledAppointment,
  listAdmin: (
    filters?: AdminAppointmentFilters,
  ) => Promise<AdminAppointment[]> = async () => [adminAppointment],
) {
  const authRepository = new MemoryAuthRepository();
  if (admin) authRepository.user = { ...testUser, role: 'admin' };
  const sessions = new SessionService(authRepository);
  return buildApp({
    appOrigin: 'http://localhost:5173',
    appointments: {
      appOrigin: 'http://localhost:5173',
      appointments: {
        addMotorcycleUpdate: async () => ({ id: 'update-id' }),
        cancel,
        create: async () => appointment,
        getAvailability: async () => [slot],
        getTimeline: async () => ({
          appointment,
          updates: [motorcycleUpdate],
        }),
        list: async () => [],
        listAdmin,
        listCustomerUpdates: async () => [motorcycleUpdate],
        updateStatus: async () => appointment,
      },
      sessions,
    },
    checkDatabase: async () => undefined,
    logger: false,
  });
}
