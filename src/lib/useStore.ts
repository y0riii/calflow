import { create } from 'zustand';

export interface EventType {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: number; // in minutes
  platform: 'zoom' | 'physical' | 'custom';
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
  platform: 'zoom' | 'physical' | 'custom';
  meetingUrl: string;
  notes?: string;
  cancelReason?: string;
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

const INITIAL_USER = {
  name: '',
  username: '',
  email: '',
  timezone: '',
  bio: '',
};

const INITIAL_ZOOM: ZoomConfig = {
  connected: false,
  email: '',
  autoGenerateLinks: false,
};

const INITIAL_AVAILABILITY: DayAvailability[] = [
  { day: 'Sunday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Monday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Tuesday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Wednesday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Thursday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Friday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Saturday', active: false, slots: [{ start: '09:00', end: '17:00' }] },
];

interface AppStore {
  user: typeof INITIAL_USER;
  eventTypes: EventType[];
  bookings: Booking[];
  zoom: ZoomConfig;
  availability: DayAvailability[];
  activeTab: 'events' | 'bookings' | 'availability';

  // User Actions
  updateUser: (userData: Partial<typeof INITIAL_USER>) => void;

  setEventTypes: (eventTypes: EventType[]) => void;
  setBookings: (bookings: Booking[]) => void;
  setAvailability: (availability: DayAvailability[]) => void;

  // Actions
  setActiveTab: (tab: 'events' | 'bookings' | 'availability') => void;
  addEventType: (event: Omit<EventType, 'bookingCount'>) => void;
  updateEventType: (id: string, event: Partial<EventType>) => void;
  deleteEventType: (id: string) => void;

  createBooking: (bookingData: Omit<Booking, 'id'>) => Booking;
  cancelBooking: (id: string, reason: string) => void;
  rescheduleBooking: (id: string, newStartsAt: string, newEndsAt: string) => void;

  // Integration Actions
  setZoomConnected: (connected: boolean) => void;
  toggleZoomAutoGenerate: () => void;

  // Availability Actions
  toggleDayActive: (dayIndex: number) => void;
  addTimeSlot: (dayIndex: number) => void;
  removeTimeSlot: (dayIndex: number, slotIndex: number) => void;
  updateTimeSlot: (dayIndex: number, slotIndex: number, start: string, end: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: INITIAL_USER,
  eventTypes: [],
  bookings: [],
  zoom: INITIAL_ZOOM,
  availability: INITIAL_AVAILABILITY,
  activeTab: 'events',

  updateUser: (userData) =>
    set((state) => ({
      user: { ...state.user, ...userData },
    })),

  setEventTypes: (eventTypes) => set({ eventTypes }),
  setBookings: (bookings) => set({ bookings }),
  setAvailability: (availability) => set({ availability }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  addEventType: (eventData) => {
    const newEvent: EventType = {
      ...eventData,
      bookingCount: 0,
    };
    set((state) => ({
      eventTypes: [newEvent, ...state.eventTypes],
    }));
  },

  updateEventType: (id, eventUpdate) => {
    set((state) => ({
      eventTypes: state.eventTypes.map((evt) => (evt.id === id ? { ...evt, ...eventUpdate } : evt)),
    }));
  },

  deleteEventType: (id) => {
    set((state) => ({
      eventTypes: state.eventTypes.filter((evt) => evt.id !== id),
    }));
  },

  createBooking: (bookingData) => {
    const newId = `bk_${Date.now()}`;

    // Auto-generate video meeting link if platform is zoom
    let generatedMeetingUrl = bookingData.meetingUrl || '';
    if (bookingData.platform === 'zoom') {
      const zoomId = Math.floor(1000000000 + Math.random() * 9000000000);
      generatedMeetingUrl = `https://zoom.us/j/${zoomId}?pwd=auto-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newBooking: Booking = {
      ...bookingData,
      meetingUrl: generatedMeetingUrl,
      id: newId,
    };

    set((state) => ({
      bookings: [newBooking, ...state.bookings],
      // Increment event type booking count
      eventTypes: state.eventTypes.map((evt) =>
        evt.id === bookingData.eventTypeId ? { ...evt, bookingCount: evt.bookingCount + 1 } : evt
      ),
    }));

    return newBooking;
  },

  cancelBooking: (id, reason) => {
    set((state) => ({
      bookings: state.bookings.map((bk) =>
        bk.id === id ? { ...bk, status: 'cancelled', cancelReason: reason } : bk
      ),
    }));
  },

  rescheduleBooking: (id, newStartsAt, newEndsAt) => {
    set((state) => ({
      bookings: state.bookings.map((bk) =>
        bk.id === id ? { ...bk, startsAt: newStartsAt, endsAt: newEndsAt, status: 'confirmed' } : bk
      ),
    }));
  },

  setZoomConnected: (connected) =>
    set((state) => ({
      zoom: { ...state.zoom, connected },
    })),

  toggleZoomAutoGenerate: () =>
    set((state) => ({
      zoom: { ...state.zoom, autoGenerateLinks: !state.zoom.autoGenerateLinks },
    })),

  toggleDayActive: (dayIndex) =>
    set((state) => ({
      availability: state.availability.map((day, idx) =>
        idx === dayIndex ? { ...day, active: !day.active } : day
      ),
    })),

  addTimeSlot: (dayIndex) =>
    set((state) => ({
      availability: state.availability.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              slots: [...day.slots, { start: '09:00', end: '17:00' }],
            }
          : day
      ),
    })),

  removeTimeSlot: (dayIndex, slotIndex) =>
    set((state) => ({
      availability: state.availability.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              slots: day.slots.filter((_, sIdx) => sIdx !== slotIndex),
            }
          : day
      ),
    })),

  updateTimeSlot: (dayIndex, slotIndex, start, end) =>
    set((state) => ({
      availability: state.availability.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              slots: day.slots.map((slot, sIdx) =>
                sIdx === slotIndex ? { ...slot, start, end } : slot
              ),
            }
          : day
      ),
    })),
}));
