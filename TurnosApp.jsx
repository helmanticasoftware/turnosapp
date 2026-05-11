/**
 * TurnosApp – Código de producción v7
 * ─────────────────────────────────────────────────────────────────────────────
 * ADMOB Android App ID: ca-app-pub-3485168250647378~1198686158
 * ADMOB Android Banner: ca-app-pub-3485168250647378/6442959343
 *
 * En la app nativa (React Native / Expo), reemplazar el banner placeholder
 * con el componente real:
 *   import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
 *   <BannerAd unitId="ca-app-pub-3485168250647378/6442959343" size={BannerAdSize.BANNER} />
 *
 * GDPR: Usar Google UMP (User Messaging Platform) antes del primer anuncio:
 *   import { AdsConsent } from 'react-native-google-mobile-ads';
 *   await AdsConsent.requestInfoUpdate({ tagForUnderAgeOfConsent: false });
 *
 * PLAN EMPRESA: Límite 30 empleados
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constantes de seguridad ──────────────────────────────────
const MAX_EMPLOYEES = 30;        // Plan empresa: máx empleados
const MAX_GROUPS = 8;            // Máx grupos de trabajo por empresa
const MAX_NOTE_LEN  = 500;       // Máx caracteres en notas
const MAX_NAME_LEN  = 50;        // Máx caracteres en nombres
const MAX_CAL_NAME  = 30;        // Máx caracteres en nombre de calendario
const MAX_SHIFT_LABEL = 30;      // Máx caracteres en turnos personalizados
const MAX_HOURS_DAY   = 24;      // Máx horas de un turno
const MAX_HOURS_MONTH = 744;     // Máx horas/mes (31d × 24h)
const JOIN_CODE_REGEX = /^TUR-[A-Z0-9]{4}$/; // Validación código empresa
const APP_VERSION = "1.0.0";
const DEFAULT_DAY_BANKS = { vacation:22, personal:2, comp:0 };
const DEFAULT_NOTIF_CFG = { weekly:true, monthly:true, nextShift:true };
const DEMO_PROFILE = { name:"Perfil local", email:"demo@turnosapp.local", provider:"demo-local" };
const BILLING_READY = false;
const PLAN_IDS = ["basic", "premium", "business"];

// ─── Sanitización ────────────────────────────────────────────
const sanitize = (str, max = MAX_NOTE_LEN) => {
  if (typeof str !== "string") return "";
  // Elimina HTML y limita longitud
  return str.replace(/[<>&"']/g, "").slice(0, max).trim();
};
const sanitizeNum = (val, min = 0, max = 9999) => {
  const n = parseFloat(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
};
const sanitizeTime = (val) => typeof val === "string" && /^\d{2}:\d{2}$/.test(val) ? val : "";
const getCrypto = () => typeof globalThis !== "undefined" ? globalThis.crypto : null;
const randomToken = (len, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") => {
  const cryptoObj = getCrypto();
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(len);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
  }
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
};

// ─── Turnos base ─────────────────────────────────────────────
const BASE_SHIFTS = [
  { id:"morning",   label:"Mañana",     short:"M",  color:"#F59E0B", bg:"#78350F", icon:"☀️"   },
  { id:"afternoon", label:"Tarde",      short:"T",  color:"#38BDF8", bg:"#0C4A6E", icon:"🌤️"  },
  { id:"night",     label:"Noche",      short:"N",  color:"#A78BFA", bg:"#3B0764", icon:"🌙"   },
  { id:"rest",      label:"Descanso",   short:"D",  color:"#34D399", bg:"#064E3B", icon:"😴"   },
  { id:"vacation",  label:"Vacaciones", short:"V",  color:"#F472B6", bg:"#500724", icon:"🏖️"  },
  { id:"personal",  label:"Asunto",     short:"AP", color:"#67E8F9", bg:"#0E4A5A", icon:"🧑‍💼" },
  { id:"comp",      label:"Compensac.", short:"C",  color:"#86EFAC", bg:"#14532D", icon:"🔁"   },
  { id:"sick",      label:"Baja",       short:"B",  color:"#F87171", bg:"#450A0A", icon:"🤒"   },
  { id:"extra",     label:"Extra",      short:"EX", color:"#FB923C", bg:"#431407", icon:"⚡"   },
];

const CUSTOM_ICONS  = ["🌟","💜","🎯","🔵","🟢","🟡","🟠","🔴","⚫","🏅","🎪","🚀","🧩","🎸","🏆","💡","🌈","🔮","🎭","💎"];
const CUSTOM_COLORS = ["#EF4444","#F97316","#EAB308","#22C55E","#06B6D4","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#F43F5E"];
const CAL_COLORS    = ["#6366F1","#F59E0B","#34D399"];

const DEFAULT_CFG = {
  morning:{startTime:"08:00",endTime:"16:00",hours:8},
  afternoon:{startTime:"14:00",endTime:"22:00",hours:8},
  night:{startTime:"22:00",endTime:"06:00",hours:8},
  rest:{startTime:"",endTime:"",hours:0}, vacation:{startTime:"",endTime:"",hours:0},
  personal:{startTime:"",endTime:"",hours:0}, comp:{startTime:"",endTime:"",hours:0},
  sick:{startTime:"",endTime:"",hours:0}, extra:{startTime:"08:00",endTime:"20:00",hours:12},
};

const EVENTS = [
  {id:"gym",icon:"🏋️",label:"Gimnasio",color:"#34D399"},{id:"meeting",icon:"💼",label:"Reunión",color:"#38BDF8"},
  {id:"medical",icon:"🏥",label:"Médico",color:"#F87171"},{id:"alarm",icon:"⏰",label:"Aviso",color:"#F59E0B"},
  {id:"travel",icon:"✈️",label:"Viaje",color:"#A78BFA"},{id:"birthday",icon:"🎂",label:"Cumpleaños",color:"#F472B6"},
  {id:"food",icon:"🍽️",label:"Comida",color:"#FB923C"},{id:"training",icon:"📚",label:"Formación",color:"#818CF8"},
];

const ADVANCE = [{id:"same",label:"Hoy"},{id:"1d",label:"1 día"},{id:"2d",label:"2 días"},{id:"1w",label:"1 sem."}];

// Festivos nacionales España 2025-2027
const HOLIDAYS = {
  "2025-01-01":"Año Nuevo","2025-01-06":"Reyes Magos","2025-04-18":"Viernes Santo",
  "2025-05-01":"Día del Trabajo","2025-08-15":"Asunción","2025-10-12":"Fiesta Nacional",
  "2025-11-01":"Todos los Santos","2025-12-06":"Constitución","2025-12-08":"Inmaculada","2025-12-25":"Navidad",
  "2026-01-01":"Año Nuevo","2026-01-06":"Reyes Magos","2026-04-03":"Viernes Santo",
  "2026-05-01":"Día del Trabajo","2026-08-15":"Asunción","2026-10-12":"Fiesta Nacional",
  "2026-11-01":"Todos los Santos","2026-12-07":"Constitución","2026-12-08":"Inmaculada","2026-12-25":"Navidad",
  "2027-01-01":"Año Nuevo","2027-01-06":"Reyes Magos","2027-03-26":"Viernes Santo",
  "2027-05-01":"Día del Trabajo","2027-08-15":"Asunción","2027-10-12":"Fiesta Nacional",
  "2027-11-01":"Todos los Santos","2027-12-06":"Constitución","2027-12-08":"Inmaculada","2027-12-25":"Navidad",
};

const MONTHS   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_S = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const TABS     = ["calendar","stats","company","settings"];

const fmtKey  = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const genId   = () => `id_${randomToken(10, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
const genCode = () => `TUR-${randomToken(4)}`;
const genViewCode = () => `VER-${randomToken(4)}`;
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const escapeIcsText = (value) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\r?\n/g, "\\n")
  .replace(/,/g, "\\,")
  .replace(/;/g, "\\;");
const nextDateStamp = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
};

// ─── Storage (con manejo de errores robusto) ──────────────────
async function sLoad(k, fb) {
  try {
    if (typeof window === "undefined") return fb;
    if (window.storage?.get) {
      const r = await window.storage.get(k);
      if (!r) return fb;
      const parsed = JSON.parse(r.value);
      return parsed ?? fb;
    }
    const raw = window.localStorage?.getItem(k);
    if (!raw) return fb;
    const parsed = JSON.parse(raw);
    return parsed ?? fb;
  } catch { return fb; }
}
async function sSave(k, v) {
  try {
    if (typeof window === "undefined") return false;
    const serialized = JSON.stringify(v);
    if (window.storage?.set) {
      await window.storage.set(k, serialized);
      return true;
    }
    window.localStorage?.setItem(k, serialized);
    return true;
  }
  catch (e) { console.warn("Storage error:", e); return false; }
}

// ─── Temas ────────────────────────────────────────────────────
const DARK  = { bg:"#050A14",card:"#111827",border:"#1E293B",border2:"#334155",text:"#F1F5F9",sub:"#94A3B8",dim:"#64748B",faint:"#475569",header:"#0D1526" };
const LIGHT = { bg:"#F8FAFC",card:"#FFFFFF", border:"#E2E8F0",border2:"#CBD5E1",text:"#0F172A",sub:"#475569",dim:"#64748B",faint:"#94A3B8",header:"#FFFFFF" };

const normalizeEventList = (items) => Array.isArray(items) ? items
  .filter(item => item && typeof item === "object")
  .map(item => ({
    type: sanitize(item.type, 20),
    note: sanitize(item.note || "", MAX_NOTE_LEN),
    time: sanitizeTime(item.time),
    endTime: sanitizeTime(item.endTime),
    allDay: item.allDay !== false,
    advance: ADVANCE.find(a => a.id === item.advance)?.id || "1d",
  }))
  .filter(item => item.type) : [];

const normalizeCalendar = (value) => ({
  id: typeof value?.id === "string" && value.id ? value.id : genId(),
  name: sanitize(value?.name || "Calendario", MAX_CAL_NAME),
  color: typeof value?.color === "string" && value.color ? value.color : "#6366F1",
  shifts: value?.shifts && typeof value.shifts === "object"
    ? Object.fromEntries(Object.entries(value.shifts).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "string"))
    : {},
  evs: value?.evs && typeof value.evs === "object"
    ? Object.fromEntries(Object.entries(value.evs).map(([k, items]) => [k, normalizeEventList(items)]))
    : {},
  notes: value?.notes && typeof value.notes === "object"
    ? Object.fromEntries(Object.entries(value.notes).map(([k, note]) => [k, sanitize(note || "", MAX_NOTE_LEN)]))
    : {},
});

const normalizeCompany = (value) => {
  if (!value || typeof value !== "object") return null;
  return {
    name: sanitize(value.name || "Mi Empresa", MAX_NAME_LEN),
    code: JOIN_CODE_REGEX.test(value.code || "") ? value.code : genCode(),
    members: Array.isArray(value.members) ? value.members.map(member => ({
      name: sanitize(member?.name || "", MAX_NAME_LEN),
      role: sanitize(member?.role || "Empleado", 24) || "Empleado",
      shift: typeof member?.shift === "string" ? member.shift : null,
    })).filter(member => member.name).slice(0, MAX_EMPLOYEES) : [],
    swaps: Array.isArray(value.swaps) ? value.swaps.map(req => ({
      id: typeof req?.id === "string" && req.id ? req.id : genId(),
      from: sanitize(req?.from || "", MAX_NAME_LEN),
      to: sanitize(req?.to || "", MAX_NAME_LEN),
      date: sanitize(req?.date || "", 20),
      status: ["pending", "approved", "rejected"].includes(req?.status) ? req.status : "pending",
      group: sanitize(req?.group || "", MAX_NAME_LEN),
      note: sanitize(req?.note || "", 120),
      reviewedAt: sanitize(req?.reviewedAt || "", 20),
    })).filter(req => req.from && req.to) : [],
    groups: Array.isArray(value.groups) ? value.groups.map(group => ({
      id: typeof group?.id === "string" && group.id ? group.id : genId(),
      name: sanitize(group?.name || "Grupo", MAX_NAME_LEN),
      members: Array.isArray(group?.members) ? group.members.map(member => sanitize(member, MAX_NAME_LEN)).filter(Boolean).slice(0, MAX_EMPLOYEES) : [],
    })).filter(group => group.name).slice(0, MAX_GROUPS) : [],
    history: Array.isArray(value.history) ? value.history.map(item => ({
      id: typeof item?.id === "string" && item.id ? item.id : genId(),
      type: sanitize(item?.type || "info", 20),
      text: sanitize(item?.text || "", 160),
      date: sanitize(item?.date || "", 20),
    })).filter(item => item.text).slice(0, 60) : [],
  };
};

const normalizeUserInfo = (value) => {
  if (!value || typeof value !== "object") return null;
  const name = sanitize(value.name || "", MAX_NAME_LEN);
  const email = sanitize((value.email || "").toLowerCase(), 120);
  if (!name && !email) return null;
  return {
    name: name || "Usuario",
    email: email || "sin-email@local.invalid",
    provider: sanitize(value.provider || "unknown", 24) || "unknown",
  };
};

const normalizeCustomShift = (value) => ({
  id: typeof value?.id === "string" && value.id ? value.id : `custom_${genId()}`,
  label: sanitize(value?.label || "Turno personalizado", MAX_SHIFT_LABEL),
  short: sanitize((value?.short || "TP").toUpperCase(), 3) || "TP",
  color: typeof value?.color === "string" && value.color ? value.color : CUSTOM_COLORS[0],
  bg: typeof value?.bg === "string" && value.bg ? value.bg : `${value?.color || CUSTOM_COLORS[0]}33`,
  icon: typeof value?.icon === "string" && value.icon ? value.icon : CUSTOM_ICONS[0],
  custom: true,
});

const normalizeCfg = (cfgValue, customShifts = []) => {
  const next = { ...DEFAULT_CFG };
  const source = cfgValue && typeof cfgValue === "object" ? cfgValue : {};
  Object.keys(DEFAULT_CFG).forEach(key => {
    const value = source[key] || {};
    next[key] = {
      startTime: sanitizeTime(value.startTime),
      endTime: sanitizeTime(value.endTime),
      hours: sanitizeNum(value.hours ?? DEFAULT_CFG[key].hours, 0, MAX_HOURS_DAY),
    };
  });
  customShifts.forEach(shift => {
    const value = source[shift.id] || {};
    next[shift.id] = {
      startTime: sanitizeTime(value.startTime),
      endTime: sanitizeTime(value.endTime),
      hours: sanitizeNum(value.hours ?? 0, 0, MAX_HOURS_DAY),
    };
  });
  return next;
};

const normalizeBackupData = (value) => {
  const customShifts = Array.isArray(value?.customShifts) ? value.customShifts.map(normalizeCustomShift) : [];
  const calendars = Array.isArray(value?.calendars) && value.calendars.length > 0
    ? value.calendars.map(normalizeCalendar)
    : [normalizeCalendar({ name:"Mi turno", color:"#6366F1" })];
  return {
    calendars,
    calIdx: Math.min(sanitizeNum(value?.calIdx, 0, calendars.length - 1), calendars.length - 1),
    cfg: normalizeCfg(value?.cfg, customShifts),
    customShifts,
    plan: value?.plan === "free" ? "basic" : (PLAN_IDS.includes(value?.plan) ? value.plan : "basic"),
    company: normalizeCompany(value?.company),
    userInfo: normalizeUserInfo(value?.userInfo),
    contractH: sanitizeNum(value?.contractH, 0, MAX_HOURS_MONTH),
    dayBanks: {
      vacation: sanitizeNum(value?.dayBanks?.vacation, 0, 365),
      personal: sanitizeNum(value?.dayBanks?.personal, 0, 365),
      comp: sanitizeNum(value?.dayBanks?.comp, 0, 365),
    },
    showHols: value?.showHols !== false,
    darkMode: value?.darkMode !== false,
    notifCfg: {
      weekly: value?.notifCfg?.weekly !== false,
      monthly: value?.notifCfg?.monthly !== false,
      nextShift: value?.notifCfg?.nextShift !== false,
    },
  };
};

const mkCal = (name, color) => normalizeCalendar({ name, color });

// ─── Hook de gestos (swipe) ───────────────────────────────────
function useSwipe({ onLeft, onRight, onDown, threshold=55, vertThreshold=80 } = {}) {
  const start = useRef(null);
  const onTouchStart = useCallback(e => {
    start.current = { x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now() };
  }, []);
  const onTouchEnd = useCallback(e => {
    if (!start.current) return;
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    const dt = Date.now() - start.current.t;
    start.current = null;
    if (dt > 700) return; // Swipe demasiado lento → ignorar
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      dx < 0 ? onLeft?.() : onRight?.();
    } else if (dy > vertThreshold && Math.abs(dx) < 60) {
      onDown?.();
    }
  }, [onLeft, onRight, onDown, threshold, vertThreshold]);
  return { onTouchStart, onTouchEnd };
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // ── Multi-calendario ──
  const [calendars,     setCalendars]    = useState([]);
  const [calIdx,        setCalIdx]       = useState(0);
  // ── Config global ──
  const [cfg,           setCfg]          = useState(DEFAULT_CFG);
  const [customShifts,  setCustomShifts] = useState([]);
  const [plan,          setPlan]         = useState("basic");
  const [company,       setCompany]      = useState(null);
  const [userInfo,      setUserInfo]     = useState(null);
  const [contractH,     setContractH]    = useState(160);
  const [dayBanks,      setDayBanks]     = useState(DEFAULT_DAY_BANKS);
  const [showHols,      setShowHols]     = useState(true);
  const [darkMode,      setDarkMode]     = useState(true);
  const [notifCfg,      setNotifCfg]     = useState(DEFAULT_NOTIF_CFG);
  // ── UI ──
  const [tab,           setTab]          = useState("calendar");
  const [now,           setNow]          = useState(new Date());
  const [paint,         setPaint]        = useState({ on:false, sid:null });
  const [selDay,        setSelDay]       = useState(null);
  const [paywall,       setPaywall]      = useState({ show:false, feat:"" });
  const [modal,         setModal]        = useState(null);
  const [toast,         setToast]        = useState(null);
  const [onboarding,    setOnboarding]   = useState(null);
  const [loaded,        setLoaded]       = useState(false);

  // Ref para evitar stale closures en callbacks
  const calsRef = useRef(calendars);
  useEffect(() => { calsRef.current = calendars; }, [calendars]);

  const isPro    = plan === "premium" || plan === "business";
  const T        = darkMode ? DARK : LIGHT;
  const MAX_CALS = isPro ? 3 : 1;

  // Calendario activo con fallback seguro
  const safeIdx = Math.max(0, Math.min(calIdx, calendars.length - 1));
  const cal     = calendars[safeIdx] ?? mkCal("Mi turno", "#6366F1");
  const shifts  = cal.shifts ?? {};
  const evs     = cal.evs    ?? {};
  const notes   = cal.notes  ?? {};

  // Actualiza calendario activo y persiste (evita stale closure con callback)
  const updateCal = useCallback(async (idx, patch) => {
    setCalendars(prev => {
      const next = prev.map((c, i) => i === idx ? { ...c, ...patch } : c);
      calsRef.current = next;
      sSave("cals10", next);
      return next;
    });
  }, []);

  const buildBackupSnapshot = useCallback(() => ({
    calendars: calsRef.current.map(normalizeCalendar),
    calIdx: safeIdx,
    cfg: normalizeCfg(cfg, customShifts),
    customShifts: customShifts.map(normalizeCustomShift),
    plan,
    company: normalizeCompany(company),
    userInfo: normalizeUserInfo(userInfo),
    contractH: sanitizeNum(contractH, 0, MAX_HOURS_MONTH),
    dayBanks: {
      vacation: sanitizeNum(dayBanks.vacation, 0, 365),
      personal: sanitizeNum(dayBanks.personal, 0, 365),
      comp: sanitizeNum(dayBanks.comp, 0, 365),
    },
    showHols: !!showHols,
    darkMode: !!darkMode,
    notifCfg: {
      weekly: !!notifCfg.weekly,
      monthly: !!notifCfg.monthly,
      nextShift: !!notifCfg.nextShift,
    },
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  }), [safeIdx, cfg, customShifts, plan, company, userInfo, contractH, dayBanks, showHols, darkMode, notifCfg]);

  const restoreBackupSnapshot = useCallback(async (raw) => {
    const data = normalizeBackupData(raw);
    calsRef.current = data.calendars;
    setCalendars(data.calendars);
    setCalIdx(data.calIdx);
    setCfg(data.cfg);
    setCustomShifts(data.customShifts);
    setPlan(data.plan);
    setCompany(data.company);
    setUserInfo(data.userInfo);
    setContractH(data.contractH);
    setDayBanks(data.dayBanks);
    setShowHols(data.showHols);
    setDarkMode(data.darkMode);
    setNotifCfg(data.notifCfg);
    await Promise.all([
      sSave("cals10", data.calendars),
      sSave("calidx10", data.calIdx),
      sSave("sc10", data.cfg),
      sSave("cs10", data.customShifts),
      sSave("pl10", data.plan),
      sSave("co10", data.company),
      sSave("ui10", data.userInfo),
      sSave("ch10", data.contractH),
      sSave("db10", data.dayBanks),
      sSave("hols10", data.showHols),
      sSave("dm10", data.darkMode),
      sSave("nc10", data.notifCfg),
    ]);
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      let cals = await sLoad("cals10", null);
      if (!Array.isArray(cals) || cals.length === 0) cals = [mkCal("Mi turno", "#6366F1")];
      cals = cals.map(normalizeCalendar);
      calsRef.current = cals;
      setCalendars(cals);

      const idx = await sLoad("calidx10", 0);
      setCalIdx(Math.min(idx, cals.length - 1));
      const rawCustomShifts = await sLoad("cs10", []);
      const savedCustomShifts = Array.isArray(rawCustomShifts) ? rawCustomShifts.map(normalizeCustomShift) : [];
      setCustomShifts(savedCustomShifts);
      setCfg(normalizeCfg(await sLoad("sc10", DEFAULT_CFG), savedCustomShifts));
      const savedPlan = await sLoad("pl10", "basic");
      setPlan(savedPlan === "free" ? "basic" : savedPlan);
      setCompany(     normalizeCompany(await sLoad("co10", null)));
      setUserInfo(    normalizeUserInfo(await sLoad("ui10", null)));
      setContractH(sanitizeNum(await sLoad("ch10", 160), 0, MAX_HOURS_MONTH));
      setDayBanks(normalizeBackupData({ dayBanks: await sLoad("db10", DEFAULT_DAY_BANKS) }).dayBanks);
      setShowHols(    await sLoad("hols10", true));
      setDarkMode(    await sLoad("dm10", true));
      setNotifCfg(normalizeBackupData({ notifCfg: await sLoad("nc10", DEFAULT_NOTIF_CFG) }).notifCfg);
      const ob = await sLoad("ob10", false);
      if (!ob) setOnboarding(0);
      setLoaded(true);
    })();
  }, []);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const needsPro  = (feat) => { if (isPro) return true; setPaywall({ show:true, feat }); return false; };

  const allShifts = [...BASE_SHIFTS, ...customShifts];
  const yr = now.getFullYear(), mo = now.getMonth();
  const daysInMo = new Date(yr, mo+1, 0).getDate();
  const startOff = (() => { const d = new Date(yr,mo,1).getDay(); return d===0?6:d-1; })();
  const shHours  = (sid) => sanitizeNum(cfg[sid]?.hours ?? 0, 0, MAX_HOURS_DAY);

  const calcStreak = () => {
    const today = new Date(); let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = fmtKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (shifts[k]) s++; else if (i > 0) break;
    }
    return s;
  };

  const calcAnnualUsed = (y) => {
    const u = { vacation:0, personal:0, comp:0 };
    Object.entries(shifts).forEach(([k, sid]) => {
      if (!k.startsWith(String(y))) return;
      if (sid === "vacation") u.vacation++;
      if (sid === "personal") u.personal++;
      if (sid === "comp")     u.comp++;
    });
    return u;
  };

  const calcMonthStats = useCallback((y, m, sh = shifts) => {
    const days = new Date(y, m+1, 0).getDate();
    const s = { h:0, worked:0, mornings:0, afternoons:0, nights:0, rests:0, vacations:0, personals:0, comps:0, sick:0, extra:0, weekends:0, holidaysWorked:0 };
    for (let d = 1; d <= days; d++) {
      const k = fmtKey(y,m,d), sid = sh[k]; if (!sid) continue;
      const hours = shHours(sid); s.h += hours; if (hours > 0) s.worked++;
      if (sid==="morning")   s.mornings++;
      if (sid==="afternoon") s.afternoons++;
      if (sid==="night")     s.nights++;
      if (sid==="rest")      s.rests++;
      if (sid==="vacation")  s.vacations++;
      if (sid==="personal")  s.personals++;
      if (sid==="comp")      s.comps++;
      if (sid==="sick")      s.sick++;
      if (sid==="extra")     s.extra++;
      const dow = new Date(y,m,d).getDay();
      if ((dow===0||dow===6) && hours>0) s.weekends++;
      if (HOLIDAYS[k] && hours>0) s.holidaysWorked++;
    }
    s.overtime = Math.max(0, s.h - contractH);
    return s;
  }, [shifts, contractH]);

  const calcAnnualStats = useCallback(() => {
    const t = { h:0, worked:0, mornings:0, afternoons:0, nights:0, rests:0, vacations:0, personals:0, comps:0, sick:0, extra:0, weekends:0, holidaysWorked:0, overtime:0 };
    for (let m = 0; m < 12; m++) { const s = calcMonthStats(yr, m); Object.keys(t).forEach(k => t[k] += s[k]); }
    return t;
  }, [calcMonthStats, yr]);

  const applyShift = async (key, sid) => {
    // Validar que el sid existe en allShifts
    if (sid && !allShifts.find(s => s.id === sid)) return;
    let u;
    if (!sid || shifts[key] === sid) { u = { ...shifts }; delete u[key]; }
    else u = { ...shifts, [key]: sid };
    updateCal(safeIdx, { shifts: u });
  };

  const handleDayTap = (key) => { if (paint.on && paint.sid) applyShift(key, paint.sid); else setSelDay(key); };
  const togglePaint  = (sid) => setPaint(p => p.on && p.sid === sid ? { on:false, sid:null } : { on:true, sid });

  // Exportar PDF con datos validados
  const exportPDF = () => {
    if (!needsPro("exportar PDF")) return;
    const days = new Date(yr, mo+1, 0).getDate(); let rows = "";
    for (let d = 1; d <= days; d++) {
      const k = fmtKey(yr, mo, d); const sid = shifts[k]; const sh = allShifts.find(s => s.id === sid);
      const dow = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date(yr,mo,d).getDay()];
      const hol = HOLIDAYS[k] || ""; const nt = sanitize(notes[k] || "", 200);
      rows += `<tr style="background:${d%2===0?"#f8fafc":"white"}"><td style="padding:6px 10px;font-weight:bold;color:#475569">${dow} ${d}</td><td style="padding:6px 10px;color:${sh?.color||"#94a3b8"};font-weight:${sh?"700":"400"}">${sh ? sh.icon+" "+sh.label : "—"}</td><td style="padding:6px 10px;color:#ef4444;font-size:12px">${hol ? "🔴 "+hol : ""}</td><td style="padding:6px 10px;color:#64748b;font-size:12px">${nt}</td></tr>`;
    }
    const stats = calcMonthStats(yr, mo);
    const calName = sanitize(cal.name, MAX_CAL_NAME);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TurnosApp – ${MONTHS[mo]} ${yr}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#1e293b}h1{color:#6366f1;margin-bottom:4px}.sub{color:#64748b;font-size:14px;margin-bottom:20px}.stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;background:#f1f5f9;padding:16px;border-radius:12px}.stat{text-align:center}.stat .val{font-size:24px;font-weight:800;color:#6366f1}.stat .lbl{font-size:11px;color:#64748b}table{width:100%;border-collapse:collapse;font-size:14px}th{background:#6366f1;color:white;padding:8px 10px;text-align:left}@media print{body{padding:8px}}</style></head><body><h1>📅 ${calName} — ${MONTHS[mo]} ${yr}</h1><div class="sub">Generado por TurnosApp · ${new Date().toLocaleDateString("es")}</div><div class="stats"><div class="stat"><div class="val">${stats.h}</div><div class="lbl">Horas</div></div><div class="stat"><div class="val">${stats.mornings}</div><div class="lbl">Mañanas</div></div><div class="stat"><div class="val">${stats.afternoons}</div><div class="lbl">Tardes</div></div><div class="stat"><div class="val">${stats.nights}</div><div class="lbl">Noches</div></div><div class="stat"><div class="val">${stats.weekends}</div><div class="lbl">Fines sem.</div></div><div class="stat"><div class="val" style="color:${stats.overtime>0?"#f97316":"#22c55e"}">${stats.overtime>0?"+"+stats.overtime+"h":"✓"}</div><div class="lbl">H. extra</div></div></div><table><tr><th>Día</th><th>Turno</th><th>Festivo</th><th>Nota</th></tr>${rows}</table><script>window.print();<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Gestos: swipe horizontal cambia de pestaña
  const tabSwipe = useSwipe({
    onLeft:  () => setTab(t => { const i = TABS.indexOf(t); return TABS[Math.min(i+1, TABS.length-1)]; }),
    onRight: () => setTab(t => { const i = TABS.indexOf(t); return TABS[Math.max(i-1, 0)]; }),
  });

  if (!loaded) return (
    <div style={{background:"#050A14",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:48}}>📅</div>
      <div style={{color:"#6366F1",fontFamily:"sans-serif",fontWeight:700,fontSize:18}}>TurnosApp</div>
      <div style={{color:"#334155",fontSize:12}}>Cargando…</div>
    </div>
  );

  const moStats    = calcMonthStats(yr, mo);
  const streak     = calcStreak();
  const annualUsed = calcAnnualUsed(yr);

  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",color:T.text,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",transition:"background 0.3s,color 0.3s"}}>

      {/* ── HEADER ── */}
      <div style={{background:T.header,borderBottom:`1px solid ${T.border}`,padding:"11px 14px 9px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>📅</span>
            <span style={{fontWeight:800,fontSize:17,background:"linear-gradient(135deg,#6366F1,#A78BFA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TurnosApp</span>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <button onClick={async()=>{const v=!darkMode;setDarkMode(v);await sSave("dm10",v);}} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{darkMode?"☀️":"🌙"}</button>
            {isPro
              ? <span style={{background:"linear-gradient(135deg,#6366F1,#A78BFA)",color:"white",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{plan==="business"?"EMPRESA":"PRO"}</span>
              : <button onClick={()=>setPaywall({show:true,feat:""})} style={{background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,cursor:"pointer"}}>✨ PRO</button>
            }
          </div>
        </div>

        {/* Selector de calendarios */}
        <div style={{display:"flex",gap:5,marginTop:8,overflowX:"auto",paddingBottom:2}}>
          {calendars.map((c,i) => (
            <button key={c.id} onClick={async()=>{setCalIdx(i);await sSave("calidx10",i);}} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:`2px solid ${i===safeIdx?c.color:T.border}`,background:i===safeIdx?c.color+"22":T.card,cursor:"pointer",flexShrink:0,transition:"all 0.2s"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <span style={{fontSize:11,fontWeight:i===safeIdx?700:400,color:i===safeIdx?c.color:T.sub,whiteSpace:"nowrap"}}>{c.name}</span>
            </button>
          ))}
          {calendars.length < MAX_CALS
            ? <button onClick={()=>setModal("calMgr")} style={{display:"flex",alignItems:"center",padding:"4px 10px",borderRadius:20,border:`1px dashed ${T.border2}`,background:"none",cursor:"pointer",flexShrink:0}}>
                <span style={{fontSize:11,color:T.faint}}>+ Añadir</span>
              </button>
            : !isPro && <button onClick={()=>setPaywall({show:true,feat:"más calendarios"})} style={{display:"flex",alignItems:"center",padding:"4px 10px",borderRadius:20,border:`1px dashed ${T.border2}`,background:"none",cursor:"pointer",flexShrink:0}}>
                <span style={{fontSize:10,color:"#818CF8",fontWeight:700}}>🔒 PRO (3 cals)</span>
              </button>
          }
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL (swipe = cambiar tab) ── */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:isPro?70:110}} {...tabSwipe}>
        {tab==="calendar"  && <CalendarTab yr={yr} mo={mo} daysInMo={daysInMo} startOff={startOff} shifts={shifts} evs={evs} notes={notes} paint={paint} togglePaint={togglePaint} handleDayTap={handleDayTap} moStats={moStats} now={now} setNow={setNow} showHols={showHols} isPro={isPro} needsPro={needsPro} setModal={setModal} streak={streak} T={T} allShifts={allShifts} calColor={cal.color||"#6366F1"} exportPDF={exportPDF}/>}
        {tab==="stats"     && <StatsTab yr={yr} mo={mo} moStats={moStats} calcMonthStats={calcMonthStats} calcAnnualStats={calcAnnualStats} contractH={contractH} setContractH={setContractH} dayBanks={dayBanks} setDayBanks={setDayBanks} annualUsed={annualUsed} sSave={sSave} isPro={isPro} needsPro={needsPro} setModal={setModal} T={T} exportPDF={exportPDF} calName={cal.name}/>}
        {tab==="company"   && <CompanyTab company={company} setCompany={setCompany} plan={plan} needsPro={needsPro} sSave={sSave} toast={showToast} T={T}/>}
        {tab==="settings"  && <SettingsTab plan={plan} setPlan={setPlan} setPaywall={setPaywall} sSave={sSave} cfg={cfg} setCfg={setCfg} isPro={isPro} needsPro={needsPro} setModal={setModal} showHols={showHols} setShowHols={setShowHols} userInfo={userInfo} setUserInfo={setUserInfo} contractH={contractH} setContractH={setContractH} dayBanks={dayBanks} setDayBanks={setDayBanks} notifCfg={notifCfg} setNotifCfg={setNotifCfg} darkMode={darkMode} setDarkMode={setDarkMode} customShifts={customShifts} setCustomShifts={setCustomShifts} toast={showToast} T={T}/>}
      </div>

      {/* ── BANNER ADMOB (placeholder) ──
           En React Native reemplazar por:
           <BannerAd unitId="ca-app-pub-3485168250647378/6442959343" size={BannerAdSize.BANNER}/>
           Requiere consentimiento GDPR antes del primer render ── */}
      {!isPro && (
        <div style={{position:"fixed",bottom:56,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.header,borderTop:`1px solid ${T.border}`,padding:"7px 14px",display:"flex",alignItems:"center",gap:8,zIndex:40}}>
          <span style={{fontSize:9,color:T.faint,background:T.card,padding:"1px 5px",borderRadius:3,flexShrink:0,letterSpacing:0.5}}>ANUNCIO</span>
          <span style={{fontSize:11,color:T.sub,flex:1}}>Sin anuncios con <span style={{color:"#818CF8",fontWeight:700,cursor:"pointer"}} onClick={()=>setPaywall({show:true,feat:""})}>PRO 1,99€/mes →</span></span>
        </div>
      )}

      {/* ── NAV INFERIOR ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:T.header,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:50}}>
        {[{id:"calendar",icon:"📅",label:"Turnos"},{id:"stats",icon:"📊",label:"Stats"},{id:"company",icon:"🏢",label:"Empresa"},{id:"settings",icon:"⚙️",label:"Ajustes"}].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:tab===t.id?1:0.4,transition:"opacity 0.2s"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,color:tab===t.id?"#818CF8":T.sub,fontWeight:tab===t.id?700:400}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── MODALES ── */}
      {selDay        && <DayModal dayKey={selDay} shifts={shifts} evs={evs} notes={notes} updateCal={updateCal} calIdx={safeIdx} onClose={()=>setSelDay(null)} allShifts={allShifts} T={T} toast={showToast}/>}
      {paywall.show  && <PaywallModal feat={paywall.feat} onClose={()=>setPaywall({show:false,feat:""})} setPlan={setPlan} sSave={sSave} toast={showToast} T={T}/>}
      {modal==="patterns"    && <PatternsModal   onClose={()=>setModal(null)} now={now} shifts={shifts} updateCal={updateCal} calIdx={safeIdx} isPro={isPro} needsPro={needsPro} toast={showToast} T={T} allShifts={allShifts}/>}
      {modal==="shiftCfg"    && <ShiftCfgModal   onClose={()=>setModal(null)} cfg={cfg} setCfg={setCfg} sSave={sSave} toast={showToast} T={T}/>}
      {modal==="gcal"        && <GCalModal        onClose={()=>setModal(null)} shifts={shifts} cfg={cfg} yr={yr} isPro={isPro} needsPro={needsPro} toast={showToast} T={T} allShifts={allShifts}/>}
      {modal==="share"       && <ShareModal       onClose={()=>setModal(null)} isPro={isPro} needsPro={needsPro} toast={showToast} T={T}/>}
      {modal==="data"        && <DataModal        onClose={()=>setModal(null)} buildBackupSnapshot={buildBackupSnapshot} restoreBackupSnapshot={restoreBackupSnapshot} userInfo={userInfo} setUserInfo={setUserInfo} sSave={sSave} toast={showToast} T={T}/>}
      {modal==="customShift" && <CustomShiftModal onClose={()=>setModal(null)} customShifts={customShifts} setCustomShifts={setCustomShifts} cfg={cfg} setCfg={setCfg} sSave={sSave} toast={showToast} T={T}/>}
      {modal==="calMgr"      && <CalendarManagerModal onClose={()=>setModal(null)} calendars={calendars} setCalendars={setCalendars} calIdx={safeIdx} setCalIdx={setCalIdx} isPro={isPro} MAX_CALS={MAX_CALS} sSave={sSave} toast={showToast} T={T}/>}
      {modal==="annualSummary" && <AnnualSummaryModal onClose={()=>setModal(null)} yr={yr} calcAnnualStats={calcAnnualStats} calcMonthStats={calcMonthStats} isPro={isPro} needsPro={needsPro} T={T} calName={cal.name}/>}
      {onboarding !== null  && <OnboardingModal step={onboarding} setStep={setOnboarding} onDone={async()=>{setOnboarding(null);await sSave("ob10",true);}} T={T}/>}

      {/* ── TOAST ── */}
      {toast && <div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:T.card,border:`1px solid ${T.border2}`,color:T.text,padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:600,zIndex:200,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",pointerEvents:"none"}}>{toast}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────
const OB = [
  {icon:"📅",title:"Bienvenido a TurnosApp",body:"Lleva el control de tus turnos de forma visual y sencilla. En menos de 1 minuto tienes el mes configurado."},
  {icon:"✏️",title:"Modo pintura",body:"Pulsa un turno (Mañana, Tarde…) y toca los días del calendario para asignarlos. Rapidísimo."},
  {icon:"📊",title:"Estadísticas automáticas",body:"Horas trabajadas, horas extra, festivos y bolsa de vacaciones calculados automáticamente."},
  {icon:"🔔",title:"Eventos y recordatorios",body:"Toca cualquier día para añadir citas médicas, reuniones o avisos con hora exacta y aviso previo."},
];
function OnboardingModal({step, setStep, onDone, T}) {
  const s = OB[step], isLast = step === OB.length - 1;
  const swipe = useSwipe({ onLeft:()=>isLast?onDone():setStep(step+1), onRight:()=>step>0&&setStep(step-1), onDown:onDone });
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} {...swipe}>
      <div style={{background:T.card,borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:360,textAlign:"center",border:`1px solid ${T.border}`}}>
        <div style={{fontSize:56,marginBottom:16}}>{s.icon}</div>
        <div style={{fontWeight:800,fontSize:20,marginBottom:10,color:T.text}}>{s.title}</div>
        <div style={{color:T.dim,fontSize:14,lineHeight:1.6,marginBottom:28}}>{s.body}</div>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:24}}>
          {OB.map((_,i) => <div key={i} style={{width:i===step?20:7,height:7,borderRadius:4,background:i===step?"#6366F1":T.border2,transition:"all 0.3s"}}/>)}
        </div>
        <button onClick={isLast?onDone:()=>setStep(step+1)} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"14px",borderRadius:14,cursor:"pointer",fontWeight:800,fontSize:16,marginBottom:10}}>
          {isLast ? "¡Empezar!" : "Siguiente →"}
        </button>
        {!isLast && <button onClick={onDone} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:13}}>Saltar tutorial</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR TAB
