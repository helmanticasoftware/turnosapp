# Guía Android y Google Play para TurnosApp

Esta guía está escrita como si partieras de cero.

## 1. Qué necesitas antes de empezar

- una cuenta de Google normal
- una cuenta de desarrollador de Google Play
- una cuenta de Expo
- una cuenta de RevenueCat
- un proyecto Supabase para TurnosApp

## 2. Prepara el proyecto local

En la carpeta del proyecto:

1. copia `.env.example` a `.env`
2. rellena:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_RC_ANDROID_KEY`
   - los IDs de AdMob
3. instala dependencias
4. arranca la app en local

Comandos:

```bash
npm install
npm run start
```

## 3. Crea la app en Google Play Console

1. entra en Google Play Console
2. pulsa `Crear aplicación`
3. nombre: `TurnosApp`
4. idioma predeterminado: `es-ES`
5. tipo: `Aplicación`
6. gratuita o de pago:
   - si vas a vender suscripciones, puede seguir siendo gratuita

## 4. Configura las suscripciones

En Google Play Console:

1. ve a `Monetizar > Suscripciones`
2. crea:
   - `turnosapp_premium_monthly`
   - `turnosapp_premium_annual`
   - `turnosapp_business_monthly`
3. define precios:
   - `1,99 €/mes`
   - `14,99 €/año`
   - `9,99 €/mes`

## 5. Configura RevenueCat

Sigue [REVENUECAT_ANDROID_SETUP.md](/C:/Users/rubbe/Desktop/apps/turnosapp/REVENUECAT_ANDROID_SETUP.md:1).

Lo más importante:

- no uses claves `sk_...` en la app
- usa la public SDK key de Android `goog_...`

## 6. Configura Supabase

Sigue [SUPABASE_SETUP.md](/C:/Users/rubbe/Desktop/apps/turnosapp/SUPABASE_SETUP.md:1).

Necesitas al menos:

- auth con Google
- tablas de calendarios
- tablas de empresa y miembros
- solicitudes de cambio
- enlaces compartidos
- RLS activa

## 7. Configura AdMob

Ya tienes puestos estos IDs Android:

- App ID: `ca-app-pub-3485168250647378~1198686158`
- Banner ID: `ca-app-pub-3485168250647378/6442959343`

Falta:

1. activar consentimiento UMP/GDPR
2. decidir dónde mostrar banner
3. ocultar anuncios para `premium` y `business`

## 8. Configura Expo y EAS

Instala EAS CLI:

```bash
npm install -g eas-cli
eas login
```

Inicializa EAS si hace falta:

```bash
eas init
```

## 9. Haz la build Android

```bash
eas build --platform android --profile production
```

Eso te generará un `.aab`, que es el formato correcto para Google Play.

## 10. Primera subida a Google Play

La primera vez hazla manualmente:

1. abre tu app en Google Play Console
2. ve a `Versiones > Producción` o mejor `Prueba interna`
3. crea una release
4. sube el `.aab`
5. guarda

## 11. Rellena la ficha de tienda

Necesitarás:

- nombre corto y largo
- descripción corta
- descripción completa
- icono 512x512
- capturas de pantalla
- política de privacidad
- correo de soporte

## 12. Completa formularios obligatorios

En Play Console tendrás que rellenar:

- seguridad de datos
- clasificación por edades
- permisos
- anuncios
- contenido de pago y suscripciones

## 13. Prueba interna antes de publicar

No lances directo a producción.

Haz antes:

1. `Prueba interna`
2. probar login
3. probar sincronización
4. probar compras
5. probar restauración
6. probar anuncios
7. probar export/import de backup
8. probar empresa y cambios de turno

## 14. Cuándo pasar a producción

Solo cuando estas piezas sean reales:

- auth real
- sync real
- RevenueCat real
- AdMob real
- enlaces compartidos reales
- textos honestos, sin vender funciones demo

## 15. Orden que te recomiendo seguir

1. Supabase
2. RevenueCat
3. AdMob
4. build Android
5. prueba interna Play Store
6. producción
