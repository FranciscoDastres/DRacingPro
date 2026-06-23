# Seguridad y Google OAuth 2.0

## Flujo recomendado

Se usa OpenID Connect sobre OAuth 2.0 con Authorization Code + PKCE. El backend
actúa como BFF y mantiene una sesión mediante cookie; el frontend nunca guarda
tokens de Google ni JWT en `localStorage`.

1. El frontend navega a `GET /v1/auth/google?returnTo=/agenda`.
2. La API valida `returnTo`, genera `state`, `nonce`, `code_verifier` y
   `code_challenge`. Guarda el material temporal cifrado/firmado con expiración.
3. La API redirige al endpoint de autorización de Google con scopes mínimos:
   `openid email profile`.
4. Google retorna el `code` al callback HTTPS registrado de la API.
5. La API exige coincidencia de `state`, canjea el código con el
   `code_verifier` y valida firma, `iss`, `aud`, `exp` y `nonce` del ID token.
6. Se exige `email_verified=true`. El usuario se vincula por `(provider, sub)`,
   no por correo como identidad primaria.
7. La API crea o rota una sesión aleatoria, persiste solo su SHA-256 y envía una
   cookie `HttpOnly; Secure; SameSite=Lax; Path=/`.
8. El frontend consulta `GET /v1/auth/me`. El rol se toma de PostgreSQL; Google jamás
   concede rol administrador.
9. Logout revoca la sesión en la base y elimina la cookie.

Si frontend y API están en sitios distintos, se requiere `SameSite=None; Secure`,
CORS con allowlist exacta y protección CSRF explícita. Es preferible servirlos en
el mismo sitio (`app.dominio` y proxy `/api`) para reducir esa superficie.

## Controles obligatorios

- Validación de variables de entorno al arrancar y secretos fuera de la imagen.
- Rate limit estricto en auth y escritura de citas.
- Comprobación de `Origin` y token CSRF en mutaciones autenticadas.
- Cookies rotadas después de login/cambio de privilegios y revocables por sesión.
- Headers CSP, HSTS, `X-Content-Type-Options` y política de referrer.
- Consultas parametrizadas por ORM, validación Zod y límites de tamaño.
- Auditoría de cambios administrativos sin almacenar tokens ni PII innecesaria.
- Respuestas de error sin stack ni detalles internos; logs estructurados con
  redacción de cookies, tokens, correo e IP según la política de retención.
- El primer admin se aprovisiona mediante comando/migración controlada, nunca por
  dominio de correo implícito.
- PostgreSQL limita el rol `admin` a una sola fila. Su contraseña se almacena con
  scrypt y el login tiene límite estricto de intentos.

No se guardan access/refresh tokens de Google porque el login no los necesita.
Solo se persistirían cifrados si después se integra Google Calendar y el usuario
otorga ese consentimiento adicional.
