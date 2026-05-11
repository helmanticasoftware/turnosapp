# Google Auth en Supabase para TurnosApp

## Qué vas a configurar

Vas a conectar el botón de Google de la app con Supabase Auth.

## 1. Activar Google en Supabase

En tu proyecto `turnosapp`:

1. abre `Authentication`
2. entra en `Providers`
3. busca `Google`
4. actívalo

## 2. Crear credenciales OAuth en Google Cloud

En Google Cloud Console:

1. crea o abre tu proyecto
2. ve a `APIs y servicios > Pantalla de consentimiento OAuth`
3. configura la app
4. luego ve a `Credenciales`
5. crea `ID de cliente OAuth`

Tipo recomendado:

- `Aplicación web`

## 3. Redirect URI que debes poner en Google

Añade esta URI autorizada:

`https://zrazcofpsypbpcxzznio.supabase.co/auth/v1/callback`

## 4. Datos que debes pegar en Supabase

Vuelve a Supabase y en el provider Google pega:

- `Client ID`
- `Client Secret`

## 5. Redirect URL permitida dentro de Supabase

Ve a:

`Authentication > URL Configuration`

y añade:

- `turnosapp://auth/callback`

## 6. Qué usa ya el código del repo

El proyecto ya está preparado para usar este callback:

- [src/providers/supabase-auth-provider.tsx](/C:/Users/rubbe/Desktop/apps/turnosapp/src/providers/supabase-auth-provider.tsx:1)
- [src/services/supabase.ts](/C:/Users/rubbe/Desktop/apps/turnosapp/src/services/supabase.ts:1)
- [app.json](/C:/Users/rubbe/Desktop/apps/turnosapp/app.json:1)

## 7. Qué hace el flujo

1. la app abre Google en navegador seguro
2. Google devuelve el control a Supabase
3. Supabase redirige a `turnosapp://auth/callback`
4. la app guarda la sesión localmente
5. el provider carga el perfil del usuario

## 8. Cómo sabrás que quedó bien

Cuando funcione:

- se abrirá Google
- volverás a la app
- aparecerá sesión válida en Supabase Auth
- se creará fila en `profiles`
- se creará fila en `user_settings`
