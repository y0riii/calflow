import { create } from 'zustand';
import {
  EventType,
  Booking,
  GoogleCalendarConfig,
  ZoomConfig,
  DayAvailability,
  INITIAL_EVENT_TYPES,
  INITIAL_BOOKINGS,
  INITIAL_GOOGLE_CALENDAR,
  INITIAL_ZOOM,
  INITIAL_USER,
  INITIAL_AVAILABILITY,
} from './mockData';

interface AppStore {
  user: typeof INITIAL_USER;
  eventTypes: EventType[];
  bookings: Booking[];
  googleCalendar: GoogleCalendarConfig;
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
  addEventType: (event: Omit<EventType, 'id' | 'bookingCount'>) => EventType;
  updateEventType: (id: string, event: Partial<EventType>) => void;
  deleteEventType: (id: string) => void;

  createBooking: (bookingData: Omit<Booking, 'id' | 'syncedWithGoogle' | 'googleCalendarEventId'>) => Booking;
  cancelBooking: (id: string, reason: string) => void;
  rescheduleBooking: (id: string, newStartsAt: string, newEndsAt: string) => void;

  // Integration Actions
  toggleGoogleCalendarConnect: () => void;
  setGoogleConnected: (connected: boolean) => void;
  toggleGoogleAutoSync: () => void;
  setPrimaryCalendar: (calendarName: string) => void;
  triggerGoogleSync: () => void;
  updateGoogleCalendarConfig: (config: Partial<GoogleCalendarConfig>) => void;

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
  googleCalendar: INITIAL_GOOGLE_CALENDAR,
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
    const newId = `evt_${Date.now()}`;
    const newEvent: EventType = {
      ...eventData,
      id: newId,
      bookingCount: 0,
    };
    set((state) => ({
      eventTypes: [newEvent, ...state.eventTypes],
    }));
    return newEvent;
  },

  updateEventType: (id, eventData) => {
    set((state) => ({
      eventTypes: state.eventTypes.map((evt) =>
        evt.id === id ? { ...evt, ...eventData } : evt
      ),
    }));
  },

  deleteEventType: (id) => {
    set((state) => ({
      eventTypes: state.eventTypes.filter((evt) => evt.id !== id),
    }));
  },

  createBooking: (bookingData) => {
    const newId = `bk_${Date.now()}`;
    const isGoogleConnected = get().googleCalendar.connected && get().googleCalendar.autoSync;

    // Auto-generate video meeting link if platform is meet or zoom
    let generatedMeetingUrl = bookingData.meetingUrl || '';
    if (bookingData.platform === 'meet') {
      const code = Math.random().toString(36).substring(2, 5) + '-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 5);
      generatedMeetingUrl = `https://meet.google.com/${code}`;
    } else if (bookingData.platform === 'zoom') {
      const zoomId = Math.floor(1000000000 + Math.random() * 9000000000);
      generatedMeetingUrl = `https://zoom.us/j/${zoomId}?pwd=auto-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newBooking: Booking = {
      ...bookingData,
      meetingUrl: generatedMeetingUrl,
      id: newId,
      syncedWithGoogle: isGoogleConnected,
      googleCalendarEventId: isGoogleConnected ? `gcal_${Math.floor(Math.random() * 100000000)}` : undefined,
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
        bk.id === id
          ? {
            ...bk,
            startsAt: newStartsAt,
            endsAt: newEndsAt,
            status: 'confirmed',
          }
          : bk
      ),
    }));
  },

  toggleGoogleCalendarConnect: () => {
    set((state) => ({
      googleCalendar: {
        ...state.googleCalendar,
        connected: !state.googleCalendar.connected,
        lastSyncedAt: new Date().toISOString(),
      },
    }));
  },

  setGoogleConnected: (connected) => {
    set((state) => ({
      googleCalendar: {
        ...state.googleCalendar,
        connected,
        lastSyncedAt: new Date().toISOString(),
      },
    }));
  },

  toggleGoogleAutoSync: () => {
    set((state) => ({
      googleCalendar: {
        ...state.googleCalendar,
        autoSync: !state.googleCalendar.autoSync,
      },
    }));
  },

  setPrimaryCalendar: (calendarName) => {
    set((state) => ({
      googleCalendar: {
        ...state.googleCalendar,
        primaryCalendar: calendarName,
      },
    }));
  },

  triggerGoogleSync: () => {
    set((state) => ({
      googleCalendar: {
        ...state.googleCalendar,
        lastSyncedAt: new Date().toISOString(),
      },
    }));
  },

  updateGoogleCalendarConfig: (config) => {
    set((state) => ({
      googleCalendar: { ...state.googleCalendar, ...config },
    }));
  },

  setZoomConnected: (connected) => {
    set((state) => ({
      zoom: {
        ...state.zoom,
        connected,
      },
    }));
  },

  toggleZoomAutoGenerate: () => {
    set((state) => ({
      zoom: {
        ...state.zoom,
        autoGenerateLinks: !state.zoom.autoGenerateLinks,
      },
    }));
  },

  // Availability Actions
  toggleDayActive: (dayIndex) => {
    set((state) => ({
      availability: state.availability.map((day, i) =>
        i === dayIndex ? { ...day, active: !day.active } : day
      ),
    }));
  },

  addTimeSlot: (dayIndex) => {
    set((state) => ({
      availability: state.availability.map((day, i) =>
        i === dayIndex
          ? { ...day, slots: [...day.slots, { start: '17:00', end: '18:00' }] }
          : day
      ),
    }));
  },

  removeTimeSlot: (dayIndex, slotIndex) => {
    set((state) => ({
      availability: state.availability.map((day, i) =>
        i === dayIndex
          ? { ...day, slots: day.slots.filter((_, sIndex) => sIndex !== slotIndex) }
          : day
      ),
    }));
  },

  updateTimeSlot: (dayIndex, slotIndex, start, end) => {
    set((state) => ({
      availability: state.availability.map((day, i) =>
        i === dayIndex
          ? {
            ...day,
            slots: day.slots.map((s, sIndex) =>
              sIndex === slotIndex ? { start, end } : s
            ),
          }
          : day
      ),
    }));
  },
}));
