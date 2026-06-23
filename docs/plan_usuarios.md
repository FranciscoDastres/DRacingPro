# Plan de identidad e intranets Caninany

## Resumen y orden

Empezaremos por identidad y sesiones, porque Google y ambos portales dependen de una autenticación segura.

1. Sesiones seguras, correo y Google.
2. Intranet cliente con reservas completas.
3. Intranet administrativa con agenda y clientes.
4. Notificaciones, pruebas E2E y preparación de producción.

## 1. Identidad y sesiones

- Sustituir JWT en localStorage por access tokens de 10 minutos en memoria y refresh tokens rotatorios de 30 días en
  cookie HttpOnly, Secure en producción y SameSite=Lax.

- Añadir renovación automática, cierre de sesión actual/general y revocación inmediata al suspender usuarios o
  cambiar roles.

- Incorporar User.status, emailVerifiedAt, phone, avatarUrl y passwordHash opcional para cuentas creadas
  exclusivamente con Google.

- Crear tablas para identidades externas, sesiones y tokens de verificación/recuperación. Los tokens se almacenarán
  hasheados, serán de un solo uso y tendrán vencimiento.

- Marcar como verificados los usuarios existentes durante la migración para evitar bloqueos.
- Implementar registro local con verificación de correo, reenvío, recuperación y cambio de contraseña mediante
  Resend. Verificación: 24 horas; recuperación: 30 minutos.

- Integrar el botón oficial Google Identity Services, sin One Tap inicialmente. Backend verificará firma, aud, iss y
  expiración mediante google-auth-library, usando exclusivamente sub como identificador estable, como recomienda
  Google (https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

- Si Google coincide con una cuenta local existente, devolver GOOGLE_LINK_REQUIRED y solicitar su contraseña antes
  de vincular. Google nunca asignará permisos administrativos.

- Permitir vincular/desvincular Google desde “Cuenta y seguridad”; impedir desvincular el último método de acceso.
- Aplicar rate limiting a login, registro, Google, refresh, verificación y recuperación.

Endpoints principales:

- POST /auth/register, /verify-email, /resend-verification
- POST /auth/login, /google, /google/link
- POST /auth/refresh, /logout, /logout-all
- POST /auth/forgot-password, /reset-password
- GET /auth/me, /sessions
- DELETE /auth/sessions/:id

Variables: GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID, RESEND_API_KEY, MAIL_FROM, APP_PUBLIC_URL y MAIL_MODE=log|
resend. La ausencia de Google ocultará el botón sin romper el login local.

## 2. Intranet cliente

- Separar el layout público del portal autenticado. /perfil redirigirá a un portal con navegación propia:
  - /perfil/resumen
  - /perfil/citas
  - /perfil/mascotas
  - /perfil/compras
  - /perfil/cuenta

- Resumen con próxima cita, estado, mascotas registradas y accesos rápidos.
- Conectar la reserva autenticada existente: seleccionar mascota guardada, crear una sin abandonar el flujo y
  derivar peso/propietario desde backend.

- Mostrar próximas citas, historial, detalle, servicio, mascota, duración, estado y eventos.
- Permitir cancelar y reagendar citas propias hasta 24 horas antes. El reagendamiento comprobará disponibilidad en
  transacción y devolverá la cita a pending.

- Mantener mascotas y compras actuales, agregando estados de carga, error, vacío y paginación.
- Cuenta y seguridad permitirá actualizar nombre/teléfono, contraseña, Google y sesiones activas.

API de cliente:

- GET /appointments/me?scope=upcoming|history&cursor=...
- GET /appointments/:id
- POST /appointments para reservas autenticadas
- POST /appointments/:id/cancel
- POST /appointments/:id/reschedule

## 3. Intranet administrativa

- Crear layout administrativo independiente:
  - /admin/resumen
  - /admin/agenda
  - /admin/clientes
  - /admin/usuarios
  - /admin/contenido

- Resumen con solicitudes pendientes, citas de hoy, próximas y alertas.
- Agenda diaria/semanal con filtros por fecha, estado, servicio y búsqueda.
- Detalle con cliente/invitado, mascota, contacto, notas, duración e historial.
- Estados permitidos:
  - pending → confirmed | cancelled | expired
  - confirmed → completed | cancelled | no-show
  - reagendar devuelve a pending

- Toda reserva comienza pendiente y bloquea el horario durante dos horas. Un proceso idempotente expirará pendientes
  vencidas y liberará el bloque.

- Administración podrá crear citas para clientes registrados o invitados, confirmar, cancelar, completar, marcar
  ausencia y reagendar sin límite de 24 horas, dejando motivo y evento de auditoría.

- Clientes con búsqueda/paginación, ficha, mascotas, citas y compras.
- Conservar editor de contenido y gestión de roles. No permitir degradar o suspender al último administrador.
- Revocar sesiones cuando cambien rol o estado.

Datos nuevos de agenda:

- Appointment.expiresAt, cancelledAt, cancelReason
- Estados EXPIRED y NO_SHOW
- AppointmentEvent con actor, transición, motivo, fecha y metadata
- Consultas administrativas paginadas y filtrables

## 4. Notificaciones y calidad

- Resend enviará verificación, recuperación, solicitud creada, confirmación, cancelación, reagendamiento y
  expiración.

- En desarrollo, MAIL_MODE=log mostrará enlaces sin enviar correos reales.
- Añadir pruebas backend para rotación/reutilización de refresh tokens, Google inválido, vinculación, verificación,
  recuperación, autorización, expiración, transiciones, límite de 24 horas y conflictos concurrentes.

- Añadir React Testing Library para bootstrap de sesión, formularios Google/local, estados del portal, filtros y
  acciones.

  - cliente → mascota → reserva → reagendamiento/cancelación;
  - admin → confirmar/completar/crear cita invitada;

- Validar migraciones contra PostgreSQL real, lint, typecheck, pruebas, build y presupuesto de bundle.

## Supuestos cerrados

- La primera entrega será identidad segura más intranet cliente.
- Correo/contraseña y Google coexistirán.
- Vincular una cuenta existente exigirá contraseña.
- Todas las reservas requerirán confirmación administrativa.
- Pendientes vencen a las dos horas.
- Clientes cancelan o reagendan hasta 24 horas antes.
- Administración puede agendar clientes e invitados.
- Resend será el proveedor transaccional.
- Google usará el botón oficial, sin One Tap ni permisos adicionales.
- La primera ampliación administrativa cubre agenda y clientes; precios, pagos, horarios configurables y recursos
  quedan para una fase posterior.
