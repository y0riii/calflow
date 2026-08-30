'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getBookingDetailsAction, rescheduleBookingAction, getAvailableSlots } from '@/app/actions/bookings';
import {
  RotateCcw,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';

interface BookingDetail {
  bookingId: number;
  guestName: string;
  guestEmail: string;
  guestTimezone: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
  event: {
    title: string;
    durationMins: number;
    platform: string;
    location?: string | null;
    slug: string;
  };
  host: {
    username: string;
    email: string;
  };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const jsDay = new Date(year, month, 1).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = parseInt(resolvedParams.id, 10);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Calendar & Slot selection states
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isNaN(bookingId)) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    getBookingDetailsAction(bookingId).then((res) => {
      if (res.success && res.booking) {
        setBooking(res.booking as any);
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    });
  }, [bookingId]);

  // Load slots when date is chosen
  useEffect(() => {
    if (!selectedDate || !booking) {
      setAvailableSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    getAvailableSlots(booking.event.slug, selectedDate).then((res) => {
      if (res.success && res.slots) {
        setAvailableSlots(res.slots);
      } else {
        setAvailableSlots([]);
      }
      setIsLoadingSlots(false);
    });
  }, [selectedDate, booking]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !selectedDate || !selectedSlot) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const [h, m] = selectedSlot.split(':').map(Number);
      const startsAt = new Date(selectedDate);
      startsAt.setHours(h, m, 0, 0);
      const endsAt = new Date(startsAt.getTime() + booking.event.durationMins * 60000);

      const res = await rescheduleBookingAction(bookingId, startsAt.toISOString(), endsAt.toISOString());
      if (res.success) {
        setIsCompleted(true);
      } else {
        setSubmitError(res.message || 'Failed to reschedule the booking.');
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatSlotDisplay = (slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Calendar rendering helpers
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isPrevDisabled = calYear === today.getFullYear() && calMonth === today.getMonth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Loading booking details…</span>
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Booking Not Found</h1>
          <p className="text-sm text-slate-500">This booking does not exist or may have been canceled.</p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
            >
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Reschedule Appointment</h1>
            <p className="text-xs text-slate-500">Select a new date & time with @{booking.host.username}</p>
          </div>
        </div>

        {!isCompleted ? (
          <form onSubmit={handleConfirmReschedule} className="space-y-6">
            {/* Existing Booking Card Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-blue-700 block text-sm">{booking.event.title}</span>
              <p className="text-slate-600">
                <strong className="text-slate-900">Guest:</strong> {booking.guestName} ({booking.guestEmail})
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Currently Scheduled:</strong>{' '}
                {new Date(booking.startsAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(booking.startsAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({booking.guestTimezone})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Calendar Grid */}
              <div className="md:col-span-7 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={isPrevDisabled}
                      onClick={prevMonth}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase pb-1">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d}>{d}</span>)}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
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
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedSlot(null);
                        }}
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

              {/* Slots Column */}
              <div className="md:col-span-5 space-y-2">
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
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between
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

            {submitError && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <Link
                href="/dashboard"
                className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel & Back</span>
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm New Date</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Reschedule Confirmed!</h2>
            <p className="text-xs text-slate-600">
              Your booking has been rescheduled and a confirmation email has been dispatched to both parties.
            </p>

            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
              >
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
