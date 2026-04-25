# TurnosApp: salida a Google Play

## Estado actual

El código actual es un prototipo avanzado de interfaz y lógica local.

Antes de publicar en Google Play hay cuatro piezas que todavía no están listas para producción:

1. Autenticación real y sincronización de datos.
2. Suscripciones reales con Google Play Billing y RevenueCat.
3. Publicidad real con AdMob y consentimiento GDPR.
4. Backend para empresa, compartición y validación de códigos.

## Arquitectura recomendada

1. Migrar este prototipo a Expo/React Native si todavía no está dentro de un proyecto móvil real.
2. Usar Firebase o Supabase para:
   - autenticación con Google
   - base de datos de calendarios
   - empresas, empleados y cambios de turno
   - sincronización entre dispositivos
3. Usar RevenueCat para `premium` y `business`.
4. Usar `react-native-google-mobile-ads` para banners e interstitials.

## Checklist técnico

### 1. Base móvil

- Crear proyecto Expo con EAS.
- Mover `TurnosApp.jsx` a una estructura real: `app/`, `components/`, `features/`, `services/`.
- Añadir `app.json`, `package.json`, icono, splash y permisos.

### 2. Cuentas y datos

- Añadir login Google real.
- Guardar calendarios en nube por `userId`.
- Sincronizar `cfg`, `customShifts`, `company`, `plan` y preferencias.
- Añadir borrado de cuenta y exportación de datos.

### 3. Monetización

- Crear productos en Google Play Console:
  - `turnosapp_premium_monthly`
  - `turnosapp_premium_annual`
  - `turnosapp_business_monthly`
- Crear entitlements equivalentes en RevenueCat.
- Sustituir el paywall demo por compra/restauración real.
- Validar plan en backend y no solo en cliente.

### 4. AdMob

- Crear App ID y Ad Unit IDs.
- Integrar UMP para consentimiento GDPR.
- Mostrar anuncios solo en `free`.
- Desactivar anuncios para usuarios con entitlement activo.

### 5. Empresa y compartir

- Guardar empresa en backend.
- Generar códigos de invitación en servidor.
- Validar unión por código en servidor.
- Registrar auditoría de cambios de turno.
- Crear enlaces o tokens de solo lectura para compartir calendario.

### 6. Calidad y políticas

- Política de privacidad publicada.
- Pantalla de eliminar cuenta.
- Pantalla de restaurar compras.
- Textos honestos: no prometer sync o pagos si aún son demo.
- Pruebas en Android real y testers internos de Play Console.

## Publicación en Google Play

1. Crear la ficha en Play Console.
2. Subir `AAB` firmado con EAS Build.
3. Configurar testers internos.
4. Probar login, compras, restauración, anuncios, backup y notificaciones.
5. Completar privacidad, clasificación por edades y seguridad de datos.
6. Lanzar primero en track interno, luego cerrado, luego producción.

## Roadmap sugerido

### MVP publicable

- Calendario local
- backup/import completo
- premium con RevenueCat
- anuncios AdMob
- política de privacidad

### V1 comercial

- login Google
- sync nube
- compartir calendario por enlace
- widgets y notificaciones reales

### V2 empresa

- equipos
- cambios de turno con aprobación
- cuadrante compartido
- roles y permisos
- panel de métricas por empleado
