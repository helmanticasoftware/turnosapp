/**
 * TurnosApp — Integración RevenueCat (React Native / Expo)
 * ─────────────────────────────────────────────────────────
 * 
 * NOTA: El código Kotlin que te dio RevenueCat es para apps nativas Android.
 * Nosotros usamos React Native, así que la integración es diferente pero
 * la API key es la misma.
 *
 * IMPORTANTE:
 * - No dejes keys hardcodeadas en el repo aunque sean "public SDK keys".
 * - En Expo usa variables EXPO_PUBLIC_RC_ANDROID_KEY y EXPO_PUBLIC_RC_IOS_KEY.
 * - La build de producción debe usar las keys reales de cada tienda.
 * ─────────────────────────────────────────────────────────
 */

// ── 1. INSTALAR el SDK correcto para React Native ──────────
//
// En la terminal de tu proyecto Expo:
//   npx expo install react-native-purchases
//
// En app.json ya está configurado el plugin (lo tienes en tu app.json)

// ── 2. CONFIGURAR RevenueCat al inicio de la app ───────────
//
// En tu App.tsx / App.jsx, ANTES del return principal, añade:

import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_KEYS = {
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '',
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
};

// Llama esto UNA SOLA VEZ cuando arranca la app
export function initRevenueCat() {
  const apiKey = Platform.OS === 'android'
    ? RC_KEYS.android
    : RC_KEYS.ios;

  if (!apiKey) {
    console.warn('RevenueCat not configured: missing EXPO_PUBLIC_RC_* key');
    return false;
  }

  // En modo desarrollo muestra logs, en producción no
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
  return true;
}

// ── 3. VERIFICAR si el usuario tiene PRO ──────────────────
//
// Llama esto cuando arranca la app para sincronizar el estado de suscripción

export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    // "Turnosapp Pro" es el nombre del entitlement que creas en RevenueCat
    const hasProAccess = customerInfo.entitlements.active["Turnosapp Pro"] != null;
    return hasProAccess;
  } catch (error) {
    console.warn('RevenueCat checkProStatus error:', error);
    return false; // Si falla, trata al usuario como free (seguro)
  }
}

// ── 4. MOSTRAR EL PAYWALL Y GESTIONAR COMPRA ──────────────
//
// Reemplaza la función activate() en tu PaywallModal con esto:

export async function purchasePro(
  planType: 'monthly' | 'annual',
  setPlan: (plan: string) => void,
  toast: (msg: string) => void,
  onClose: () => void
) {
  try {
    // Obtener las ofertas configuradas en el dashboard de RevenueCat
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      toast('❌ No hay ofertas disponibles. Comprueba tu conexión.');
      return;
    }

    // Identificar el package según el plan seleccionado
    const pkg = planType === 'monthly'
      ? offerings.current.monthly      // mensual
      : offerings.current.annual;      // anual

    if (!pkg) {
      toast('❌ Plan no disponible. Inténtalo de nuevo.');
      return;
    }

    // Ejecutar la compra (abre el diálogo de pago nativo de Google/Apple)
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Comprobar que la compra fue exitosa
    if (customerInfo.entitlements.active["Turnosapp Pro"]) {
      setPlan('premium');
      toast('✅ ¡Bienvenido a PRO! Disfruta de todas las funciones.');
      onClose();
    }
  } catch (error: any) {
    if (!error.userCancelled) {
      // El usuario canceló → no mostrar error
      toast('❌ Error al procesar el pago. Inténtalo de nuevo.');
      console.error('Purchase error:', error);
    }
  }
}

// ── 5. RESTAURAR COMPRAS (obligatorio en App Store) ────────
//
// Apple exige que las apps tengan un botón "Restaurar compras"

export async function restorePurchases(
  setPlan: (plan: string) => void,
  toast: (msg: string) => void
) {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasProAccess = customerInfo.entitlements.active["Turnosapp Pro"] != null;

    if (hasProAccess) {
      setPlan('premium');
      toast('✅ Compras restauradas. Bienvenido de nuevo a PRO.');
    } else {
      toast('No se encontraron compras previas con esta cuenta.');
    }
  } catch (error) {
    toast('❌ Error al restaurar. Inténtalo de nuevo.');
    console.error('Restore error:', error);
  }
}

// ── 6. IDENTIFICAR AL USUARIO (opcional pero recomendado) ──
//
// Cuando el usuario inicia sesión con Google, identifícalo en RevenueCat
// para que sus compras se sincronicen entre dispositivos

export async function identifyUser(userId: string) {
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('RevenueCat identify error:', error);
  }
}

// Cuando cierra sesión:
export async function logoutUser() {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('RevenueCat logout error:', error);
  }
}

// ─────────────────────────────────────────────────────────────
// CÓMO INTEGRARLO EN App.tsx (ejemplo completo simplificado)
// ─────────────────────────────────────────────────────────────
/*
import { initRevenueCat, checkProStatus, identifyUser } from './revenuecat';

export default function App() {
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    // 1. Inicializar RevenueCat al arrancar
    initRevenueCat();

    // 2. Sincronizar estado de suscripción
    checkProStatus().then(isPro => {
      if (isPro) setPlan('premium');
    });
  }, []);

  // Cuando el usuario hace login con Google:
  // identifyUser(googleUser.id);
  
  // ... resto de tu app
}
*/

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN EN EL DASHBOARD DE REVENUECAT
// ─────────────────────────────────────────────────────────────
//
// Después de crear tu cuenta en revenuecat.com, sigue estos pasos:
//
// 1. Proyectos → Crear proyecto → "TurnosApp"
//
// 2. Añadir app Android:
//    - Google Play Package: com.TUNOMBRE.turnosapp
//    - Service Account credentials: (descarga el JSON de Google Play Console
//      en Configuración → Cuenta de servicio)
//
// 3. Entitlements → Crear:
//    - Identifier: "Turnosapp Pro"
//    - Display name: "TurnosApp PRO"
//
// 4. Products → Crear (para Android, después de configurar en Google Play):
//    - "turnosapp_pro_monthly" → 1,99€/mes → 14 días trial
//    - "turnosapp_pro_annual"  → 14,99€/año → 14 días trial
//    - "turnosapp_empresa"     → 9,99€/mes → 14 días trial
//
// 5. Offerings → Default offering:
//    - Añadir los products creados como packages
//    - El package mensual = "monthly"
//    - El package anual   = "annual"
//
// 6. En Google Play Console → Monetización → Suscripciones:
//    Crear las mismas suscripciones con los mismos identificadores
//
// ─────────────────────────────────────────────────────────────
// DIFERENCIA TEST KEY vs PRODUCCIÓN
// ─────────────────────────────────────────────────────────────
//
// KEYS DE PRODUCCIÓN (goog_XXXX o appl_XXXX):
//   ✅ Cobra dinero real a los usuarios
//   ✅ Se validan con las tiendas oficiales
//   → La encuentras en: Dashboard → Tu proyecto → API Keys → 
//     "Public app-specific API keys"
//
// Cuando vayas a publicar en Google Play:
//   1. Crea las suscripciones en Google Play Console
//   2. Conecta RevenueCat con Google Play (Service Account)
//   3. Configura EXPO_PUBLIC_RC_ANDROID_KEY en EAS / .env
//   4. Haz un nuevo build con EAS
