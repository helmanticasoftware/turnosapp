# Supabase para TurnosApp

## Backend recomendado

Para TurnosApp recomiendo Supabase por tres motivos:

1. Los datos son claramente relacionales.
2. Necesitas permisos finos por usuario, empresa y enlace compartido.
3. La parte empresa y cambios de turno encaja mejor con SQL + RLS que con documentos sueltos.

## Variables que necesita la app

En tu `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Proyecto TurnosApp detectado

En esta sesión ya veo tu proyecto:

- nombre: `turnosapp`
- ref: `zrazcofpsypbpcxzznio`

## Estado del esquema

La base principal de TurnosApp ya quedó creada en Supabase durante esta sesión.

Archivo fuente del esquema:

- [supabase/migrations/20260511_initial_turnosapp.sql](/C:/Users/rubbe/Desktop/apps/turnosapp/supabase/migrations/20260511_initial_turnosapp.sql:1)

Incluye:

- tablas
- índices
- triggers
- creación automática de perfil
- políticas RLS
- endurecimiento básico de seguridad

## Tablas recomendadas

- `profiles`
- `user_settings`
- `calendars`
- `custom_shifts`
- `companies`
- `company_members`
- `work_groups`
- `work_group_members`
- `swap_requests`
- `share_links`
- `subscriptions`
- `devices`

## Configuración de Auth para Google

En Supabase:

1. ve a `Authentication > Providers > Google`
2. actívalo
3. en Google Cloud crea un cliente OAuth
4. añade como redirect URI de Google:
   - `https://zrazcofpsypbpcxzznio.supabase.co/auth/v1/callback`

En Supabase después ve a:

`Authentication > URL Configuration`

y añade como Redirect URL permitida:

- `turnosapp://auth/callback`

Si luego quieres probar también en web, añade además tu URL web de desarrollo o producción.

## Reglas de acceso que hay que aplicar

- un usuario solo puede leer y editar sus propios calendarios
- un propietario de empresa puede gestionar su empresa y sus miembros
- un empleado puede leer su empresa y crear solicitudes de cambio
- un enlace compartido solo da lectura al calendario asociado
- las suscripciones nunca deben confiar solo en el estado local del cliente

## Auth recomendada

- Google login con Supabase Auth
- sesión persistida en el dispositivo
- `user.id` como clave principal para sincronización y RevenueCat login

## Notas importantes

- usa siempre la **publishable key** de Supabase en la app
- no metas `service_role` ni secretos en el cliente
- para tareas administrativas o cron, usa Edge Functions o un backend privado

## Estado en esta sesión

Ya existe un proyecto Supabase específico de TurnosApp y el esquema base ya está aplicado.

Lo que queda pendiente en dashboard es:

1. copiar URL y publishable key a `.env`
2. activar Google provider y Redirect URLs
3. crear un usuario de prueba y validar que aparezcan `profiles` y `user_settings`