// ─────────────────────────────────────────────────────────────
function CalendarTab({yr,mo,daysInMo,startOff,shifts,evs,notes,paint,togglePaint,handleDayTap,moStats,now,setNow,showHols,isPro,needsPro,setModal,streak,T,allShifts,calColor,exportPDF}) {
  const [viewMode, setViewMode] = useState("month");
  const cells = [];
  for (let i=0; i<startOff; i++) cells.push(null);
  for (let d=1; d<=daysInMo; d++) cells.push(d);
  while (cells.length%7 !== 0) cells.push(null);
  const td = new Date(), todayKey = fmtKey(td.getFullYear(), td.getMonth(), td.getDate());
  const weekStart = (() => {
    const current = new Date(now);
    const dow = current.getDay() === 0 ? 7 : current.getDay();
    return addDays(current, -(dow - 1));
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const movePrev = () => setNow(viewMode === "week" ? addDays(now, -7) : new Date(yr,mo-1,1));
  const moveNext = () => setNow(viewMode === "week" ? addDays(now, 7) : new Date(yr,mo+1,1));
  const moveToday = () => setNow(new Date());

  // Swipe en la cuadrícula → cambiar mes/semana
  const calSwipe = useSwipe({ onLeft: moveNext, onRight: movePrev });

  const paintCards = allShifts.map(s => ({
    sid:s.id, label:s.label, icon:s.icon, color:s.color, bg:s.bg,
    val: ({morning:moStats.mornings,afternoon:moStats.afternoons,night:moStats.nights,rest:moStats.rests,vacation:moStats.vacations,personal:moStats.personals,comp:moStats.comps,sick:moStats.sick,extra:moStats.extra})[s.id] ?? 0,
  }));

  const renderDayCell = (dateObj, idx) => {
    if (!dateObj) return <div key={`e${idx}`}/>;
    const key = fmtKey(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const sid = shifts[key];
    const sh = allShifts.find(s=>s.id===sid);
    const isToday = key === todayKey;
    const isWeekend = [0,6].includes(dateObj.getDay());
    const isHoliday = showHols && !!HOLIDAYS[key];
    const dayEvs = evs[key] || [];
    const hasNote = !!notes[key];
    return (
      <button key={key} onClick={()=>handleDayTap(key)} style={{height:viewMode==="week"?88:64,border:isToday?`2px solid ${calColor}`:isHoliday?"1px solid #F87171":`1px solid ${T.border}`,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"4px 2px 3px",cursor:"pointer",position:"relative",background:sh?sh.bg:T.card,outline:"none"}}>
        {hasNote && <div style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:"#6366F1",flexShrink:0}}/>}
        {viewMode==="week" && <span style={{fontSize:8,color:isWeekend?"#F472B6":T.faint,fontWeight:700}}>{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][dateObj.getDay()===0?6:dateObj.getDay()-1]}</span>}
        <span style={{fontSize:10,fontWeight:800,color:sh?sh.color:isHoliday?"#F87171":isWeekend?"#F472B6":T.dim,lineHeight:1}}>{dateObj.getDate()}</span>
        <span style={{fontSize:viewMode==="week"?18:15,lineHeight:1}}>{sh?sh.icon:"·"}</span>
        <div style={{display:"flex",gap:1,flexWrap:"wrap",justifyContent:"center",minHeight:14}}>
          {dayEvs.slice(0,4).map((ev,i) => { const et=EVENTS.find(e=>e.id===ev.type); return et?<span key={i} style={{fontSize:10,lineHeight:1}}>{et.icon}</span>:null; })}
        </div>
      </button>
    );
  };

  const periodLabel = viewMode === "week"
    ? `${weekDays[0].getDate()} ${MONTHS_S[weekDays[0].getMonth()]} - ${weekDays[6].getDate()} ${MONTHS_S[weekDays[6].getMonth()]}`
    : MONTHS[mo];

  return (
    <div style={{paddingBottom:8}}>
      {/* Nav periodo */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px 8px"}}>
        <button onClick={movePrev} style={{background:T.card,border:`1px solid ${T.border}`,color:T.sub,width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:18}}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:800,fontSize:20,color:T.text}}>{periodLabel}</div>
          <div style={{fontSize:12,color:T.dim}}>{yr}</div>
        </div>
        <button onClick={moveNext} style={{background:T.card,border:`1px solid ${T.border}`,color:T.sub,width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:18}}>›</button>
      </div>

      {/* Strip superior */}
      <div style={{display:"flex",gap:7,padding:"0 14px 10px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 12px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:15}}>⏱</span>
          <div><div style={{fontWeight:800,fontSize:17,lineHeight:1,color:T.text}}>{moStats.h}</div><div style={{fontSize:9,color:T.faint}}>horas</div></div>
        </div>
        {streak > 0 && <div style={{background:"#431407",border:"1px solid #FB923C",borderRadius:10,padding:"7px 10px",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:13}}>🔥</span><div><div style={{fontWeight:800,fontSize:14,color:"#FB923C",lineHeight:1}}>{streak}</div><div style={{fontSize:8,color:"#FB923C80"}}>racha</div></div>
        </div>}
        {moStats.overtime > 0 && <div style={{background:"#1E1B4B",border:"1px solid #818CF8",borderRadius:10,padding:"7px 10px",display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:13}}>⚡</span><div><div style={{fontWeight:800,fontSize:14,color:"#818CF8",lineHeight:1}}>+{moStats.overtime}h</div><div style={{fontSize:8,color:"#818CF880"}}>extra</div></div>
        </div>}
        <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
          <div style={{display:"flex",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:3}}>
            {[{id:"month",label:"Mes"},{id:"week",label:"Semana"}].map(item => (
              <button key={item.id} onClick={()=>setViewMode(item.id)} style={{background:viewMode===item.id?"#6366F1":"transparent",border:"none",color:viewMode===item.id?"white":T.dim,padding:"5px 8px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={moveToday} title="Ir a hoy" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:11,color:T.sub,fontWeight:700}}>Hoy</button>
          <button onClick={()=>setModal("patterns")} title="Patrón automático" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:12,color:T.sub,display:"flex",alignItems:"center",gap:2}}>🔄{!isPro&&<span style={{fontSize:7,color:"#818CF8",fontWeight:700}}>PRO</span>}</button>
          <button onClick={exportPDF} title="Exportar PDF" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:12,color:T.sub,display:"flex",alignItems:"center",gap:2}}>📄{!isPro&&<span style={{fontSize:7,color:"#818CF8",fontWeight:700}}>PRO</span>}</button>
          <button onClick={()=>setModal("shiftCfg")} title="Config horas" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:12,color:T.sub}}>⚙️</button>
        </div>
      </div>

      {paint.on && <div style={{margin:"0 12px 8px",padding:"7px 12px",background:"#1E1B4B",border:"1px solid #4338CA",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13}}>✏️</span>
        <span style={{fontSize:11,color:"#A5B4FC",fontWeight:700}}>Pintando: {allShifts.find(s=>s.id===paint.sid)?.label}</span>
        <span style={{fontSize:10,color:"#6366F160",marginLeft:4}}>Vuelve a pulsar para salir</span>
      </div>}

      {/* Botones de turno (pintura) */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,padding:"0 12px 10px"}}>
        {paintCards.map(c => { const active=paint.on&&paint.sid===c.sid; return (
          <button key={c.sid} onClick={()=>togglePaint(c.sid)} style={{background:active?c.bg:T.card,border:`2px solid ${active?c.color:T.border}`,borderRadius:12,padding:"9px 3px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,boxShadow:active?`0 0 14px ${c.color}50`:"none",transition:"all 0.15s",outline:"none"}}>
            <span style={{fontSize:17}}>{c.icon}</span>
            <span style={{fontSize:8,color:active?c.color:T.dim,fontWeight:active?800:500,lineHeight:1.1,textAlign:"center"}}>{c.label}</span>
            <span style={{fontSize:13,fontWeight:800,color:active?c.color:T.faint,lineHeight:1}}>{c.val}</span>
          </button>
        ); })}
      </div>

      {viewMode==="month" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 10px",marginBottom:3}}>
            {["L","M","X","J","V","S","D"].map((d,i) => <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:i>=5?"#F472B6":T.faint,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,padding:"0 10px"}} {...calSwipe}>
            {cells.map((day, idx) => day ? renderDayCell(new Date(yr, mo, day), idx) : <div key={`e${idx}`}/>)}
          </div>
        </>
      )}

      {viewMode==="week" && (
        <div style={{padding:"0 10px"}} {...calSwipe}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weekDays.map((dateObj, idx) => renderDayCell(dateObj, idx))}
          </div>
        </div>
      )}

      {showHols && <div style={{padding:"10px 14px 0",display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:10,height:10,borderRadius:2,border:"1px solid #F87171",background:"#450A0A20",flexShrink:0}}/>
        <span style={{fontSize:10,color:T.faint}}>Festivos nacionales · desactivar en Ajustes</span>
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DAY MODAL (seguridad: sanitización + no stale closure)
// ─────────────────────────────────────────────────────────────
function DayModal({dayKey, shifts, evs, notes, updateCal, calIdx, onClose, allShifts, T, toast}) {
  const [localNote,  setLocalNote]  = useState(notes[dayKey] || "");
  const [dayEvs,     setDayEvs]     = useState(evs[dayKey]   || []);
  const [editEvType, setEditEvType] = useState(null);

  // Swipe abajo en la barra → cerrar
  const swipe = useSwipe({ onDown: onClose, threshold:60, vertThreshold:80 });

  const pts = dayKey.split("-");
  const displayDate = `${pts[2]} de ${MONTHS[parseInt(pts[1])-1]} de ${pts[0]}`;
  const curShift = allShifts.find(s => s.id === shifts[dayKey]);
  const holiday  = HOLIDAYS[dayKey];

  const persist = (patch) => updateCal(calIdx, patch);

  const selectShift = async (sid) => {
    if (sid && !allShifts.find(s => s.id === sid)) return; // Validar sid
    let u;
    if (!sid || shifts[dayKey] === sid) { u = { ...shifts }; delete u[dayKey]; }
    else u = { ...shifts, [dayKey]: sid };
    await persist({ shifts: u });
  };

  const saveNote = async () => {
    const clean = sanitize(localNote, MAX_NOTE_LEN);
    const n = { ...notes, [dayKey]: clean };
    await persist({ notes: n });
    toast("✅ Nota guardada");
  };

  const toggleEv = async (etId) => {
    if (!EVENTS.find(e => e.id === etId)) return; // Validar id de evento
    const exists = dayEvs.find(e => e.type === etId);
    let upd;
    if (exists) { upd = dayEvs.filter(e => e.type !== etId); if (editEvType === etId) setEditEvType(null); }
    else { upd = [...dayEvs, {type:etId,note:"",time:"",endTime:"",allDay:true,advance:"1d"}]; setEditEvType(etId); }
    setDayEvs(upd);
    await persist({ evs: { ...evs, [dayKey]: upd } });
  };

  const updateEv = async (etId, field, val) => {
    const safe = typeof val === "string" ? sanitize(val, field==="note"?MAX_NOTE_LEN:10) : !!val;
    const upd = dayEvs.map(e => e.type === etId ? { ...e, [field]: safe } : e);
    setDayEvs(upd);
    await persist({ evs: { ...evs, [dayKey]: upd } });
  };

  const isActive = (etId) => !!dayEvs.find(e => e.type === etId);
  const getEv    = (etId) => dayEvs.find(e => e.type === etId) || {};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"16px 16px 40px",border:`1px solid ${T.border}`,borderBottom:"none",maxHeight:"90vh",overflowY:"auto"}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 10px",cursor:"grab"}}>
          <div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/>
        </div>
        <div style={{fontWeight:800,fontSize:15,marginBottom:2,color:T.text}}>{displayDate}</div>
        {holiday && <div style={{fontSize:11,color:"#F87171",marginBottom:6}}>🔴 Festivo: {holiday}</div>}
        {curShift && <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10,color:curShift.color,fontSize:12,fontWeight:600}}><span>{curShift.icon}</span><span>{curShift.label}</span></div>}

        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:7}}>TURNO DEL DÍA</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:14}}>
          {allShifts.map(s => (
            <button key={s.id} onClick={()=>selectShift(s.id)} style={{background:shifts[dayKey]===s.id?s.bg:T.card,border:`2px solid ${shifts[dayKey]===s.id?s.color:T.border}`,borderRadius:10,padding:"9px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.15s"}}>
              <span style={{fontSize:16}}>{s.icon}</span>
              <span style={{fontSize:8,color:s.color,fontWeight:700}}>{s.label}</span>
            </button>
          ))}
          <button onClick={()=>selectShift(null)} style={{background:T.card,border:`2px solid ${T.border}`,borderRadius:10,padding:"9px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:16}}>🗑️</span>
            <span style={{fontSize:8,color:T.faint,fontWeight:700}}>Borrar</span>
          </button>
        </div>

        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:7}}>EVENTOS Y RECORDATORIOS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:10}}>
          {EVENTS.map(et => { const active = isActive(et.id); return (
            <button key={et.id} onClick={()=>{ toggleEv(et.id); if(!active)setEditEvType(et.id); else if(editEvType===et.id)setEditEvType(null); }} style={{background:active?`${et.color}25`:T.card,border:`2px solid ${active?et.color:T.border}`,borderRadius:10,padding:"9px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.15s"}}>
              <span style={{fontSize:16}}>{et.icon}</span>
              <span style={{fontSize:8,color:active?et.color:T.dim,fontWeight:active?700:400}}>{et.label}</span>
            </button>
          ); })}
        </div>

        {editEvType && isActive(editEvType) && (() => {
          const et = EVENTS.find(e=>e.id===editEvType), ev = getEv(editEvType);
          return (
            <div style={{background:T.card,border:`1px solid ${et.color}50`,borderRadius:12,padding:"12px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontSize:16}}>{et.icon}</span>
                <span style={{fontWeight:700,fontSize:13,color:et.color}}>{et.label}</span>
              </div>
              <textarea value={ev.note||""} onChange={e=>updateEv(editEvType,"note",e.target.value)} placeholder="Nota o descripción…" maxLength={MAX_NOTE_LEN} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,resize:"none",height:50,marginBottom:8,boxSizing:"border-box",outline:"none"}}/>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:T.dim,marginBottom:3}}>Inicio</div>
                  <input type="time" value={ev.time||""} onChange={e=>updateEv(editEvType,"time",e.target.value)} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,padding:"7px",fontSize:12,boxSizing:"border-box",outline:"none"}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:T.dim,marginBottom:3}}>Fin</div>
                  <div style={{display:"flex",gap:4}}>
                    <input type="time" value={ev.endTime||""} onChange={e=>updateEv(editEvType,"endTime",e.target.value)} disabled={ev.allDay} style={{flex:1,background:ev.allDay?T.border:T.header,border:`1px solid ${T.border}`,borderRadius:8,color:ev.allDay?T.faint:T.text,padding:"7px 5px",fontSize:11,boxSizing:"border-box",outline:"none"}}/>
                    <button onClick={()=>updateEv(editEvType,"allDay",!ev.allDay)} style={{background:ev.allDay?"#6366F1":T.card,border:"none",borderRadius:6,padding:"7px 5px",cursor:"pointer",color:"white",fontSize:9,fontWeight:700}}>24h</button>
                  </div>
                </div>
              </div>
              <div style={{fontSize:9,color:T.dim,marginBottom:4}}>⏰ Avisarme con antelación</div>
              <div style={{display:"flex",gap:4}}>
                {ADVANCE.map(a => <button key={a.id} onClick={()=>updateEv(editEvType,"advance",a.id)} style={{flex:1,background:ev.advance===a.id?"#6366F1":T.header,border:`1px solid ${ev.advance===a.id?"#6366F1":T.border}`,borderRadius:7,padding:"5px 2px",cursor:"pointer",color:ev.advance===a.id?"white":T.dim,fontSize:9,fontWeight:600}}>{a.label}</button>)}
              </div>
            </div>
          );
        })()}

        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:7}}>NOTA GENERAL</div>
        <textarea value={localNote} onChange={e=>setLocalNote(e.target.value)} placeholder="Apuntes para este día…" maxLength={MAX_NOTE_LEN} style={{width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,color:T.text,padding:"10px 12px",fontSize:13,resize:"none",height:60,marginBottom:8,boxSizing:"border-box",outline:"none"}}/>
        <button onClick={saveNote} style={{width:"100%",background:T.card,border:`1px solid ${T.border2}`,color:T.sub,padding:"10px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600}}>Guardar nota</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────
function StatsTab({yr,mo,moStats,calcMonthStats,calcAnnualStats,contractH,setContractH,dayBanks,setDayBanks,annualUsed,sSave,isPro,needsPro,setModal,T,exportPDF,calName}) {
  const [annual,setAnnual]=useState(false);
  const [editContract,setEditContract]=useState(false);
  const [editBanks,setEditBanks]=useState(false);
  const [tempH,setTempH]=useState(contractH);
  const [tempBanks,setTempBanks]=useState({...dayBanks});
  const annStats = isPro ? calcAnnualStats() : null;
  const months12 = Array.from({length:12},(_,m) => ({label:MONTHS_S[m],hours:calcMonthStats(yr,m).h}));
  const maxH  = Math.max(...months12.map(m=>m.hours), 1);
  const stats = annual && annStats ? annStats : moStats;

  const saveContract = async () => {
    const h = sanitizeNum(tempH, 0, MAX_HOURS_MONTH);
    setContractH(h); await sSave("ch10",h); setEditContract(false);
  };
  const saveBanks = async () => {
    const b = {
      vacation: sanitizeNum(tempBanks.vacation, 0, 365),
      personal: sanitizeNum(tempBanks.personal, 0, 365),
      comp:     sanitizeNum(tempBanks.comp,     0, 365),
    };
    setDayBanks(b); await sSave("db10",b); setEditBanks(false);
  };

  const bankItems = [
    {sid:"vacation",label:"Vacaciones",icon:"🏖️",color:"#F472B6",used:annualUsed.vacation,total:dayBanks.vacation},
    {sid:"personal",label:"Asuntos propios",icon:"🧑‍💼",color:"#67E8F9",used:annualUsed.personal,total:dayBanks.personal},
    {sid:"comp",label:"Compensaciones",icon:"🔁",color:"#86EFAC",used:annualUsed.comp,total:dayBanks.comp},
  ];

  return (
    <div style={{padding:"16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:T.text}}>📊 Estadísticas</div>
          <div style={{color:T.dim,fontSize:12}}>{MONTHS[mo]} {yr}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{if(!needsPro("resumen anual"))return;setModal("annualSummary");}} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:11,color:T.sub,display:"flex",alignItems:"center",gap:3}}>✨ {yr}{!isPro&&<span style={{fontSize:8,color:"#818CF8",fontWeight:700}}>PRO</span>}</button>
          <button onClick={exportPDF} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:11,color:T.sub,display:"flex",alignItems:"center",gap:3}}>📄{!isPro&&<span style={{fontSize:8,color:"#818CF8",fontWeight:700}}>PRO</span>}</button>
        </div>
      </div>

      {/* Toggle mensual/anual */}
      <div style={{display:"flex",background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:4,marginBottom:14}}>
        {["Mensual","Anual"].map(t => (
          <button key={t} onClick={()=>{if(t==="Anual"&&!needsPro("balance anual"))return;setAnnual(t==="Anual");}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,background:((t==="Mensual"&&!annual)||(t==="Anual"&&annual))?"#6366F1":"transparent",color:((t==="Mensual"&&!annual)||(t==="Anual"&&annual))?"white":T.dim}}>
            {t}{t==="Anual"&&!isPro&&" 🔒"}
          </button>
        ))}
      </div>

      {/* Horas extra */}
      <div style={{background:stats.overtime>0?"#431407":T.card,border:`1px solid ${stats.overtime>0?"#FB923C":T.border}`,borderRadius:14,padding:"14px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>⚡</span><span style={{fontWeight:700,fontSize:14,color:T.text}}>Horas extra</span></div>
          <button onClick={()=>setEditContract(!editContract)} style={{background:T.card,border:`1px solid ${T.border2}`,color:T.sub,fontSize:11,padding:"4px 8px",borderRadius:8,cursor:"pointer"}}>Contrato: {contractH}h/mes</button>
        </div>
        {editContract && <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input type="number" min="0" max={MAX_HOURS_MONTH} value={tempH} onChange={e=>setTempH(e.target.value)} style={{flex:1,background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"8px",fontSize:13,outline:"none"}} placeholder="Horas/mes"/>
          <button onClick={saveContract} style={{background:"#6366F1",border:"none",color:"white",padding:"8px 14px",borderRadius:8,cursor:"pointer",fontWeight:700}}>OK</button>
        </div>}
        <div style={{display:"flex",gap:12}}>
          <div><div style={{fontSize:22,fontWeight:800,color:T.text}}>{stats.h}h</div><div style={{fontSize:10,color:T.dim}}>trabajadas</div></div>
          <div style={{color:T.border2,fontSize:20,alignSelf:"center"}}>vs</div>
          <div><div style={{fontSize:22,fontWeight:800,color:T.faint}}>{annual?contractH*12:contractH}h</div><div style={{fontSize:10,color:T.dim}}>contrato</div></div>
          {stats.overtime>0&&<div style={{marginLeft:"auto"}}><div style={{fontSize:22,fontWeight:800,color:"#FB923C"}}>+{stats.overtime}h</div><div style={{fontSize:10,color:"#FB923C"}}>extra 🔥</div></div>}
          {stats.overtime===0&&stats.h>0&&<div style={{marginLeft:"auto"}}><div style={{fontSize:22,fontWeight:800,color:"#34D399"}}>✓</div><div style={{fontSize:10,color:"#34D399"}}>en regla</div></div>}
        </div>
      </div>

      {/* Grid stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {i:"📅",l:"Días trabajados",v:stats.worked,c:"#34D399"},
          {i:"☀️",l:"Mañanas",v:stats.mornings,c:"#F59E0B"},
          {i:"🌤️",l:"Tardes",v:stats.afternoons,c:"#38BDF8"},
          {i:"🌙",l:"Noches",v:stats.nights,c:"#A78BFA"},
          {i:"😴",l:"Descansos",v:stats.rests,c:"#34D399"},
          {i:"📆",l:"Fines trabaj.",v:stats.weekends,c:"#F87171"},
          {i:"🗓️",l:"Festivos trab.",v:stats.holidaysWorked,c:"#F87171"},
          {i:"🤒",l:"Bajas",v:stats.sick,c:"#F87171"},
        ].map(s => (
          <div key={s.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
              <span style={{fontSize:14}}>{s.i}</span><span style={{fontSize:10,color:T.dim}}>{s.l}</span>
            </div>
            <div style={{fontWeight:800,fontSize:24,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Bolsa de días */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:14,color:T.text}}>📋 Bolsa de días — {yr}</div>
          <button onClick={()=>setEditBanks(!editBanks)} style={{background:T.header,border:`1px solid ${T.border2}`,color:T.sub,fontSize:11,padding:"4px 8px",borderRadius:8,cursor:"pointer"}}>{editBanks?"Cerrar":"Configurar"}</button>
        </div>
        {editBanks && <div style={{marginBottom:12,background:T.header,borderRadius:10,padding:"10px",display:"flex",flexDirection:"column",gap:8}}>
          {[{k:"vacation",l:"Vacaciones/año"},{k:"personal",l:"Asuntos propios/año"},{k:"comp",l:"Compensaciones/año"}].map(b => (
            <div key={b.k} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,color:T.sub,flex:1}}>{b.l}</span>
              <input type="number" min="0" max="365" value={tempBanks[b.k]} onChange={e=>setTempBanks(p=>({...p,[b.k]:parseInt(e.target.value)||0}))} style={{width:60,background:T.card,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"6px 8px",fontSize:13,outline:"none",textAlign:"center"}}/>
            </div>
          ))}
          <button onClick={saveBanks} style={{background:"#6366F1",border:"none",color:"white",padding:"8px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>Guardar</button>
        </div>}
        {bankItems.map(b => {
          const pct = b.total>0 ? Math.min((b.used/b.total)*100,100) : 0;
          const remaining = Math.max(b.total-b.used, 0);
          const over = b.used > b.total;
          return (
            <div key={b.sid} style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:13}}>{b.icon}</span><span style={{fontSize:12,fontWeight:600,color:T.sub}}>{b.label}</span></div>
                <div style={{fontSize:12,fontWeight:800,color:over?"#F87171":remaining===0?"#F59E0B":b.color}}>{b.used}/{b.total}{over&&" ⚠️"}</div>
              </div>
              <div style={{background:T.border,borderRadius:6,height:6,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:6,background:over?"#F87171":b.color,width:`${pct}%`,transition:"width 0.4s"}}/>
              </div>
              <div style={{fontSize:10,color:T.faint,marginTop:2}}>
                {remaining>0?`Quedan ${remaining} días`:over?`${b.used-b.total} días por encima`:"Sin días restantes"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfica de barras (solo PRO) */}
      {isPro && <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:T.sub}}>Horas por mes — {yr}</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
          {months12.map((m,i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              {m.hours>0&&<div style={{fontSize:7,color:"#6366F1",fontWeight:700}}>{m.hours}</div>}
              <div style={{width:"100%",background:"linear-gradient(to top,#6366F1,#818CF8)",borderRadius:"2px 2px 0 0",height:`${(m.hours/maxH)*60}px`,minHeight:m.hours?3:0}}/>
              <div style={{fontSize:7,color:T.faint}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>}

      {/* Botones acción */}
      {[
        {i:"📆",l:"Google Calendar",sub:"Exportar o sincronizar turnos",action:()=>setModal("gcal")},
        {i:"👫",l:"Compartir calendario",sub:"Solo lectura para pareja o familia",action:()=>setModal("share")},
      ].map(item => (
        <button key={item.l} onClick={item.action} style={{width:"100%",background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8}}>
          <span style={{fontSize:20}}>{item.i}</span>
          <div style={{textAlign:"left",flex:1}}>
            <div style={{fontWeight:700,fontSize:13,color:T.text}}>{item.l}</div>
            <div style={{fontSize:11,color:T.dim}}>{item.sub}</div>
          </div>
          {!isPro&&<span style={{background:"#1E2456",color:"#818CF8",fontSize:10,padding:"2px 6px",borderRadius:8,fontWeight:700}}>PRO</span>}
          <span style={{color:T.faint}}>›</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ANNUAL SUMMARY (estilo Wrapped)
// ─────────────────────────────────────────────────────────────
function AnnualSummaryModal({onClose,yr,calcAnnualStats,calcMonthStats,isPro,needsPro,T,calName}) {
  if (!isPro) { needsPro("resumen anual"); onClose(); return null; }
  const stats = calcAnnualStats();
  const months12 = Array.from({length:12},(_,m) => ({label:MONTHS_S[m],h:calcMonthStats(yr,m).h}));
  const bestMonth = months12.reduce((a,b) => b.h>a.h?b:a, months12[0]);
  const cards = [
    {emoji:"⏱",label:"Horas trabajadas en "+yr,value:stats.h+"h",sub:"Equivale a "+Math.round(stats.h/8)+" jornadas completas",bg:"#1E1B4B",accent:"#818CF8"},
    {emoji:"🌙",label:"Noches trabajadas",value:stats.nights,sub:stats.nights>0?"Cada noche cuenta — muy bien hecho":"Sin noches este año 🎉",bg:"#3B0764",accent:"#A78BFA"},
    {emoji:"📆",label:"Fines de semana trabajados",value:stats.weekends,sub:stats.weekends>0?`Te perdiste ${stats.weekends} fines de semana`:"¡Todos los fines de semana libres! 🥳",bg:"#450A0A",accent:"#F87171"},
    {emoji:"🏖️",label:"Días de vacaciones disfrutados",value:stats.vacations,sub:"Descanso bien merecido",bg:"#500724",accent:"#F472B6"},
    {emoji:"⚡",label:"Horas extra acumuladas",value:stats.overtime>0?"+"+stats.overtime+"h":"Sin horas extra",sub:stats.overtime>0?"Recuerda reclamarlas 💪":"Año equilibrado ✓",bg:"#431407",accent:"#FB923C"},
    {emoji:"📊",label:"Tu mes más intenso",value:bestMonth.label,sub:bestMonth.h+"h — pico del año",bg:"#064E3B",accent:"#34D399"},
  ];
  const swipe = useSwipe({ onDown: onClose });
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:150,overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{minHeight:"100vh",padding:"20px 16px 60px",maxWidth:430,margin:"0 auto"}} {...swipe}>
        <div style={{textAlign:"center",padding:"24px 0 20px"}}>
          <div style={{fontSize:40,marginBottom:8}}>✨</div>
          <div style={{fontWeight:800,fontSize:18,color:"white",marginBottom:2}}>{sanitize(calName)}</div>
          <div style={{fontWeight:900,fontSize:34,background:"linear-gradient(135deg,#6366F1,#A78BFA,#F472B6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>Tu año {yr}</div>
          <div style={{color:"#475569",fontSize:12}}>desliza hacia abajo para cerrar</div>
        </div>
        {cards.map((c,i) => (
          <div key={i} style={{background:`linear-gradient(135deg,${c.bg},${c.bg}CC)`,border:`1px solid ${c.accent}40`,borderRadius:20,padding:"24px",marginBottom:14}}>
            <div style={{fontSize:36,marginBottom:8}}>{c.emoji}</div>
            <div style={{fontSize:12,color:c.accent,fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{c.label}</div>
            <div style={{fontSize:40,fontWeight:900,color:"white",lineHeight:1,marginBottom:6}}>{c.value}</div>
            <div style={{fontSize:13,color:"#94A3B8"}}>{c.sub}</div>
          </div>
        ))}
        <div style={{background:"#111827",border:"1px solid #1E293B",borderRadius:20,padding:"20px",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"white",marginBottom:14}}>📈 Evolución mensual {yr}</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80}}>
            {months12.map((m,i) => {
              const mxH = Math.max(...months12.map(x=>x.h), 1);
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  {m.h>0&&<div style={{fontSize:7,color:"#6366F1",fontWeight:700}}>{m.h}</div>}
                  <div style={{width:"100%",background:"linear-gradient(to top,#6366F1,#A78BFA)",borderRadius:"3px 3px 0 0",height:`${(m.h/mxH)*60}px`,minHeight:m.h?3:0}}/>
                  <div style={{fontSize:7,color:"#475569"}}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={onClose} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"14px",borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:15}}>Cerrar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPANY TAB  (máx 30 empleados, cambios de turno)
// ─────────────────────────────────────────────────────────────
function CompanyTab({company,setCompany,plan,needsPro,sSave,toast,T}) {
  const [members,   setMembers]   = useState(company?.members || []);
  const [swaps,     setSwaps]     = useState(company?.swaps   || []);
  const [groups,    setGroups]    = useState(company?.groups  || []);
  const [history,   setHistory]   = useState(company?.history || []);
  const [newMember, setNewMember] = useState("");
  const [newRole,   setNewRole]   = useState("");
  const [joinCode,  setJoinCode]  = useState("");
  const [view,      setView]      = useState("boss");
  const [swapFrom,  setSwapFrom]  = useState("");
  const [swapTo,    setSwapTo]    = useState("");
  const [swapNote,  setSwapNote]  = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupPeople, setGroupPeople] = useState("");

  useEffect(() => { setMembers(company?.members || []); }, [company?.members]);
  useEffect(() => { setSwaps(company?.swaps || []); }, [company?.swaps]);
  useEffect(() => { setGroups(company?.groups || []); }, [company?.groups]);
  useEffect(() => { setHistory(company?.history || []); }, [company?.history]);
  useEffect(() => {
    if (plan !== "business") return;
    const normalized = normalizeCompany(company || { name:"Mi Empresa" });
    const needsHydration = !company || company.code !== normalized.code || !Array.isArray(company.members) || !Array.isArray(company.swaps) || !Array.isArray(company.groups) || !Array.isArray(company.history);
    if (!needsHydration) return;
    setCompany(normalized);
    sSave("co10", normalized);
  }, [company, plan, setCompany, sSave]);

  if (plan !== "business") return (
    <div style={{padding:"16px"}}>
      <div style={{fontWeight:800,fontSize:18,marginBottom:4,color:T.text}}>🏢 Plan Empresa</div>
      <div style={{color:T.dim,fontSize:13,marginBottom:14}}>Gestiona los turnos de todo tu equipo</div>
      {[
        {i:"👑",t:"El jefe genera un código",d:"Crea la empresa y comparte el código (ej: TUR-X7K2) con tu equipo"},
        {i:"📲",t:"Empleados se unen sin registro",d:"Introducen el código y reciben su calendario automáticamente"},
        {i:"🔄",t:"Cambios de turno",d:"Los empleados solicitan cambios y el jefe los aprueba o rechaza con un toque"},
        {i:"📊",t:"Balance del equipo",d:"Horas, noches y festivos por empleado"},
        {i:"📤",t:"Exportar cuadrante PDF",d:"Cuadrante mensual para imprimir o compartir"},
      ].map(f => (
        <div key={f.t} style={{display:"flex",gap:10,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",marginBottom:8}}>
          <span style={{fontSize:20}}>{f.i}</span>
          <div><div style={{fontWeight:700,fontSize:13,marginBottom:2,color:T.text}}>{f.t}</div><div style={{color:T.dim,fontSize:11}}>{f.d}</div></div>
        </div>
      ))}
      <div style={{background:"linear-gradient(135deg,#1E1B4B,#312E81)",border:"1px solid #4338CA",borderRadius:16,padding:"20px",marginTop:8,textAlign:"center"}}>
        <div style={{fontWeight:800,fontSize:20,marginBottom:2,color:"white"}}>9,99€ / mes</div>
        <div style={{color:"#A5B4FC",fontSize:12,marginBottom:2}}>Hasta {MAX_EMPLOYEES} empleados</div>
        <div style={{color:"#6366F180",fontSize:11,marginBottom:14}}>Empleados siempre gratis ✓</div>
        <button onClick={()=>needsPro("plan empresa")} style={{background:"linear-gradient(135deg,#6366F1,#818CF8)",border:"none",color:"white",padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:14,width:"100%"}}>Empezar 14 días gratis</button>
      </div>
    </div>
  );

  const addMember = async () => {
    const name = sanitize(newMember, MAX_NAME_LEN);
    const role = sanitize(newRole, 24) || "Empleado";
    if (!name) { toast("⚠️ Introduce un nombre"); return; }
    if (members.length >= MAX_EMPLOYEES) { toast(`⚠️ Límite de ${MAX_EMPLOYEES} empleados alcanzado`); return; }
    if (members.some(member => member.name.toLowerCase() === name.toLowerCase())) { toast("⚠️ Ese empleado ya existe"); return; }
    const m = [...members, {name, role, shift:null}];
    setMembers(m); setNewMember(""); setNewRole("");
    const nextHistory = [{ id:genId(), type:"member", text:`Añadido ${name}${role && role !== "Empleado" ? ` (${role})` : ""} al equipo`, date:new Date().toLocaleDateString("es") }, ...history].slice(0, 60);
    setHistory(nextHistory);
    const c = {...company, members:m, history:nextHistory}; setCompany(c); await sSave("co10", c);
  };

  const approveSwap = async (i, ok) => {
    const upd = swaps.filter((_,idx)=>idx!==i);
    setSwaps(upd);
    const req = swaps[i];
    const nextHistory = [{ id:genId(), type:"swap", text:`${ok?"Aprobado":"Rechazado"} cambio ${req?.from || ""} ↔ ${req?.to || ""}`, date:new Date().toLocaleDateString("es") }, ...history].slice(0, 60);
    setHistory(nextHistory);
    const c = {...company, swaps:upd, history:nextHistory}; setCompany(c); await sSave("co10", c);
    toast(ok ? "✅ Cambio aprobado" : "✕ Cambio rechazado");
  };

  const requestSwap = async () => {
    const f = sanitize(swapFrom, MAX_NAME_LEN), t2 = sanitize(swapTo, MAX_NAME_LEN);
    if (!f || !t2) { toast("⚠️ Rellena ambos campos"); return; }
    if (f.toLowerCase() === t2.toLowerCase()) { toast("⚠️ El cambio debe ser entre dos personas distintas"); return; }
    const req = {id:genId(), from:f, to:t2, date:new Date().toLocaleDateString("es"), status:"pending", note:sanitize(swapNote, 120), group:""};
    const upd = [...swaps, req]; setSwaps(upd);
    const nextHistory = [{ id:genId(), type:"swap", text:`Solicitud de cambio ${f} ↔ ${t2}`, date:new Date().toLocaleDateString("es") }, ...history].slice(0, 60);
    setHistory(nextHistory);
    const c = {...company, swaps:upd, history:nextHistory}; setCompany(c); await sSave("co10", c);
    toast("📤 Solicitud enviada al jefe"); setSwapFrom(""); setSwapTo(""); setSwapNote("");
  };

  const addGroup = async () => {
    const name = sanitize(groupName, MAX_NAME_LEN);
    const picked = groupPeople.split(",").map(p => sanitize(p, MAX_NAME_LEN)).filter(Boolean);
    if (!name) { toast("⚠️ Pon nombre al grupo"); return; }
    if (groups.length >= MAX_GROUPS) { toast(`⚠️ Límite de ${MAX_GROUPS} grupos alcanzado`); return; }
    const validMembers = picked.filter(memberName => members.some(member => member.name.toLowerCase() === memberName.toLowerCase()));
    const nextGroups = [...groups, { id:genId(), name, members:validMembers }];
    setGroups(nextGroups);
    setGroupName("");
    setGroupPeople("");
    const nextHistory = [{ id:genId(), type:"group", text:`Creado grupo ${name}${validMembers.length?` (${validMembers.length} miembros)`:""}`, date:new Date().toLocaleDateString("es") }, ...history].slice(0, 60);
    setHistory(nextHistory);
    const c = {...company, groups:nextGroups, history:nextHistory}; setCompany(c); await sSave("co10", c);
    toast("✅ Grupo creado");
  };

  const copyInviteCode = async () => {
    const code = company?.code || "";
    if (!code) { toast("⚠️ Aún no hay código de empresa"); return; }
    try {
      await navigator.clipboard.writeText(code);
      toast("📋 Código copiado");
    } catch {
      toast("Copia el código manualmente");
    }
  };

  return (
    <div style={{padding:"16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:T.text}}>{sanitize(company?.name||"Mi Empresa")}</div>
          <div style={{color:T.dim,fontSize:12}}>{members.length}/{MAX_EMPLOYEES} empleados</div>
        </div>
        <button onClick={()=>toast("📤 Exportando cuadrante...")} style={{background:T.card,border:`1px solid ${T.border2}`,color:T.sub,padding:"8px 12px",borderRadius:10,cursor:"pointer",fontSize:12}}>📤 PDF</button>
      </div>

      {/* Código de invitación */}
      <div style={{background:"#1E1B4B",border:"1px solid #4338CA",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontSize:11,color:"#A5B4FC",marginBottom:6}}>📲 Código de invitación para empleados</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontWeight:800,fontSize:22,letterSpacing:3,color:"white",fontFamily:"monospace"}}>{company?.code || "TUR-...."}</span>
          <button onClick={copyInviteCode} style={{background:"#6366F1",border:"none",color:"white",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>Copiar</button>
        </div>
        <div style={{fontSize:10,color:"#6366F180",marginTop:4}}>Válido para hasta {MAX_EMPLOYEES} empleados</div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:3,marginBottom:12}}>
        {[{id:"boss",l:"Panel jefe"},{id:"swap",l:"Cambios"},{id:"groups",l:"Grupos"},{id:"history",l:"Historial"},{id:"worker",l:"Unirse"}].map(v => (
          <button key={v.id} onClick={()=>setView(v.id)} style={{flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:11,background:view===v.id?"#6366F1":"transparent",color:view===v.id?"white":T.dim}}>{v.l}</button>
        ))}
      </div>

      {view==="boss" && <>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",marginBottom:12}}>
          {members.length===0 && <div style={{padding:"20px",textAlign:"center",color:T.faint,fontSize:13}}>Sin empleados aún. Añade el primero abajo.</div>}
          {members.map((m,i) => { const sh=BASE_SHIFTS.find(s=>s.id===m.shift); return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:i<members.length-1?`1px solid ${T.border}`:"none"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"#1E293B",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#818CF8"}}>{m.name.charAt(0).toUpperCase()}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:T.text}}>{m.name}</div><div style={{color:T.dim,fontSize:11}}>{m.role}</div></div>
              {sh ? <div style={{background:sh.bg,border:`1px solid ${sh.color}`,padding:"3px 8px",borderRadius:16,display:"flex",gap:3,alignItems:"center"}}><span style={{fontSize:10}}>{sh.icon}</span><span style={{fontSize:10,color:sh.color,fontWeight:700}}>{sh.label}</span></div>
                  : <div style={{background:T.border,padding:"3px 8px",borderRadius:16}}><span style={{fontSize:10,color:T.faint}}>Sin turno</span></div>}
            </div>
          ); })}
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1,display:"grid",gap:8}}>
            <input value={newMember} onChange={e=>setNewMember(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMember()} placeholder="Nombre del empleado" maxLength={MAX_NAME_LEN} style={{width:"100%",background:T.card,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"10px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            <input value={newRole} onChange={e=>setNewRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMember()} placeholder="Rol o área (opcional)" maxLength={24} style={{width:"100%",background:T.card,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"10px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <button onClick={addMember} style={{background:"#6366F1",border:"none",color:"white",padding:"10px 16px",borderRadius:10,cursor:"pointer",fontWeight:700}}>+</button>
        </div>
      </>}

      {view==="swap" && <div>
        {swaps.length===0 && <div style={{textAlign:"center",color:T.faint,fontSize:13,padding:"16px 0"}}>Sin solicitudes de cambio pendientes</div>}
        {swaps.map((req,i) => (
          <div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text}}>{req.from} ↔ {req.to}</div>
              <div style={{fontSize:11,color:T.dim}}>{req.date}</div>
            </div>
            <button onClick={()=>approveSwap(i,true)}  style={{background:"#064E3B",border:"1px solid #34D399",color:"#34D399",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>✓</button>
            <button onClick={()=>approveSwap(i,false)} style={{background:"#450A0A",border:"1px solid #F87171",color:"#F87171",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>
          </div>
        ))}
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",marginTop:8}}>
          <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:8}}>Solicitar cambio de turno</div>
          <input value={swapFrom} onChange={e=>setSwapFrom(e.target.value)} placeholder="Tu nombre" maxLength={MAX_NAME_LEN} style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"9px",fontSize:13,marginBottom:6,boxSizing:"border-box",outline:"none"}}/>
          <input value={swapTo} onChange={e=>setSwapTo(e.target.value)} placeholder="Compañero con quien cambias" maxLength={MAX_NAME_LEN} style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"9px",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
          <input value={swapNote} onChange={e=>setSwapNote(e.target.value)} placeholder="Nota opcional" maxLength={120} style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"9px",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
          <button onClick={requestSwap} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14}}>Enviar solicitud al jefe</button>
        </div>
      </div>}

      {view==="groups" && <div>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:8}}>Crear grupo de trabajo</div>
          <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Nombre del grupo" maxLength={MAX_NAME_LEN} style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"9px",fontSize:13,marginBottom:6,boxSizing:"border-box",outline:"none"}}/>
          <input value={groupPeople} onChange={e=>setGroupPeople(e.target.value)} placeholder="Miembros separados por coma" style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:8,color:T.text,padding:"9px",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
          <button onClick={addGroup} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14}}>Guardar grupo</button>
        </div>
        {groups.length===0 && <div style={{textAlign:"center",color:T.faint,fontSize:13,padding:"16px 0"}}>Aún no hay grupos creados</div>}
        {groups.map(group => (
          <div key={group.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>{group.name}</div>
            <div style={{fontSize:11,color:T.dim}}>{group.members.length ? group.members.join(", ") : "Sin miembros asignados todavía"}</div>
          </div>
        ))}
      </div>}

      {view==="history" && <div>
        {history.length===0 && <div style={{textAlign:"center",color:T.faint,fontSize:13,padding:"16px 0"}}>Todavía no hay actividad registrada</div>}
        {history.map(item => (
          <div key={item.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>{item.text}</div>
            <div style={{fontSize:11,color:T.dim}}>{item.date}</div>
          </div>
        ))}
      </div>}

      {view==="worker" && <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px"}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4,color:T.text}}>Unirte a una empresa</div>
        <div style={{color:T.dim,fontSize:12,marginBottom:12}}>Introduce el código que te ha dado tu responsable (formato TUR-XXXX)</div>
        <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,8))} placeholder="TUR-XXXX" style={{width:"100%",background:T.header,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"12px",fontSize:16,fontFamily:"monospace",letterSpacing:2,marginBottom:10,boxSizing:"border-box",outline:"none",textAlign:"center"}}/>
        <button onClick={()=>{
          if (!JOIN_CODE_REGEX.test(joinCode)) { toast("⚠️ El código debe tener formato TUR-XXXX"); return; }
          if (!company?.code) { toast("⚠️ Primero crea la empresa en este dispositivo o conéctala a un backend"); return; }
          if (joinCode !== company.code) { toast("❌ Código no encontrado"); return; }
          toast("✅ Solicitud validada en modo local. En producción esto debe comprobarse en backend.");
        }} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14}}>Unirme al equipo</button>
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────
function SettingsTab({plan,setPlan,setPaywall,sSave,cfg,setCfg,isPro,needsPro,setModal,showHols,setShowHols,userInfo,setUserInfo,contractH,setContractH,dayBanks,setDayBanks,notifCfg,setNotifCfg,darkMode,setDarkMode,customShifts,setCustomShifts,toast,T}) {
  const toggleHols  = async () => { const v=!showHols; setShowHols(v); await sSave("hols10",v); };
  const toggleDark  = async () => { const v=!darkMode; setDarkMode(v); await sSave("dm10",v); };
  const toggleNotif = async (key) => { const v={...notifCfg,[key]:!notifCfg[key]}; setNotifCfg(v); await sSave("nc10",v); toast(v[key]?"🔔 Activado":"🔕 Desactivado"); };
  const loginGoogle = () => { const info={...DEMO_PROFILE}; setUserInfo(info); sSave("ui10",info); toast("✅ Perfil local guardado. La sync real con Google aún no está conectada."); };
  const Toggle = ({val}) => (
    <div style={{width:38,height:22,borderRadius:11,background:val?"#6366F1":T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:val?18:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left 0.2s"}}/>
    </div>
  );

  return (
    <div style={{padding:"16px"}}>
      <div style={{fontWeight:800,fontSize:18,marginBottom:14,color:T.text}}>⚙️ Ajustes</div>

      {/* Cuenta */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:10,color:T.sub,letterSpacing:1}}>CUENTA Y SINCRONIZACIÓN</div>
        {userInfo ? (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"white"}}>{userInfo.name.charAt(0)}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:T.text}}>{userInfo.name}</div><div style={{color:T.dim,fontSize:12}}>{userInfo.email}</div></div>
            <div style={{fontSize:11,color:userInfo.provider==="demo-local"?"#F59E0B":"#34D399",fontWeight:600}}>{userInfo.provider==="demo-local"?"LOCAL":"✓ Sync"}</div>
          </div>
        ) : (
          <>
            <div style={{color:T.dim,fontSize:12,marginBottom:10}}>La autenticación real con Google/Firebase aún no está conectada en esta versión. De momento puedes guardar un perfil local para pruebas.</div>
            <button onClick={loginGoogle} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
              <span style={{fontSize:18}}>🔑</span><span style={{fontWeight:700,fontSize:13,color:T.text}}>Guardar perfil local</span>
            </button>
          </>
        )}
      </div>

      {/* Suscripción */}
      <div style={{background:"linear-gradient(135deg,#1E1B4B,#312E81)",border:"1px solid #4338CA",borderRadius:14,padding:"14px",marginBottom:12}}>
        {plan === "basic" ? (
          <>
            <div style={{fontWeight:800,fontSize:15,marginBottom:4,color:"white"}}>✨ Hazte PRO</div>
            <div style={{color:"#A5B4FC",fontSize:12,marginBottom:10}}>Sin anuncios · Todas las funciones desbloqueadas</div>
            {!BILLING_READY && <div style={{color:"#FDE68A",fontSize:11,marginBottom:10}}>Modo demo: antes de publicar hay que conectar RevenueCat y Google Play Billing.</div>}
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {[{p:"1,99€",s:"/mes"},{p:"14,99€",s:"/año",badge:"MEJOR VALOR"}].map((o,i) => (
                <div key={i} style={{flex:1,background:"#1E1B4B",border:"2px solid #6366F1",borderRadius:10,padding:"10px",textAlign:"center",position:"relative"}}>
                  {o.badge&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:"#22C55E",color:"white",fontSize:9,padding:"2px 6px",borderRadius:10,fontWeight:700,whiteSpace:"nowrap"}}>{o.badge}</div>}
                  <div style={{fontWeight:800,fontSize:17,color:"#818CF8"}}>{o.p}</div>
                  <div style={{fontSize:10,color:"#64748B"}}>{o.s}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setPaywall({show:true,feat:""})} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14}}>Empezar 14 días gratis</button>
          </>
        ) : (
          <>
            <div style={{fontWeight:800,fontSize:15,marginBottom:2,color:"white"}}>{plan==="business"?"🏢 Empresa":"✨ PRO"} activo</div>
            <div style={{color:"#A5B4FC",fontSize:12,marginBottom:10}}>{BILLING_READY ? "Suscripción gestionada por la tienda" : "Activación local de prueba"}</div>
            <button onClick={async()=>{setPlan("basic");await sSave("pl10","basic");toast("Suscripción cancelada");}} style={{background:"transparent",border:"1px solid #475569",color:"#EF4444",padding:"8px 16px",borderRadius:10,cursor:"pointer",fontSize:12}}>Cancelar suscripción</button>
          </>
        )}
      </div>

      {/* Notificaciones */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontWeight:700,fontSize:12,color:T.sub,letterSpacing:1}}>NOTIFICACIONES</div>
        </div>
        {[
          {key:"nextShift",l:"Turno de mañana",sub:"Aviso la noche anterior con tu turno del día siguiente"},
          {key:"weekly",   l:"Resumen semanal", sub:"Cada domingo: resumen de la semana que empieza"},
          {key:"monthly",  l:"Resumen mensual", sub:"El día 1 de cada mes: balance del mes anterior"},
        ].map((item,i,arr) => (
          <button key={item.key} onClick={()=>toggleNotif(item.key)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none",cursor:"pointer",textAlign:"left"}}>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{item.l}</div><div style={{fontSize:11,color:T.dim}}>{item.sub}</div></div>
            <Toggle val={notifCfg[item.key]}/>
          </button>
        ))}
      </div>

      {/* Lista de ajustes */}
      <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,marginBottom:12}}>
        {[
          {i:"⏰",l:"Horas de cada turno",sub:"Configura entrada, salida y duración real",action:()=>setModal("shiftCfg")},
          {i:"🎨",l:"Turnos personalizados",sub:"Crea tus propios tipos de turno con icono y color",action:()=>setModal("customShift")},
          {i:"🗓️",l:"Festivos nacionales",sub:showHols?"Visibles en el calendario":"Ocultos en el calendario",action:toggleHols,toggle:true,val:showHols},
          {i:darkMode?"☀️":"🌙",l:`Modo ${darkMode?"claro":"oscuro"}`,sub:"Cambia el tema de la aplicación",action:toggleDark,toggle:true,val:darkMode},
          {i:"📆",l:"Google Calendar / iCal",sub:"Exportar o sincronizar turnos",action:()=>setModal("gcal")},
          {i:"👫",l:"Compartir calendario",sub:"Solo lectura para pareja o familia",action:()=>setModal("share")},
          {i:"💾",l:"Datos y copia de seguridad",sub:"Exportar, importar o restaurar datos",action:()=>setModal("data")},
          {i:"⭐",l:"Valorar TurnosApp",sub:"Ayúdanos en la Play Store (¡es gratis y nos ayuda mucho!)",action:()=>toast("⭐ ¡Gracias por tu apoyo!")},
          {i:"❓",l:"Ayuda y soporte",sub:"soporte@turnosapp.es · Respondemos en menos de 48h",action:()=>toast("💬 soporte@turnosapp.es")},
        ].map((item,i,arr) => (
          <button key={item.l} onClick={item.action} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:T.card,border:"none",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:20}}>{item.i}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{item.l}</div>
              <div style={{fontSize:11,color:T.dim}}>{item.sub}</div>
            </div>
            {item.toggle ? <Toggle val={item.val}/> : <span style={{color:T.faint,fontSize:16}}>›</span>}
          </button>
        ))}
      </div>

      <div style={{textAlign:"center",color:T.faint,fontSize:11,padding:"8px 0"}}>
        TurnosApp v{APP_VERSION} · Hecho con ❤️ en España
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR MANAGER
// ─────────────────────────────────────────────────────────────
function CalendarManagerModal({onClose,calendars,setCalendars,calIdx,setCalIdx,isPro,MAX_CALS,sSave,toast,T}) {
  const [name,  setName]  = useState("");
  const [color, setColor] = useState(CAL_COLORS[0]);
  const swipe = useSwipe({ onDown: onClose });

  const create = async () => {
    const n = sanitize(name, MAX_CAL_NAME);
    if (!n) { toast("⚠️ Pon un nombre al calendario"); return; }
    if (calendars.length >= MAX_CALS) { toast(`Límite de ${MAX_CALS} calendarios en tu plan`); return; }
    const next = [...calendars, mkCal(n, color)];
    setCalendars(next); await sSave("cals10", next);
    const i = next.length - 1; setCalIdx(i); await sSave("calidx10", i);
    toast("✅ Calendario creado"); onClose();
  };

  const del = async (i) => {
    if (calendars.length === 1) { toast("⚠️ Necesitas al menos 1 calendario"); return; }
    const next = calendars.filter((_,idx) => idx !== i);
    setCalendars(next); await sSave("cals10", next);
    const ni = Math.min(calIdx, next.length-1); setCalIdx(ni); await sSave("calidx10", ni);
    toast("🗑️ Calendario eliminado");
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"16px 16px 40px",border:`1px solid ${T.border}`,maxHeight:"80vh",overflowY:"auto"}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 10px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:4,color:T.text}}>📅 Mis calendarios</div>
        <div style={{color:T.dim,fontSize:12,marginBottom:14}}>{isPro?`${calendars.length}/3 calendarios PRO`:"Plan básico: 1 calendario · Premium para hasta 3"}</div>
        {calendars.map((c,i) => (
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:c.color,flexShrink:0}}/>
            <div style={{flex:1,fontWeight:600,color:T.text,fontSize:13}}>{c.name}</div>
            {i===calIdx && <span style={{fontSize:10,color:c.color,fontWeight:700}}>ACTIVO</span>}
            {calendars.length>1 && <button onClick={()=>del(i)} style={{background:"#450A0A",border:"1px solid #F87171",color:"#F87171",padding:"4px 8px",borderRadius:8,cursor:"pointer",fontSize:11}}>Borrar</button>}
          </div>
        ))}
        {calendars.length < MAX_CALS ? (
          <div style={{marginTop:14}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del calendario" maxLength={MAX_CAL_NAME} style={{width:"100%",background:T.card,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"10px",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {CAL_COLORS.map(c => <button key={c} onClick={()=>setColor(c)} style={{width:34,height:34,borderRadius:"50%",background:c,border:color===c?"3px solid white":"2px solid transparent",cursor:"pointer"}}/>)}
            </div>
            <button onClick={create} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14}}>Crear calendario</button>
          </div>
        ) : (!isPro && <button onClick={onClose} style={{width:"100%",marginTop:14,background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14}}>✨ Hazte PRO para hasta 3 calendarios</button>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOM SHIFT MODAL
// ─────────────────────────────────────────────────────────────
function CustomShiftModal({onClose,customShifts,setCustomShifts,cfg,setCfg,sSave,toast,T}) {
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({label:"",short:"",color:CUSTOM_COLORS[0],icon:CUSTOM_ICONS[0]});
  const swipe = useSwipe({ onDown: onClose });

  const startNew  = () => { setForm({label:"",short:"",color:CUSTOM_COLORS[0],icon:CUSTOM_ICONS[0]}); setEditing("new"); };
  const startEdit = (s) => { setForm({label:s.label,short:s.short,color:s.color,icon:s.icon}); setEditing(s.id); };

  const save = async () => {
    const label = sanitize(form.label, MAX_SHIFT_LABEL);
    if (!label) { toast("⚠️ Pon un nombre al turno"); return; }
    const id  = editing==="new" ? `custom_${Date.now()}` : editing;
    const bg  = form.color + "33";
    const short = sanitize(form.short||label.slice(0,2).toUpperCase(), 3);
    let upd;
    if (editing==="new") upd=[...customShifts,{id,label,short,color:form.color,bg,icon:form.icon,custom:true}];
    else upd=customShifts.map(s=>s.id===id?{...s,label,short,color:form.color,bg,icon:form.icon}:s);
    setCustomShifts(upd); await sSave("cs10",upd);
    if (!cfg[id]) { const nc={...cfg,[id]:{startTime:"",endTime:"",hours:0}}; setCfg(nc); await sSave("sc10",nc); }
    toast(editing==="new"?"✅ Turno creado":"✅ Turno actualizado"); setEditing(null);
  };

  const del = async (id) => { const upd=customShifts.filter(s=>s.id!==id); setCustomShifts(upd); await sSave("cs10",upd); toast("🗑️ Turno eliminado"); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"16px 16px 40px",border:`1px solid ${T.border}`,maxHeight:"88vh",overflowY:"auto"}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:14,color:T.text}}>🎨 Turnos personalizados</div>
        {editing ? (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="Nombre del turno" maxLength={MAX_SHIFT_LABEL} style={{flex:2,background:T.card,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"10px",fontSize:13,outline:"none"}}/>
              <input value={form.short} onChange={e=>setForm(p=>({...p,short:e.target.value.toUpperCase().slice(0,3)}))} placeholder="Abr" maxLength={3} style={{flex:1,background:T.card,border:`1px solid ${T.border2}`,borderRadius:10,color:T.text,padding:"10px",fontSize:13,outline:"none",textAlign:"center",fontWeight:700}}/>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:6}}>ICONO</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {CUSTOM_ICONS.map(ic => <button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{width:36,height:36,fontSize:18,background:form.icon===ic?"#6366F1":T.card,border:`2px solid ${form.icon===ic?"#6366F1":T.border}`,borderRadius:9,cursor:"pointer"}}>{ic}</button>)}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:6}}>COLOR</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {CUSTOM_COLORS.map(c => <button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:32,height:32,borderRadius:8,background:c,border:form.color===c?"3px solid white":"2px solid transparent",cursor:"pointer"}}/>)}
            </div>
            {/* Preview */}
            <div style={{background:form.color+"33",border:`2px solid ${form.color}`,borderRadius:12,padding:"10px",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:24}}>{form.icon}</span>
              <div><div style={{fontWeight:700,color:form.color,fontSize:14}}>{form.label||"Nombre turno"}</div><div style={{color:form.color,fontSize:11,opacity:0.7}}>{form.short||"AB"}</div></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,background:T.card,border:`1px solid ${T.border2}`,color:T.sub,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:600}}>Cancelar</button>
              <button onClick={save} style={{flex:2,background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:14}}>Guardar turno</button>
            </div>
          </div>
        ) : (
          <>
            {customShifts.length===0 && <div style={{textAlign:"center",color:T.faint,fontSize:13,padding:"20px 0"}}>Aún no tienes turnos personalizados</div>}
            {customShifts.map(s => (
              <div key={s.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:10,background:s.bg,border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,color:s.color,fontSize:14}}>{s.label}</div><div style={{fontSize:11,color:T.dim}}>{s.short}</div></div>
                <button onClick={()=>startEdit(s)} style={{background:T.header,border:`1px solid ${T.border}`,color:T.sub,padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12}}>Editar</button>
                <button onClick={()=>del(s.id)} style={{background:"#450A0A",border:"1px solid #F87171",color:"#F87171",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12}}>🗑️</button>
              </div>
            ))}
            <button onClick={startNew} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"13px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:14,marginTop:8}}>+ Crear turno personalizado</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHIFT CONFIG
