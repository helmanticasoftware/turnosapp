# TurnosApp

Base Expo para convertir el prototipo actual en una app Android real y publicable.

## Stack recomendado ahora mismo

- Expo Router
- Supabase para auth, sync y backend de empresa
- RevenueCat para suscripciones
- AdMob para monetización del plan básico

## Decisión de backend

Para esta app encaja mejor **Supabase** que Firebase porque tu modelo es relacional:

- usuarios
- calendarios
- empresas
- miembros
- grupos de trabajo
- solicitudes de cambio
- enlaces compartidos

Eso pide SQL, RLS y consultas limpias entre entidades. Además, ya tengo acceso a Supabase en esta sesión, así que el camino práctico también es mejor.

## Arranque previsto

1. Copia `.env.example` a `.env`.
2. Rellena Supabase, RevenueCat y AdMob.
3. Instala dependencias.
4. Ejecuta `npm run start`.
5. Para Android usa `eas build -p android --profile production`.

## AdMob integrado

- Android App ID: `ca-app-pub-3485168250647378~1198686158`
- Android Banner ID: `ca-app-pub-3485168250647378/6442959343`
- iOS queda aparcado por ahora.

## RevenueCat

- **No** pongas claves `sk_...` en la app.
- La app solo debe usar la **public SDK key** de Android en `EXPO_PUBLIC_RC_ANDROID_KEY`.
- La key `sk_...` sirve para integraciones de servidor o automatizaciones privadas.

## Estado

- El prototipo funcional vive dentro de una pantalla DOM para no perder velocidad.
- La siguiente fase es migrar piezas críticas a nativo: auth, widgets, ads, billing y notificaciones.
- El foco actual es Android y Google Play.
