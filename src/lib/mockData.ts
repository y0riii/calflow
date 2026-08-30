export interface EventType {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: number; // in minutes
  platform: 'meet' | 'zoom' | 'physical' | 'custom';
  customLocation?: string;
  color: string;
  bookingWindowType: 'rolling' | 'range' | 'indefinite';
  bookingWindowDays?: number;
  startDate?: string;
  endDate?: string;
  minNoticeHours: number;
  bufferBeforeMins: number;
  bufferAfterMins: number;
  maxBookingsPerDay?: number;
  bookingCount: number;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  eventTitle: string;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startsAt: string; // ISO String
  endsAt: string; // ISO String
  status: 'confirmed' | 'cancelled' | 'completed';
  platform: 'meet' | 'zoom' | 'physical' | 'custom';
  meetingUrl: string;
  syncedWithGoogle: boolean;
  googleCalendarEventId?: string;
  notes?: string;
  cancelReason?: string;
}

export interface GoogleCalendarConfig {
  connected: boolean;
  accountEmail: string;
  email: string;
  primaryCalendar: string;
  autoSync: boolean;
  checkConflicts: boolean;
  lastSyncedAt: string;
}

export interface ZoomConfig {
  connected: boolean;
  email: string;
  autoGenerateLinks: boolean;
}

export interface DayAvailability {
  day: string;
  active: boolean;
  slots: { start: string; end: string }[];
}

export const INITIAL_USER = {
  name: 'Alex Rivers',
  username: 'alexrivers',
  email: 'alex.rivers@acme.io',
  timezone: 'America/New_York (GMT-5)',
  bio: 'Senior Product Lead & Tech Consultant. Book time to discuss partnerships, demos, or mentorship.',
};

export const INITIAL_EVENT_TYPES: EventType[] = [
  {
    id: 'evt_1',
    title: '30 Min Discovery Call',
    slug: 'discovery-30min',
    description: 'Initial consultation to explore project scope, goals, and technical requirements.',
    duration: 30,
    platform: 'meet',
    color: 'emerald',
    bookingWindowType: 'rolling',
    bookingWindowDays: 60,
    minNoticeHours: 4,
    bufferBeforeMins: 10,
    bufferAfterMins: 10,
    maxBookingsPerDay: 6,
    bookingCount: 14,
  },
  {
    id: 'evt_2',
    title: 'Product Demo & Technical Overview',
    slug: 'tech-demo',
    description: 'Deep dive demo of our enterprise platform features, API capabilities, and Q&A.',
    duration: 45,
    platform: 'zoom',
    color: 'indigo',
    bookingWindowType: 'rolling',
    bookingWindowDays: 30,
    minNoticeHours: 12,
    bufferBeforeMins: 15,
    bufferAfterMins: 15,
    maxBookingsPerDay: 4,
    bookingCount: 22,
  },
  {
    id: 'evt_3',
    title: '1-on-1 Mentorship & Strategy',
    slug: 'strategy-session',
    description: 'Focused 60-minute strategic advisory session for startup founders and tech leaders.',
    duration: 60,
    platform: 'meet',
    color: 'violet',
    bookingWindowType: 'range',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    minNoticeHours: 24,
    bufferBeforeMins: 15,
    bufferAfterMins: 15,
    maxBookingsPerDay: 2,
    bookingCount: 8,
  },
  {
    id: 'evt_4',
    title: 'In-Person Coffee & Networking',
    slug: 'coffee-chat',
    description: 'Casual face-to-face meet-up in Downtown SF office hub.',
    duration: 45,
    platform: 'physical',
    customLocation: 'Blue Bottle Coffee, 66 Mint St, San Francisco, CA',
    color: 'amber',
    bookingWindowType: 'indefinite',
    minNoticeHours: 48,
    bufferBeforeMins: 30,
    bufferAfterMins: 30,
    maxBookingsPerDay: 2,
    bookingCount: 5,
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk_101',
    eventTypeId: 'evt_2',
    eventTitle: 'Product Demo & Technical Overview',
    guestName: 'Sarah Jenkins',
    guestEmail: 'sarah.j@techventures.io',
    guestTimezone: 'America/New_York',
    startsAt: new Date(Date.now() + 86400000 * 1.5).toISOString(),
    endsAt: new Date(Date.now() + 86400000 * 1.5 + 45 * 60000).toISOString(),
    status: 'confirmed',
    platform: 'zoom',
    meetingUrl: 'https://zoom.us/j/9847201928?pwd=calendly-demo-sec',
    syncedWithGoogle: true,
    googleCalendarEventId: 'gcal_894723984',
    notes: 'Interested in enterprise SSO integration and custom webhook triggers.',
  },
  {
    id: 'bk_102',
    eventTypeId: 'evt_1',
    eventTitle: '30 Min Discovery Call',
    guestName: 'Michael Chen',
    guestEmail: 'mchen@innovate.co',
    guestTimezone: 'America/Los_Angeles',
    startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    endsAt: new Date(Date.now() + 86400000 * 3 + 30 * 60000).toISOString(),
    status: 'confirmed',
    platform: 'meet',
    meetingUrl: 'https://meet.google.com/abc-xyz-123',
    syncedWithGoogle: true,
    googleCalendarEventId: 'gcal_712938102',
    notes: 'Evaluating scheduling infrastructure for 50-person sales team.',
  },
];

export const INITIAL_GOOGLE_CALENDAR: GoogleCalendarConfig = {
  connected: true,
  accountEmail: 'alex.rivers@gmail.com',
  email: 'alex.rivers@gmail.com',
  primaryCalendar: 'Alex Rivers (Primary Calendar)',
  autoSync: true,
  checkConflicts: true,
  lastSyncedAt: new Date().toISOString(),
};

export const INITIAL_ZOOM: ZoomConfig = {
  connected: true,
  email: 'alex.rivers@acme.io',
  autoGenerateLinks: true,
};

export const INITIAL_AVAILABILITY: DayAvailability[] = [
  { day: 'Monday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Tuesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Wednesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Thursday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Friday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Saturday', active: false, slots: [{ start: '10:00', end: '14:00' }] },
  { day: 'Sunday', active: false, slots: [{ start: '10:00', end: '14:00' }] },
];
