'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEventBySlug, PublicEventDetail } from '@/app/actions/events';
import { createBookingAction, getAvailableSlots } from '@/app/actions/bookings';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  Link2,
  ChevronLeft,
  ChevronRight,
  Globe,
  User,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface BookingClientProps {
  eventSlug: string;
  username?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const jsDay = new Date(year, month, 1).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function BookingClient({ eventSlug, username }: BookingClientProps) {
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestTimezone, setGuestTimezone] = useState('America/New_York');

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmedBookingId, setConfirmedBookingId] = useState<number | null>(null);

  useEffect(() => {
    getEventBySlug(eventSlug, username).then((res) => {
      if (res.success && res.event) {
        setEvent(res.event);
        setGuestTimezone(res.event.timezone || 'America/New_York');
      } else {
        setNotFound(true);
      }
      setIsLoadingEvent(false);
    });
  }, [eventSlug, username]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    getAvailableSlots(eventSlug, selectedDate, username, guestTimezone).then((res) => {
      if (res.success && res.slots) {
        setAvailableSlots(res.slots);
      } else {
        setAvailableSlots([]);
      }
      setIsLoadingSlots(false);
    });
  }, [selectedDate, eventSlug, username, guestTimezone]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !selectedDate || !selectedSlot) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Calculate absolute UTC date/time based on guestTimezone
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedSlot.split(':').map(Number);
      const approxDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

      const tzStr = approxDate.toLocaleString('en-US', { timeZone: guestTimezone, hour12: false });
      const [dPart, tPart] = tzStr.split(', ');
      const [m, d, y] = dPart.split('/').map(Number);
      const [h, min] = tPart.split(':').map(Number);
      const tzDate = new Date(Date.UTC(y, m - 1, d, h % 24, min, 0));
      const offsetMs = tzDate.getTime() - approxDate.getTime();

      const startsAt = new Date(approxDate.getTime() - offsetMs);
      const endsAt = new Date(startsAt.getTime() + event.durationMins * 60000);

      const res = await createBookingAction({
        eventId: event.eventId,
        hostId: event.hostId,
        guestName,
        guestEmail,
        guestTimezone,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes,
      });

      if (res.success && res.bookingId) {
        setConfirmedBookingId(res.bookingId);
        setStep(3);
      } else {
        setSubmitError(res.message || 'Failed to complete booking.');
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'meet') return <Video className="w-4 h-4 text-emerald-600" />;
    if (platform === 'zoom') return <Video className="w-4 h-4 text-blue-600" />;
    if (platform === 'physical') return <MapPin className="w-4 h-4 text-amber-600" />;
    return <Link2 className="w-4 h-4 text-purple-600" />;
  };

  const getPlatformLabel = (platform: string, location: string | null) => {
    if (platform === 'meet') return 'Google Meet';
    if (platform === 'zoom') return 'Zoom Video';
    return location || 'In-Person Meeting';
  };

  // Calendar rendering helpers
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isPrevDisabled = calYear === today.getFullYear() && calMonth === today.getMonth();

  // Format selected slot for display
  const formatSlotDisplay = (slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Loading / not found states
  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Loading event…</span>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Event Not Found</h1>
          <p className="text-sm text-slate-500">This booking link may have been removed or changed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">

        {/* Step Indicator Top Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {event.hostUsername[0].toUpperCase()}
            </span>
            <span>@{event.hostUsername}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-bold truncate max-w-[160px]">{event.title}</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {(['1. Date & Time', '2. Your Details', '3. Confirmed'] as const).map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="text-slate-300">→</span>}
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                  step === i + 1
                    ? i === 2 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                    : step > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          {/* Left Sidebar */}
          <div className="md:col-span-4 p-6 sm:p-8 border-b md:border-r md:border-b-0 border-slate-200 bg-slate-50/60 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">Host</h4>
                  <h3 className="text-base font-bold text-slate-900">@{event.hostUsername}</h3>
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{event.title}</h1>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {event.description || 'Select an available date and time to confirm your appointment.'}
                </p>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center space-x-2.5 text-slate-700 font-semibold">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{event.durationMins} Minutes</span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-700 font-semibold">
                  {getPlatformIcon(event.platform)}
                  <span>{getPlatformLabel(event.platform, event.location)}</span>
                </div>
                <div className="flex items-center space-x-2.5 text-slate-700 font-semibold">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span>{guestTimezone}</span>
                </div>
              </div>

              {selectedDate && selectedSlot && step >= 2 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
                  <p className="font-bold text-blue-800 flex items-center space-x-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>{formatDateDisplay(selectedDate)}</span>
                  </p>
                  <p className="font-semibold text-blue-700 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatSlotDisplay(selectedSlot)}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your information is kept private and secure.</span>
            </div>
          </div>

          {/* Right Panel */}
          <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between bg-white">

            {/* STEP 1: Date & Time Picker */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-slate-900">Select Date & Time</h2>
                  <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={guestTimezone}
                      onChange={(e) => setGuestTimezone(e.target.value)}
                      className="bg-transparent text-slate-700 font-semibold focus:outline-none"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                  {/* Calendar */}
                  <div className="sm:col-span-7 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">
                        {MONTH_NAMES[calMonth]} {calYear}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          disabled={isPrevDisabled}
                          onClick={prevMonth}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={nextMonth} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase pb-1">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                      {/* Empty cells for offset */}
                      {Array.from({ length: firstDay }).map((_, i) => <span key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const isPast = dateStr < todayStr;
                        const isSelected = selectedDate === dateStr;
                        const isToday = dateStr === todayStr;
                        return (
                          <button
                            key={dayNum}
                            disabled={isPast}
                            onClick={() => handleDayClick(dateStr)}
                            className={`h-9 rounded-xl flex items-center justify-center transition-all text-xs font-bold
                              ${isSelected ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300' :
                                isPast ? 'text-slate-300 cursor-not-allowed' :
                                isToday ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100' :
                                'text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200'
                              }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="sm:col-span-5 space-y-2">
                    <div className="text-xs font-bold text-slate-700 mb-3">
                      {selectedDate ? `Slots for ${formatDateDisplay(selectedDate)}` : 'Pick a date first'}
                    </div>
                    {!selectedDate ? (
                      <div className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">
                        Select a date to see available slots
                      </div>
                    ) : isLoadingSlots ? (
                      <div className="flex items-center justify-center py-12 space-x-2 text-slate-500 text-xs font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Checking availability…</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-8 border border-dashed border-rose-200 bg-rose-50/20 text-rose-700 rounded-xl font-medium">
                        No slots available on this date.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between
                                ${isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                            >
                              <span>{formatSlotDisplay(slot)}</span>
                              {isSelected && <span className="text-[10px] uppercase font-bold opacity-80">Selected</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition disabled:opacity-40"
                  >
                    <span>Enter Your Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Guest Details Form */}
            {step === 2 && (
              <form onSubmit={handleBookingSubmit} className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Calendar</span>
                  </button>
                  <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {formatDateDisplay(selectedDate)} at {selectedSlot ? formatSlotDisplay(selectedSlot) : ''}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">Enter Your Details</h2>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border ${
                        fieldErrors.guestName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-blue-600'
                      } text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition`}
                    />
                  </div>
                  {fieldErrors.guestName && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{fieldErrors.guestName[0]}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g. sarah@company.com"
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border ${
                        fieldErrors.guestEmail ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-blue-600'
                      } text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition`}
                    />
                  </div>
                  {fieldErrors.guestEmail ? (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{fieldErrors.guestEmail[0]}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Your confirmation will be sent here.</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Anything to help prepare for our meeting</span>
                    <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Topics to discuss, project context, or specific questions…"
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border ${
                      fieldErrors.notes ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-blue-600'
                    } text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition resize-none`}
                  />
                  {fieldErrors.notes && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">{fieldErrors.notes[0]}</p>
                  )}
                </div>

                {submitError && (
                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-500 transition disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scheduling…</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Booking</span>
                        <Sparkles className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Confirmation */}
            {step === 3 && confirmedBookingId && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">You're Scheduled!</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    A confirmation has been sent to{' '}
                    <span className="text-blue-600 font-bold">{guestEmail}</span>.
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3">
                  <p className="font-bold text-sm text-blue-700">{event.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 font-semibold">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                      <span>{formatDateDisplay(selectedDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{selectedSlot ? formatSlotDisplay(selectedSlot) : ''} ({guestTimezone})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{guestName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(event.platform)}
                      <span>{getPlatformLabel(event.platform, event.location)}</span>
                    </div>
                  </div>
                  {notes && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Your notes</p>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Link
                    href={`/${event.hostUsername}/events`}
                    className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
                  >
                    View other events by @{event.hostUsername}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
