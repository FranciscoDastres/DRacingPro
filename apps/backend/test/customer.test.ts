import type {
  CustomerDashboard,
  Invoice,
  ServiceHistoryRecord,
} from '@dracing/contracts';

import { buildApp } from '../src/app.js';
import { SessionService } from '../src/modules/auth/application/session-service.js';
import {
  MemoryAuthRepository,
  testUser,
} from './helpers/memory-auth-repository.js';

const invoice: Invoice = {
  amount: 24990,
  appointmentId: '78c865ca-8224-4e9e-a2e2-a9eddf4fb844',
  currency: 'CLP',
  documentNumber: 'DRP-2026-78C865CA',
  id: '66057ff1-b8bd-4c46-86c6-8db091081aca',
  issuedAt: '2026-06-23T12:00:00.000Z',
  paidAt: null,
  paymentStatus: 'pending',
  services: ['Mantención básica'],
};
const dashboard: CustomerDashboard = {
  activeAppointment: null,
  latestProgress: null,
  nextAppointment: null,
  nextMaintenance: null,
  unpaidInvoices: 1,
};
const history: ServiceHistoryRecord[] = [];

describe('customer experience routes', () => {
  it('returns dashboard, history, invoices and an authenticated PDF', async () => {
    const app = await createCustomerApp(false);
    for (const [url, expected] of [
      ['/v1/customer/dashboard', dashboard],
      ['/v1/customer/history', history],
      ['/v1/invoices', [invoice]],
    ] as const) {
      const response = await app.inject({
        headers: { cookie: 'drp_session=test-session' },
        method: 'GET',
        url,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(expected);
    }

    const pdf = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: `/v1/invoices/${invoice.id}/pdf`,
    });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('comprobante.pdf');
    await app.close();
  });

  it('allows only an administrator with trusted origin to close work', async () => {
    const completeAppointmentWork = vi.fn(async () => ({
      invoiceId: invoice.id,
      reportId: 'b05fc748-08f8-42cb-ba2a-ac4a09c6386b',
    }));
    const app = await createCustomerApp(true, { completeAppointmentWork });
    const response = await app.inject({
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'POST',
      payload: {
        paymentStatus: 'paid',
        performed: [
          { description: 'Aceite reemplazado', title: 'Cambio de aceite' },
        ],
        technicalSummary: 'Mantención completada sin observaciones.',
      },
      url: `/v1/admin/appointments/${invoice.appointmentId}/complete-work`,
    });
    expect(response.statusCode).toBe(201);
    expect(completeAppointmentWork).toHaveBeenCalled();
    await app.close();
  });
});

async function createCustomerApp(
  admin: boolean,
  overrides: Record<string, unknown> = {},
) {
  const authRepository = new MemoryAuthRepository();
  if (admin) authRepository.user = { ...testUser, role: 'admin' };
  return buildApp({
    appOrigin: 'http://localhost:5173',
    checkDatabase: async () => undefined,
    customer: {
      appOrigin: 'http://localhost:5173',
      customer: {
        completeAppointmentWork: async () => ({
          invoiceId: invoice.id,
          reportId: invoice.id,
        }),
        getDashboard: async () => dashboard,
        listHistory: async () => history,
        listInvoices: async () => [invoice],
        renderInvoicePdf: async () => ({
          buffer: Buffer.from('%PDF-test'),
          filename: 'comprobante.pdf',
        }),
        ...overrides,
      },
      sessions: new SessionService(authRepository),
    },
    logger: false,
  });
}
