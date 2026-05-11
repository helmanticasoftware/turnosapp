import { supabaseTables } from "@/src/config/supabase-schema";
import type {
  CalendarData,
  CompanyData,
  ShiftSwapRequest,
  ShareLink,
  UserSettings,
} from "@/src/types/domain";

export const repositoryMap = {
  userSettings: supabaseTables.userSettings,
  calendars: supabaseTables.calendars,
  companies: supabaseTables.companies,
  swapRequests: supabaseTables.swapRequests,
  shareLinks: supabaseTables.shareLinks,
};

export type RepositoryEntities = {
  userSettings: UserSettings;
  calendars: CalendarData;
  companies: CompanyData;
  swapRequests: ShiftSwapRequest;
  shareLinks: ShareLink;
};