// ─────────────────────────────────────────────────────────────
function ShiftCfgModal({cfg,setCfg,onClose,sSave,toast,T}) {
  const [local,setLocal]=useState({...cfg});
  const update=(sid,f,v)=>setLocal(p=>({...p,[sid]:{...p[sid],[f]:v}}));
  const calcH=(sid)=>{
    const{startTime,endTime}=local[sid]||{};
    if(!startTime||!endTime)return sanitizeNum(local[sid]?.hours||0,0,MAX_HOURS_DAY);
    const[sh,sm]=startTime.split(":").map(Number);const[eh,em]=endTime.split(":").map(Number);
    let d=(eh*60+em)-(sh*60+sm);if(d<0)d+=1440;
    return Math.round(d/60*10)/10;
  };
  const saveAll=async()=>{
    const u={};
    BASE_SHIFTS.filter(s=>!["rest","vacation","personal","comp","sick"].includes(s.id)).forEach(s=>{
      u[s.id]={...local[s.id],hours:sanitizeNum(calcH(s.id),0,MAX_HOURS_DAY)};
    });
    const nc={...cfg,...u};setCfg(nc);await sSave("sc10",nc);toast("✅ Guardado");onClose();
  };
  const swipe=useSwipe({onDown:onClose});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"16px 16px 40px",border:`1px solid ${T.border}`,maxHeight:"85vh",overflowY:"auto"}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:12,color:T.text}}>⚙️ Horas de cada turno</div>
        {BASE_SHIFTS.filter(s=>!["rest","vacation","personal","comp","sick"].includes(s.id)).map(s=>(
          <div key={s.id} style={{background:T.card,border:`1px solid ${s.bg}`,borderRadius:12,padding:"12px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span>{s.icon}</span><span style={{fontWeight:700,color:s.color}}>{s.label}</span><span style={{marginLeft:"auto",background:s.bg,color:s.color,padding:"3px 10px",borderRadius:20,fontSize:13,fontWeight:800}}>{calcH(s.id)}h</span></div>
            <div style={{display:"flex",gap:8}}>
              {["startTime","endTime"].map(f=>(
                <div key={f} style={{flex:1}}>
                  <div style={{fontSize:9,color:T.dim,marginBottom:3}}>{f==="startTime"?"Entrada":"Salida"}</div>
                  <input type="time" value={local[s.id]?.[f]||""} onChange={e=>update(s.id,f,e.target.value)} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,padding:"8px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                </div>
              ))}
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:T.dim,marginBottom:3}}>Manual (h)</div>
                <input type="number" min="0" max={MAX_HOURS_DAY} step="0.5" value={local[s.id]?.hours??""} onChange={e=>update(s.id,"hours",parseFloat(e.target.value)||0)} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,padding:"8px",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
              </div>
            </div>
          </div>
        ))}
        <button onClick={saveAll} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"13px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:15}}>Guardar cambios</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAYWALL
