import {
  computeChargeAmount,
  computeTaxBreakdown,
} from '../src/modules/payments/application/payment-math.js';

describe('computeChargeAmount', () => {
  it('charges the full total in "total" mode', () => {
    expect(
      computeChargeAmount(50_000, {
        mode: 'total',
        depositFixed: 10_000,
        depositPercent: 30,
        holdMinutes: 30,
      }),
    ).toBe(50_000);
  });

  it('charges a fixed deposit, never exceeding the total', () => {
    expect(
      computeChargeAmount(50_000, {
        mode: 'deposit_fixed',
        depositFixed: 10_000,
        depositPercent: 30,
        holdMinutes: 30,
      }),
    ).toBe(10_000);
    expect(
      computeChargeAmount(8_000, {
        mode: 'deposit_fixed',
        depositFixed: 10_000,
        depositPercent: 30,
        holdMinutes: 30,
      }),
    ).toBe(8_000);
  });

  it('charges a rounded percentage in "deposit_pct" mode', () => {
    expect(
      computeChargeAmount(50_000, {
        mode: 'deposit_pct',
        depositFixed: 10_000,
        depositPercent: 30,
        holdMinutes: 30,
      }),
    ).toBe(15_000);
  });
});

describe('computeTaxBreakdown', () => {
  it('splits a gross CLP amount into net + 19% IVA', () => {
    expect(computeTaxBreakdown(11_900)).toEqual({ net: 10_000, iva: 1_900 });
  });

  it('keeps net + iva equal to the gross amount', () => {
    const { net, iva } = computeTaxBreakdown(50_000);
    expect(net + iva).toBe(50_000);
  });
});
