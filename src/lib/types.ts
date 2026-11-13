export type Degree = 1 | 2 | 3;

export type LodgeRole = 'member' | 'board' | 'secretary';

export type EventType =
  | 'Comparitie'
  | 'Open Loge'
  | 'Tafelloge'
  | 'Huishoudelijke Vergadering';

export type RsvpStatus = 'attending' | 'declined';

export type DocumentCategory =
  | 'Bouwstuk'
  | 'Werkplank'
  | 'Rituaal & Instructie'
  | 'Verslag';

export type AnnouncementCategory = 'Bestuur' | 'Secretariaat' | 'Lief en Leed';

export const DEGREE_LABELS: Record<Degree, string> = {
  1: 'Leerling (1e graad)',
  2: 'Gezel (2e graad)',
  3: 'Meester (3e graad)',
};

export const DEGREE_SHORT_LABELS: Record<Degree, string> = {
  1: '1e graad · Leerling',
  2: '2e graad · Gezel',
  3: '3e graad · Meester',
};

export const ROLE_LABELS: Record<LodgeRole, string> = {
  member: 'Lid',
  board: 'Bestuur / Officier',
  secretary: 'Secretaris (Beheer)',
};

export interface Lodge {
  id: string;
  number: number;
  name: string;
  city: string;
  meetingDay: string;
  address: string;
  accentColor: string;
  logoUrl: string;
  description: string;
}

export interface UserMembership {
  lodgeId: string;
  lodgeName: string;
  lodgeNumber: number;
  lodgeCity: string;
  lodgeAccentColor: string;
  lodgeLogoUrl: string;
  role: LodgeRole;
  officerTitle: string | null;
  joinedYear: number | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  avatarUrl: string;
  degree: Degree;
  primaryLodgeId: string;
  primaryLodgeName: string;
  primaryLodgeNumber: number;
  primaryLodgeCity: string;
  dietaryDefault: string;
  activeLodgeId: string;
  memberships: UserMembership[];
}

export interface LodgeEvent {
  id: string;
  lodgeId: string;
  lodgeName: string;
  lodgeNumber: number;
  lodgeCity: string;
  lodgeAccentColor: string;
  lodgeLogoUrl: string;
  title: string;
  eventType: EventType;
  minDegree: Degree;
  eventDate: string;
  startTime: string;
  doorsOpenTime: string;
  location: string;
  speaker: string;
  hasMeal: boolean;
  mealInfo: string;
  allowVisitors: boolean;
  werkplankText: string;
  myRsvp: {
    status: RsvpStatus;
    joinsMeal: boolean;
    isVisitor: boolean;
    dietaryNote: string;
    comment: string;
  } | null;
  stats?: {
    attendingMembers: number;
    attendingVisitors: number;
    declinedMembers: number;
    mealCount: number;
  };
}

export interface EventRsvpDetail {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  degree: Degree;
  homeLodgeName: string;
  homeLodgeNumber: number;
  homeLodgeCity: string;
  status: RsvpStatus;
  joinsMeal: boolean;
  isVisitor: boolean;
  dietaryNote: string;
  comment: string;
  updatedAt: string;
}

export interface LodgeMemberView {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  avatarUrl: string;
  degree: Degree;
  role: LodgeRole;
  officerTitle: string | null;
  sortOrder: number;
  joinedYear: number | null;
}

export interface LodgeDocument {
  id: string;
  lodgeId: string;
  title: string;
  author: string;
  category: DocumentCategory;
  minDegree: Degree;
  publishedDate: string;
  summary: string;
  content: string;
}

export interface LodgeAnnouncement {
  id: string;
  lodgeId: string;
  title: string;
  category: AnnouncementCategory;
  authorName: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface OutboxEmail {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
  previewCode: string | null;
  previewLink: string | null;
  deliveryMode: 'dev_mailbox' | 'smtp';
  createdAt: string;
}
