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

export const recommendedIndexes = [
  "calendars(owner_id, updated_at desc)",
  "companies(owner_user_id, updated_at desc)",
  "company_members(company_id, user_id)",
  "swap_requests(company_id, created_at desc)",
  "share_links(owner_user_id, created_at desc)",
] as const;
