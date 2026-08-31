'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/app/components/Navbar';
import EventCard from '@/app/components/EventCard';
import CreateEventModal from '@/app/components/CreateEventModal';
import BookingsList from '@/app/components/BookingsList';
import AvailabilityEditor from '@/app/components/AvailabilityEditor';
import { useAppStore } from '@/lib/useStore';
import { EventType } from '@/lib/useStore';
import { getMyEvents, getMyBookings } from '@/app/actions/events';
import { getCurrentUser } from '@/app/actions/authentication';
import { getConnectedIntegrationsAction } from '@/app/actions/integrations';
import { Plus, Layers, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { activeTab, eventTypes, setEventTypes, setBookings, bookings, user, updateUser, setZoomConnected } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsRes, bookingsRes, userRes, integrationsRes] = await Promise.all([
          getMyEvents(),
          getMyBookings(),
          getCurrentUser(),
          getConnectedIntegrationsAction(),
        ]);

        if (userRes) {
          updateUser({
            name: userRes.username,
            username: userRes.username,
            email: userRes.email,
            timezone: userRes.timezone || 'America/New_York',
          });
        }

        if (eventsRes.success && 'events' in eventsRes && eventsRes.events) {
          const loadedEvents: EventType[] = eventsRes.events.map((e) => ({
            id: String(e.eventId),
            title: e.title,
            slug: e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            description: e.description || '',
            duration: e.durationMins,
            platform: e.platform as any,
            customLocation: e.location || '',
            color: 'indigo',
            bookingWindowType: 'rolling',
            bookingWindowDays: e.rollingWindowDays,
            minNoticeHours: Math.round(e.minNoticeMins / 60),
            bufferBeforeMins: 0,
            bufferAfterMins: 0,
            bookingCount: e.bookingCount || 0,
          }));
          setEventTypes(loadedEvents);
        }

        if (bookingsRes.success && bookingsRes.bookings) {
          setBookings(bookingsRes.bookings as any);
        }

        if (integrationsRes.success && integrationsRes.integrations) {
          setZoomConnected(integrationsRes.integrations.includes('zoom'));
        }
      } catch (err) {
        console.error('Failed to load data from DB:', err);
      } finally {
        setIsLoadingEvents(false);
      }
    }
    loadData();
  }, [setEventTypes, setBookings, updateUser]);

  const upcomingBookingsCount = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.startsAt).getTime() >= Date.now()
  ).length;

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: EventType) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  if (isLoadingEvents) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header & Quick Stats */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden bg-white shadow-sm">
          <div className="space-y-2 z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user.username || user.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Manage your event types, configure custom booking windows, auto-generate meeting video rooms, and specify your availability schedule.
            </p>
          </div>

          {/* Action & Stats Row */}
          <div className="flex flex-wrap items-center gap-4 z-10">
            <div className="flex items-center space-x-6 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Event Types
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {eventTypes.length} <span className="text-xs font-normal text-slate-500">Total</span>
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Upcoming
                </span>
                <span className="text-lg font-bold text-blue-600">{upcomingBookingsCount} Bookings</span>
              </div>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event Type</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Event Types */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Your Event Types</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure booking windows, durations, availability, and video platform options.
                </p>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="hidden sm:flex items-center space-x-1.5 text-xs text-blue-700 hover:text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event Type</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventTypes.map((event) => (
                <EventCard key={event.id} event={event} onEdit={handleEditEvent} />
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Bookings */}
        {activeTab === 'bookings' && <BookingsList />}

        {/* Tab 3: Availability */}
        {activeTab === 'availability' && <AvailabilityEditor />}
      </main>

      {/* Create / Edit Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEvent={editingEvent}
      />
    </div>
  );
}