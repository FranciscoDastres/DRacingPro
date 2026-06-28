import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../auth/auth-context';

export function AccountPage() {
  const { deleteAccount, user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>(
    'idle',
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    try {
      await updateProfile({ displayName: displayName.trim(), phone });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const confirmDelete = async () => {
    setDeleteState('deleting');
    try {
      await deleteAccount();
      setDeleteOpen(false);
      navigate('/', { replace: true });
    } catch {
      setDeleteState('error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Tu perfil"
        subtitle="Actualiza tus datos de contacto. Usamos esta información para confirmar tus citas."
        title="Mi cuenta"
      />

      <Card className="p-6">
        <form className="space-y-5" onSubmit={submit}>
          <Field htmlFor="displayName" label="Nombre">
            <Input
              autoComplete="name"
              id="displayName"
              maxLength={120}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setStatus('idle');
              }}
              required
              value={displayName}
            />
          </Field>

          <Field
            hint="Te contactamos por aquí si hay novedades de tu moto."
            htmlFor="phone"
            label="Teléfono"
          >
            <Input
              autoComplete="tel"
              id="phone"
              maxLength={32}
              onChange={(event) => {
                setPhone(event.target.value);
                setStatus('idle');
              }}
              placeholder="+56 9 1234 5678"
              type="tel"
              value={phone}
            />
          </Field>

          <Field label="Correo">
            <div className="bg-background text-muted flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm">
              <Icon className="size-4" name="mail" />
              {user?.email}
            </div>
            <p className="text-muted mt-1 text-xs">
              Tu correo y contraseña se gestionan con tu cuenta de Google.
            </p>
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button
              icon="check"
              loading={status === 'saving'}
              type="submit"
            >
              Guardar cambios
            </Button>
            {status === 'saved' && (
              <span className="text-success text-sm font-semibold">
                Guardado ✓
              </span>
            )}
            {status === 'error' && (
              <span className="text-sm font-semibold text-[#ff8088]">
                No se pudo guardar.
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card className="mt-6 border-[#ff5a66]/25 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#ff8088]">
              Eliminar mi cuenta
            </h2>
            <p className="text-muted mt-1 max-w-md text-sm">
              Se anonimizan tus datos personales y se cierran todas tus
              sesiones. Tus boletas se conservan por obligación tributaria. Esta
              acción no se puede deshacer.
            </p>
          </div>
          <Button
            icon="trash"
            onClick={() => {
              setDeleteState('idle');
              setDeleteOpen(true);
            }}
            variant="danger"
          >
            Eliminar mi cuenta
          </Button>
        </div>
      </Card>

      <Modal
        eyebrow="Acción irreversible"
        footer={
          <>
            <Button onClick={() => setDeleteOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              loading={deleteState === 'deleting'}
              onClick={() => void confirmDelete()}
              variant="danger"
            >
              Eliminar definitivamente
            </Button>
          </>
        }
        onClose={() => setDeleteOpen(false)}
        open={deleteOpen}
        title="¿Eliminar tu cuenta?"
      >
        <p className="text-muted text-sm leading-relaxed">
          Anonimizaremos tu nombre, correo, teléfono y los datos de tus motos, y
          cerraremos todas tus sesiones. No podrás volver a entrar con esta
          cuenta. Tus boletas se conservan sin tus datos personales, según lo
          exige la normativa tributaria.
        </p>
        {deleteState === 'error' && (
          <p className="mt-3 text-sm font-semibold text-[#ff8088]">
            No se pudo eliminar la cuenta. Inténtalo nuevamente.
          </p>
        )}
      </Modal>
    </div>
  );
}