// ─────────────────────────────────────────────────────────────
function PaywallModal({feat,onClose,setPlan,sSave,toast,T}) {
  const companyIntent = (feat || "").toLowerCase().includes("empresa");
  const [sel,setSel]=useState(companyIntent ? "business" : "annual");
  const activate = async () => {
    const nextPlan = sel === "business" ? "business" : "premium";
    setPlan(nextPlan);
    await sSave("pl10", nextPlan);
    toast(BILLING_READY ? `✅ ¡Bienvenido a ${nextPlan==="business"?"Empresa":"PRO"}!` : `✅ ${nextPlan==="business"?"Plan Empresa":"PRO"} activado en modo demo. Falta conectar el cobro real antes de publicar.`);
    onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:150,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"22px 18px 40px",border:`1px solid ${T.border}`}}>
        <div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:34,marginBottom:6}}>✨</div>
          <div style={{fontWeight:800,fontSize:19,marginBottom:4,color:T.text}}>TurnosApp {sel==="business"?"Empresa":"PRO"}</div>
          {feat&&<div style={{color:T.dim,fontSize:12}}>Para usar <strong style={{color:"#818CF8"}}>{feat}</strong> necesitas {sel==="business"?"Empresa":"PRO"}</div>}
        </div>
        {[`✅ Sin anuncios`,`✅ Modo pintura + patrones automáticos`,`✅ Balance anual con gráficas`,`✅ Horas extra + bolsa de vacaciones`,`✅ Hasta 3 calendarios independientes`,`✅ PDF del cuadrante mensual`,`✅ Resumen anual tipo Wrapped`,`✅ Exportación iCal y futura sync`,`✅ Compartir con pareja o familia`,`✅ Turnos personalizados ilimitados`,`✅ Plan Empresa hasta ${MAX_EMPLOYEES} personas`].map(f=>(
          <div key={f} style={{fontSize:12,color:T.sub,padding:"3px 0"}}>{f}</div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"16px 0"}}>
          {[{id:"monthly",l:"Mensual",p:"1,99€",s:"uso personal"},{id:"annual",l:"Anual",p:"14,99€",s:"ahorra 37%"},{id:"business",l:"Empresa",p:"9,99€/mes",s:`hasta ${MAX_EMPLOYEES} personas`}].map(o=>(
            <button key={o.id} onClick={()=>setSel(o.id)} style={{background:sel===o.id?"#1E1B4B":T.card,border:`2px solid ${sel===o.id?"#6366F1":T.border}`,borderRadius:12,padding:"12px 6px",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:10,color:T.dim,fontWeight:600}}>{o.l}</div>
              <div style={{fontWeight:800,fontSize:18,color:sel===o.id?"#818CF8":T.text,margin:"4px 0"}}>{o.p}</div>
              <div style={{fontSize:9,color:sel===o.id?"#6366F1":T.faint}}>{o.s}</div>
            </button>
          ))}
        </div>
        {!BILLING_READY && <div style={{textAlign:"center",fontSize:11,color:"#F59E0B",marginBottom:10}}>Esta pantalla está en modo demo local. La compra real debe validarse en tienda.</div>}
        <button onClick={activate} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"13px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:15,marginBottom:8}}>{BILLING_READY ? (sel==="business" ? "Probar Empresa 14 días" : "Empezar 14 días gratis") : (sel==="business" ? "Activar Empresa de prueba" : "Activar PRO de prueba")}</button>
        <div style={{textAlign:"center",fontSize:10,color:T.faint,marginBottom:10}}>{BILLING_READY ? "Sin compromiso · Cancela desde Ajustes en cualquier momento" : `Las funciones ${sel==="business"?"del plan Empresa":"premium"} se desbloquean solo para validar la interfaz`}</div>
        <button onClick={onClose} style={{width:"100%",background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:12,padding:"6px"}}>Seguir con la versión básica</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PATTERNS MODAL
// ─────────────────────────────────────────────────────────────
function PatternsModal({onClose,now,shifts,updateCal,calIdx,isPro,needsPro,toast,T,allShifts}) {
  const [pattern,setPattern]=useState(["morning","morning","afternoon","afternoon","night","night","rest","rest"]);
  const [months,setMonths]=useState(1);
  if(!isPro){needsPro("patrones automáticos");onClose();return null;}
  const presets=[
    {l:"2M-2T-2N-2D",s:["morning","morning","afternoon","afternoon","night","night","rest","rest"]},
    {l:"5+2 descanso",s:["morning","morning","morning","morning","morning","rest","rest"]},
    {l:"Noches+3D",   s:["night","night","night","rest","rest","rest"]},
    {l:"M/T alternos",s:["morning","afternoon","morning","afternoon","rest","rest"]},
  ];
  const apply=async()=>{
    const y=now.getFullYear(),m=now.getMonth();const u={...shifts};let pi=0;
    for(let mo=m;mo<m+months;mo++){const days=new Date(y,mo+1,0).getDate();for(let d=1;d<=days;d++){u[fmtKey(y,mo,d)]=pattern[pi%pattern.length];pi++;}}
    await updateCal(calIdx,{shifts:u});toast(`✅ Patrón aplicado (${months} mes${months>1?"es":""})`);onClose();
  };
  const swipe=useSwipe({onDown:onClose});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"18px 16px 40px",border:`1px solid ${T.border}`}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:10,color:T.text}}>🔄 Patrón automático</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {presets.map(p=><button key={p.l} onClick={()=>setPattern(p.s)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:11,color:T.sub,fontWeight:600}}>{p.l}</button>)}
        </div>
        <div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:1,marginBottom:7}}>CICLO ({pattern.length} días)</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
          {pattern.map((sid,i)=>{const sh=allShifts.find(s=>s.id===sid);return sh?<div key={i} style={{background:sh.bg,border:`1px solid ${sh.color}`,padding:"4px 8px",borderRadius:7,fontSize:11,color:sh.color,fontWeight:700}}>{sh.short}</div>:null;})}
        </div>
        <div style={{fontSize:11,color:T.dim,marginBottom:6}}>Aplicar a cuántos meses desde hoy</div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[1,2,3,6,12].map(n=><button key={n} onClick={()=>setMonths(n)} style={{flex:1,background:months===n?"#6366F1":T.card,border:`1px solid ${months===n?"#6366F1":T.border}`,borderRadius:8,padding:"8px 4px",cursor:"pointer",color:months===n?"white":T.sub,fontSize:12,fontWeight:700}}>{n}m</button>)}
        </div>
        <button onClick={apply} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"13px",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:14}}>Aplicar patrón</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GOOGLE CALENDAR
