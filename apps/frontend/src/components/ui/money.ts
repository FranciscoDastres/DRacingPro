const clpFormatter = new Intl.NumberFormat('es-CL', {
  currency: 'CLP',
  maximumFractionDigits: 0,
  style: 'currency',
});

/**
 * Formats a CLP amount as e.g. "$24.990".
 *
 * Note: across the app, service prices are stored and exposed as whole pesos
 * (the `price` / `unitPrice` fields), despite the underlying column name.
 */
export function formatCLP(amount: number): string {
  return clpFormatter.format(amount);
}
