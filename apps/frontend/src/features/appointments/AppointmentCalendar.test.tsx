import { fireEvent, render, screen } from '@testing-library/react';

import { AppointmentCalendar } from './AppointmentCalendar';

describe('AppointmentCalendar', () => {
  it('selects business days and keeps Sundays unavailable', () => {
    const onChange = vi.fn();
    render(
      <AppointmentCalendar
        minDate="2026-06-21"
        onChange={onChange}
        value="2026-06-22"
      />,
    );

    expect(
      screen.getByRole('button', { name: /lunes, 22 de junio de 2026/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /domingo, 28 de junio de 2026/i }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', { name: /martes, 23 de junio de 2026/i }),
    );

    expect(onChange).toHaveBeenCalledWith('2026-06-23');
  });

  it('navigates to the following month', () => {
    render(
      <AppointmentCalendar
        minDate="2026-06-21"
        onChange={() => undefined}
        value="2026-06-22"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(screen.getByText('julio de 2026')).toBeInTheDocument();
  });
});
