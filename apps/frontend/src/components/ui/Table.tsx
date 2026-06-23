import { type ReactNode } from 'react';

export interface Column<Row> {
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {columns.map((column, index) => (
              <th
                className={`text-muted px-4 py-3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase ${alignClass(
                  column.align,
                )} ${column.className ?? ''}`}
                key={index}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="text-muted px-4 py-10 text-center"
                colSpan={columns.length}
              >
                {empty ?? 'Sin registros.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                key={rowKey(row)}
              >
                {columns.map((column, index) => (
                  <td
                    className={`px-4 py-3 ${alignClass(column.align)} ${
                      column.className ?? ''
                    }`}
                    key={index}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function alignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}
