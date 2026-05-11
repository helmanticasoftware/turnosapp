# RevenueCat Android para TurnosApp

## Lo primero: qué clave usar

La app **no** debe usar una clave `sk_...`.

- `sk_...` = secret API key, solo servidor
- `goog_...` = public SDK key de Android, esta sí va en la app

En tu `.env` debe ir esta:

```env
EXPO_PUBLIC_RC_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxx
```

## Productos recomendados

En Google Play Console:

- `turnosapp_premium_monthly`
- `turnosapp_premium_annual`
- `turnosapp_business_monthly`

## Entitlements recomendados en RevenueCat

- `Turnosapp Pro`
- `Turnosapp Business`

## Offering recomendada

Offering actual:

- `monthly` -> `turnosapp_premium_monthly`
- `annual` -> `turnosapp_premium_annual`
- `business` -> `turnosapp_business_monthly`

## Orden correcto de configuración

1. Crear la app en Google Play Console
2. Crear las suscripciones en Google Play Console
3. Crear proyecto en RevenueCat
4. Añadir la app Android con package `com.helmanticasoftware.turnosapp`
5. Copiar la **public SDK key** de Android
6. Crear entitlements
7. Crear products y offerings
8. Conectar Google Play con RevenueCat mediante Service Account
9. Poner `EXPO_PUBLIC_RC_ANDROID_KEY` en `.env`
10. Hacer build nueva con EAS

## Qué tiene que hacer la app

- inicializar `react-native-purchases` una sola vez
- comprobar `CustomerInfo` al arrancar
- ocultar anuncios si el usuario tiene entitlement activo
- permitir restaurar compras
- vincular compra con `user.id` cuando el usuario inicie sesión

## Estado actual del repo

- el plugin de `react-native-purchases` ya está preparado en `app.json`
- el prototipo todavía muestra el paywall como demo
- falta conectar la compra real con la public SDK key y las offerings finales
