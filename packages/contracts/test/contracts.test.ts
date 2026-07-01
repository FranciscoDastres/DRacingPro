import { describe, expect, it } from 'vitest';

import {
  AdminAppointmentFiltersSchema,
  AdminLoginSchema,
  AvailabilityRequestSchema,
  CancelAppointmentSchema,
  ChileanPhoneSchema,
  CompleteAppointmentWorkSchema,
  CreateAppointmentSchema,
  CreateScheduleExceptionSchema,
  isWithinBookingHorizon,
  SaveBusinessHourSchema,
  UpdateMotorcycleSchema,
  UpdateProfileSchema,
} from '../src/index.js';

const uuid = '78c865ca-8224-4e9e-a2e2-a9eddf4fb844';
const nextYear = new Date().getFullYear() + 1;

describe('ChileanPhoneSchema', () => {
  it('accepts E.164 chilean mobiles and strips formatting characters', () => {
    expect(ChileanPhoneSchema.parse('+56912345678')).toBe('+56912345678');
    expect(ChileanPhoneSchema.parse('+56 9 1234 5678')).toBe('+56912345678');
    expect(ChileanPhoneSchema.parse(' +56-9-(1234)-5678 ')).toBe(
      '+56912345678',
    );
  });

  it('rejects landlines, foreign numbers and wrong lengths', () => {
    for (const value of [
      '+56212345678', // landline
      '+5691234567', // too short
      '+569123456789', // too long
      '+54912345678', // wrong country
      '912345678', // missing prefix
      '',
    ]) {
      expect(ChileanPhoneSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('booking horizon', () => {
  it('allows the current and following calendar year only', () => {
    expect(isWithinBookingHorizon(new Date().getFullYear())).toBe(true);
    expect(isWithinBookingHorizon(nextYear)).toBe(true);
    expect(isWithinBookingHorizon(nextYear + 1)).toBe(false);
    expect(isWithinBookingHorizon(9999)).toBe(false);
  });

  it('AvailabilityRequestSchema rejects far-future dates', () => {
    const valid = AvailabilityRequestSchema.safeParse({
      date: `${nextYear}-03-10`,
      serviceIds: [uuid],
    });
    expect(valid.success).toBe(true);

    const farFuture = AvailabilityRequestSchema.safeParse({
      date: '9999-01-01',
      serviceIds: [uuid],
    });
    expect(farFuture.success).toBe(false);
  });

  it('AvailabilityRequestSchema bounds serviceIds to 1..10', () => {
    expect(
      AvailabilityRequestSchema.safeParse({
        date: `${nextYear}-03-10`,
        serviceIds: [],
      }).success,
    ).toBe(false);
    expect(
      AvailabilityRequestSchema.safeParse({
        date: `${nextYear}-03-10`,
        serviceIds: Array.from({ length: 11 }, () => uuid),
      }).success,
    ).toBe(false);
  });
});

describe('CreateAppointmentSchema', () => {
  const base = {
    motorcycleId: uuid,
    serviceIds: [uuid],
    startsAt: `${nextYear}-03-10T13:00:00.000Z`,
    whatsappPhone: '+56 9 1234 5678',
  };

  it('accepts a valid booking and normalizes the phone', () => {
    const result = CreateAppointmentSchema.parse(base);
    expect(result.whatsappPhone).toBe('+56912345678');
  });

  it('rejects a startsAt outside the booking horizon', () => {
    expect(
      CreateAppointmentSchema.safeParse({
        ...base,
        startsAt: '9999-01-01T13:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid phone', () => {
    expect(
      CreateAppointmentSchema.safeParse({ ...base, whatsappPhone: '12345' })
        .success,
    ).toBe(false);
  });
});

describe('CancelAppointmentSchema', () => {
  it('allows omitting the reason but enforces 3..500 chars when present', () => {
    expect(CancelAppointmentSchema.safeParse({}).success).toBe(true);
    expect(
      CancelAppointmentSchema.safeParse({ reason: 'Cambio de planes' }).success,
    ).toBe(true);
    expect(CancelAppointmentSchema.safeParse({ reason: 'ab' }).success).toBe(
      false,
    );
    expect(
      CancelAppointmentSchema.safeParse({ reason: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('AdminAppointmentFiltersSchema', () => {
  it('requires from < to and a range of at most 31 days', () => {
    expect(
      AdminAppointmentFiltersSchema.safeParse({
        from: '2026-07-01',
        to: '2026-07-08',
      }).success,
    ).toBe(true);
    expect(
      AdminAppointmentFiltersSchema.safeParse({
        from: '2026-07-08',
        to: '2026-07-01',
      }).success,
    ).toBe(false);
    expect(
      AdminAppointmentFiltersSchema.safeParse({
        from: '2026-07-01',
        to: '2026-09-01',
      }).success,
    ).toBe(false);
  });
});

describe('UpdateMotorcycleSchema', () => {
  it('rejects an empty update', () => {
    expect(UpdateMotorcycleSchema.safeParse({}).success).toBe(false);
    expect(
      UpdateMotorcycleSchema.safeParse({ nickname: 'La Roja' }).success,
    ).toBe(true);
  });
});

describe('UpdateProfileSchema', () => {
  it('normalizes an empty phone to null', () => {
    expect(
      UpdateProfileSchema.parse({ displayName: 'Ana', phone: '' }).phone,
    ).toBeNull();
    expect(UpdateProfileSchema.parse({ displayName: 'Ana' }).phone).toBeNull();
    expect(
      UpdateProfileSchema.parse({ displayName: 'Ana', phone: '+56911111111' })
        .phone,
    ).toBe('+56911111111');
  });
});

describe('AdminLoginSchema', () => {
  it('lowercases the email after validating it', () => {
    const result = AdminLoginSchema.parse({
      email: 'Admin@Taller.CL',
      password: 'secret',
    });
    expect(result.email).toBe('admin@taller.cl');
  });

  it('rejects emails with surrounding whitespace (format check runs first)', () => {
    expect(
      AdminLoginSchema.safeParse({
        email: '  admin@taller.cl ',
        password: 'secret',
      }).success,
    ).toBe(false);
  });
});

describe('SaveBusinessHourSchema', () => {
  const base = {
    closesAt: '18:00',
    opensAt: '09:30',
    slotMinutes: 45,
    validFrom: '2026-01-01',
    weekday: 1,
  };

  it('accepts HH:MM 24h times', () => {
    expect(SaveBusinessHourSchema.safeParse(base).success).toBe(true);
  });

  it('rejects malformed times', () => {
    for (const opensAt of ['9:30', '24:00', '09:60', '0930']) {
      expect(
        SaveBusinessHourSchema.safeParse({ ...base, opensAt }).success,
      ).toBe(false);
    }
  });
});

describe('CreateScheduleExceptionSchema', () => {
  it('requires end after start', () => {
    expect(
      CreateScheduleExceptionSchema.safeParse({
        endsAt: '2026-07-02T18:00:00.000Z',
        kind: 'closed',
        startsAt: '2026-07-02T09:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      CreateScheduleExceptionSchema.safeParse({
        endsAt: '2026-07-02T09:00:00.000Z',
        kind: 'closed',
        startsAt: '2026-07-02T18:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('CompleteAppointmentWorkSchema', () => {
  it('applies defaults and requires at least one performed item', () => {
    const result = CompleteAppointmentWorkSchema.parse({
      performed: [{ description: 'Cambio de aceite 10W30', title: 'Aceite' }],
      technicalSummary: 'Mantención básica realizada sin observaciones.',
    });
    expect(result.paymentStatus).toBe('pending');
    expect(result.pending).toEqual([]);
    expect(result.recommendations).toEqual([]);

    expect(
      CompleteAppointmentWorkSchema.safeParse({
        performed: [],
        technicalSummary: 'Resumen válido',
      }).success,
    ).toBe(false);
  });
});