// ─────────────────────────────────────────────────────────────
function GCalModal({onClose,shifts,cfg,yr,isPro,needsPro,toast,T,allShifts}) {
  const [synced,setSynced]=useState(false);
  if(!isPro){needsPro("Google Calendar");onClose();return null;}
  const genIcs=()=>{
    let s="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TurnosApp//ES\r\nCALSCALE:GREGORIAN\r\n";
    Object.entries(shifts).forEach(([key,sid])=>{
      const sh=allShifts.find(x=>x.id===sid);if(!sh)return;
      const[y,m,d]=key.split("-");const c=cfg[sid]||{};
      let sum=`${sh.icon} ${sh.label}`;if(c.startTime&&c.endTime)sum+=` (${c.startTime}-${c.endTime})`;
      s+=`BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${y}${m}${d}\r\nDTEND;VALUE=DATE:${nextDateStamp(key)}\r\nSUMMARY:${escapeIcsText(sum)}\r\nUID:${genId()}@turnosapp.local\r\nEND:VEVENT\r\n`;
    });
    return s+"END:VCALENDAR";
  };
  const download=()=>{
    const blob=new Blob([genIcs()],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`TurnosApp_${yr}.ics`;a.click();URL.revokeObjectURL(url);
    toast("✅ Archivo .ics descargado");
  };
  const swipe=useSwipe({onDown:onClose});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"20px 16px 40px",border:`1px solid ${T.border}`}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:4,color:T.text}}>📆 Google Calendar / iCal</div>
        <div style={{color:T.dim,fontSize:12,marginBottom:14}}>Compatible con Google Calendar, Outlook y Apple Calendar.</div>
        <div style={{background:synced?"#064E3B":T.card,border:`1px solid ${synced?"#34D399":T.border}`,borderRadius:12,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:synced?0:10}}>
            <span style={{fontSize:18}}>🔄</span>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:T.text}}>{synced?"Sincronización simulada":"Sincronización automática"}</div><div style={{fontSize:11,color:T.dim}}>{synced?"Estado visual conectado para demo":"Requiere OAuth y sincronización reales para producción"}</div></div>
            {synced&&<span style={{color:"#34D399",fontSize:12,fontWeight:700}}>✓ ON</span>}
          </div>
          {!synced&&<button onClick={()=>{setSynced(true);toast("✅ Estado de sync activado en demo. Falta OAuth y API real.");}} style={{width:"100%",background:"linear-gradient(135deg,#059669,#34D399)",border:"none",color:"white",padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>🔑 Simular conexión</button>}
        </div>
        <button onClick={download} style={{width:"100%",background:"linear-gradient(135deg,#6366F1,#A78BFA)",border:"none",color:"white",padding:"13px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14}}>⬇️ Descargar .ics (importar manualmente)</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARE MODAL
// ─────────────────────────────────────────────────────────────
function ShareModal({onClose,isPro,needsPro,toast,T}) {
  const [code]=useState(genViewCode());
  const [copied,setCopied]=useState(false);
  if(!isPro){needsPro("compartir calendario");onClose();return null;}
  const copy=async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{toast("Copia el código manualmente");}};
  const shareWhatsapp = () => {
    const text = encodeURIComponent(`Te comparto mi calendario de TurnosApp en modo solo lectura. Código: ${code}`);
    const url = `https://wa.me/?text=${text}`;
    try {
      window.open(url, "_blank");
      toast("📲 Abriendo WhatsApp…");
    } catch {
      toast("Copia el código manualmente");
    }
  };
  const swipe=useSwipe({onDown:onClose});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"20px 16px 40px",border:`1px solid ${T.border}`}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:4,color:T.text}}>👫 Compartir calendario</div>
        <div style={{color:T.dim,fontSize:12,marginBottom:14}}>Comparte este código. Tu pareja o familia podrán ver tus turnos sin poder modificarlos.</div>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:11,color:T.dim,marginBottom:8}}>Tu código de vista (solo lectura)</div>
          <div style={{fontWeight:800,fontSize:28,letterSpacing:4,color:"#818CF8",fontFamily:"monospace",marginBottom:4}}>{code}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={copy} style={{flex:1,background:T.card,border:`1px solid ${T.border2}`,color:T.sub,padding:"12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>{copied?"✅ Copiado":"📋 Copiar código"}</button>
          <button onClick={shareWhatsapp} style={{flex:1,background:"#064E3B",border:"1px solid #34D399",color:"#34D399",padding:"12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>💬 WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DATA MODAL
// ─────────────────────────────────────────────────────────────
function DataModal({onClose,buildBackupSnapshot,restoreBackupSnapshot,userInfo,setUserInfo,sSave,toast,T}) {
  const exportData=()=>{
    const data=JSON.stringify(buildBackupSnapshot(),null,2);
    const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`TurnosApp_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();URL.revokeObjectURL(url);toast("✅ Backup exportado");
  };
  const importData=()=>{
    const input=document.createElement("input");input.type="file";input.accept=".json";
    input.onchange=(e)=>{
      const file=e.target.files[0];if(!file)return;
      if(file.size>10*1024*1024){toast("❌ Archivo demasiado grande (máx 10MB)");return;} // 10MB limit
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        try{
          const data=JSON.parse(ev.target.result);
          if(!data || typeof data !== "object"){toast("❌ Formato no válido");return;}
          await restoreBackupSnapshot(data);
          toast("✅ Datos restaurados correctamente");onClose();
        }catch{toast("❌ Archivo no válido o corrompido");}
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const loginGoogle=()=>{const info={...DEMO_PROFILE};setUserInfo(info);sSave("ui10",info);toast("✅ Perfil local guardado. La sync real aún está pendiente.");onClose();};
  const swipe=useSwipe({onDown:onClose});
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.header,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"20px 16px 40px",border:`1px solid ${T.border}`}}>
        <div {...swipe} style={{textAlign:"center",padding:"0 0 14px",cursor:"grab"}}><div style={{width:40,height:4,background:T.border2,borderRadius:2,margin:"0 auto"}}/></div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:4,color:T.text}}>💾 Datos y copia de seguridad</div>
        <div style={{color:T.dim,fontSize:12,marginBottom:14}}>Exporta para backup o para transferir a otro dispositivo.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:6,color:T.text}}>☁️ Perfil y sincronización</div>
            <div style={{color:T.dim,fontSize:12,marginBottom:10}}>{userInfo?"Tienes un perfil local guardado. La sincronización real entre dispositivos requiere backend y auth reales.":"Aún no hay sincronización real conectada. Puedes guardar un perfil local mientras montamos Google/Firebase."}</div>
            {userInfo
              ?<div style={{display:"flex",alignItems:"center",gap:6,color:userInfo.provider==="demo-local"?"#F59E0B":"#34D399",fontSize:12,fontWeight:600}}><span>{userInfo.provider==="demo-local"?"•":"✓"}</span><span>{userInfo.email}</span></div>
              :<button onClick={loginGoogle} style={{width:"100%",background:T.header,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}><span>🔑</span><span style={{fontWeight:700,fontSize:13,color:T.text}}>Guardar perfil local</span></button>}
          </div>
          {[
            {icon:"📤",t:"Exportar backup (.json)",sub:"Descarga calendarios, ajustes, empresa y perfil",action:exportData},
            {icon:"📥",t:"Restaurar backup",sub:"Importa un .json completo exportado anteriormente",action:importData},
          ].map(item=>(
            <button key={item.t} onClick={item.action} style={{background:T.card,border:`1px solid ${T.border2}`,borderRadius:12,padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24}}>{item.icon}</span>
              <div><div style={{fontWeight:700,fontSize:13,color:T.text}}>{item.t}</div><div style={{fontSize:11,color:T.dim}}>{item.sub}</div></div>
            </button>
          ))}
        </div>
        <div style={{background:T.card,border:`1px dashed ${T.border2}`,borderRadius:10,padding:"10px 14px",marginTop:12}}>
          <div style={{fontSize:11,color:T.dim}}>💡 <strong style={{color:T.sub}}>Hoy:</strong> usa el backup `.json` para mover datos entre dispositivos. La sincronización automática llegará cuando conectemos auth y base de datos reales.</div>
        </div>
      </div>
    </div>
  );
}
