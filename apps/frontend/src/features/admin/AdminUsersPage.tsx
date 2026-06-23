import type { AdminUser, UpdateUserInput } from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { type Column, Table } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCLP } from '../../components/ui/money';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiClient } from '../../lib/api-client';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryFn: () => apiClient.get<AdminUser[]>('/v1/admin/users'),
    queryKey: ['admin', 'users'],
  });

  const mutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      apiClient.patch<AdminUser>(`/v1/admin/users/${id}`, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const users = usersQuery.data ?? [];

  const columns: Column<AdminUser>[] = [
    {
      cell: (user) => (
        <div className="min-w-0">
          <p className="text-foreground truncate font-semibold">
            {user.displayName}
          </p>
          <p className="text-muted truncate text-xs">{user.email}</p>
        </div>
      ),
      header: 'Cliente',
    },
    {
      cell: (user) => <span className="text-muted">{user.phone ?? '—'}</span>,
      header: 'Teléfono',
    },
    {
      align: 'right',
      cell: (user) => user.appointmentCount,
      header: 'Citas',
    },
    {
      align: 'right',
      cell: (user) => (
        <span className="font-semibold tabular-nums">
          {formatCLP(user.totalSpent)}
        </span>
      ),
      header: 'Total gastado',
    },
    {
      cell: (user) => (
        <Badge tone={user.role === 'admin' ? 'primary' : 'neutral'}>
          {user.role === 'admin' ? 'Administrador' : 'Cliente'}
        </Badge>
      ),
      header: 'Rol',
    },
    {
      cell: (user) => (
        <Badge tone={user.isActive ? 'success' : 'danger'}>
          {user.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      header: 'Estado',
    },
    {
      align: 'right',
      cell: (user) =>
        user.isPrimaryAdmin ? (
          <span className="text-muted text-xs">Admin principal</span>
        ) : (
          <div className="flex justify-end">
            <Button
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  id: user.id,
                  input: { isActive: !user.isActive },
                })
              }
              size="sm"
              variant={user.isActive ? 'danger' : 'secondary'}
            >
              {user.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        ),
      header: '',
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        subtitle="Clientes registrados, su actividad y permisos."
        title="Usuarios"
      />

      {usersQuery.isLoading ? (
        <p className="text-muted text-sm">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <EmptyState
          icon="users"
          title="Aún no hay usuarios"
          description="Cuando un cliente inicie sesión aparecerá aquí."
        />
      ) : (
        <Table
          columns={columns}
          empty="Sin usuarios."
          rowKey={(user) => user.id}
          rows={users}
        />
      )}
    </div>
  );
}
