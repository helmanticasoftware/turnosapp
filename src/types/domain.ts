export type PlanId = "basic" | "premium" | "business";

export type ShiftId =
  | "morning"
  | "afternoon"
  | "night"
  | "rest"
  | "vacation"
  | "personal"
  | "comp"
  | "sick"
  | "extra"
  | `custom_${string}`;

export type EventType =
  | "gym"
  | "meeting"
  | "medical"
  | "alarm"
  | "travel"
  | "birthday"
  | "food"
  | "training";

export type ReminderAdvance = "same" | "1d" | "2d" | "1w";

export type CalendarEvent = {
  type: EventType;
  note: string;
  time: string;
  endTime: string;
  allDay: boolean;
  advance: ReminderAdvance;
};

export type CalendarData = {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  isArchived?: boolean;
  shifts: Record<string, ShiftId>;
  notes: Record<string, string>;
  events: Record<string, CalendarEvent[]>;
  createdAt: string;
  updatedAt: string;
};

export type CustomShift = {
  id: ShiftId;
  label: string;
  short: string;
  color: string;
  bg: string;
  icon: string;
  custom: true;
};

export type UserSettings = {
  userId: string;
  plan: PlanId;
  contractHoursPerMonth: number;
  darkMode: boolean;
  showHolidays: boolean;
  dayBanks: {
    vacation: number;
    personal: number;
    comp: number;
  };
  notifications: {
    nextShift: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type CompanyRole = "owner" | "manager" | "employee";

export type CompanyMember = {
  userId: string;
  name: string;
  email?: string;
  role: CompanyRole;
  joinedAt: string;
};

export type ShiftSwapRequest = {
  id: string;
  companyId: string;
  requesterUserId: string;
  requesterName: string;
  targetUserId?: string;
  targetName: string;
  dateKey: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
};

export type CompanyData = {
  id: string;
  ownerUserId: string;
  name: string;
  joinCode: string;
  members: CompanyMember[];
  createdAt: string;
  updatedAt: string;
};

export type ShareLink = {
  id: string;
  code: string;
  ownerUserId: string;
  calendarId: string;
  readOnly: true;
  createdAt: string;
  revokedAt?: string;
};
