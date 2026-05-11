export const firestoreCollections = {
  users: "users",
  settings: "userSettings",
  calendars: "calendars",
  customShifts: "customShifts",
  companies: "companies",
  swapRequests: "swapRequests",
  shareLinks: "shareLinks",
  subscriptions: "subscriptions",
  devices: "devices",
} as const;

export const firestoreIndexesToCreate = [
  "calendars: ownerId asc, updatedAt desc",
  "companies: ownerUserId asc, updatedAt desc",
  "swapRequests: companyId asc, createdAt desc",
  "shareLinks: ownerUserId asc, createdAt desc",
];
