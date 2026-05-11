import "react-native-url-polyfill/auto";

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export const turnosAppRedirectPath = "auth/callback";
export const isNativeRuntime = Platform.OS === "android" || Platform.OS === "ios";

export const supabaseTables = {
  profiles: "profiles",
  userSettings: "user_settings",
  calendars: "calendars",
  customShifts: "custom_shifts",
  companies: "companies",
  companyMembers: "company_members",
  workGroups: "work_groups",
  workGroupMembers: "work_group_members",
  swapRequests: "swap_requests",
  shareLinks: "share_links",
  subscriptions: "subscriptions",
  devices: "devices",
} as const;
