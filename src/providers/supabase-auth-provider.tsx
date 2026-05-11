import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase, supabaseTables, turnosAppRedirectPath } from "@/src/services/supabase";

WebBrowser.maybeCompleteAuthSession();

const AUTH_SETTLE_DELAY_MS = 1200;

type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
};

type SupabaseAuthContextValue = {
  isReady: boolean;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "turnosapp",
    path: turnosAppRedirectPath,
  });
}

function readTokensFromUrl(url: string) {
  const parsed = new URL(url);
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const queryParams = parsed.searchParams;

  return {
    code: queryParams.get("code"),
    accessToken: queryParams.get("access_token") ?? hashParams.get("access_token"),
    refreshToken: queryParams.get("refresh_token") ?? hashParams.get("refresh_token"),
  };
}

async function fetchProfile(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(supabaseTables.profiles)
    .select("id,email,full_name,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Supabase profile fetch error:", error.message);
    return null;
  }

  return data as Profile | null;
}

async function waitForActiveSession() {
  if (!supabase) return null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((resolve) => setTimeout(resolve, AUTH_SETTLE_DELAY_MS));
  }

  return null;
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(!hasSupabaseConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const nextSession = data.session ?? null;
      setSession(nextSession);
      setProfile(nextSession?.user ? await fetchProfile(nextSession.user.id) : null);
      setIsReady(true);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setProfile(nextSession?.user ? await fetchProfile(nextSession.user.id) : null);
      setIsReady(true);
    });

    const appStateSubscription =
      Platform.OS !== "web"
        ? AppState.addEventListener("change", (state) => {
            if (!supabase) return;
            if (state === "active") {
              supabase.auth.startAutoRefresh();
            } else {
              supabase.auth.stopAutoRefresh();
            }
          })
        : null;

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return { ok: false, error: "Supabase no configurado" };

    const redirectUri = getRedirectUri();
    const authorizeUrl = new URL(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectUri);
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("access_type", "offline");

    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), redirectUri);

    if (result.type === "success" && result.url) {
      const { code, accessToken, refreshToken } = readTokensFromUrl(result.url);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
    }

    const sessionAfterRedirect = await waitForActiveSession();
    if (sessionAfterRedirect?.user) {
      return { ok: true };
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false, error: "Inicio de sesion cancelado" };
    }

    return { ok: false, error: "No se recibio una sesion valida de Google" };
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.warn("Supabase signOut error:", error.message);
    }
  };

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(session.user.id));
  };

  const value = useMemo<SupabaseAuthContextValue>(
    () => ({
      isReady,
      isConfigured: hasSupabaseConfig,
      session,
      user: session?.user ?? null,
      profile,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [isReady, session, profile],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth debe usarse dentro de SupabaseAuthProvider");
  }
  return context;
}
