'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getBookingDetailsAction, cancelBookingAction } from '@/app/actions/bookings';
import { XCircle, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface BookingDetail {
  bookingId: number;
  guestName: string;
  guestEmail: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
  notes?: string | null;
  event: {
    title: string;
    durationMins: number;
    platform: string;
    location?: string | null;
  };
  host: {
    username: string;
    email: string;
  };
}

export default function CancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = parseInt(resolvedParams.id, 10);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCanceled, setIsCanceled] = useState(false);

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

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await cancelBookingAction(bookingId, reason || 'Canceled by guest');
      if (res.success) {
        setIsCanceled(true);
      } else {
        setCancelError(res.message || 'Failed to cancel the booking.');
      }
    } catch {
      setCancelError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
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
          <p className="text-sm text-slate-500">This booking may have already been cancelled or does not exist.</p>
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
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Cancel Booking</h1>
            <p className="text-xs text-slate-500">Cancel appointment with @{booking.host.username}</p>
          </div>
        </div>

        {!isCanceled ? (
          <form onSubmit={handleConfirmCancel} className="space-y-5">
            {/* Booking info card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-rose-700 block text-sm">{booking.event.title}</span>
              <p className="text-slate-600">
                <strong className="text-slate-900">Guest:</strong> {booking.guestName} ({booking.guestEmail})
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-900">Scheduled Time:</strong>{' '}
                {new Date(booking.startsAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(booking.startsAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Let host know why you are canceling..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {cancelError && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Keep Booking</span>
              </Link>

              <button
                type="submit"
                disabled={isCancelling}
                className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-500 transition disabled:opacity-60 flex items-center space-x-1.5"
              >
                {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Booking Canceled</h2>
            <p className="text-xs text-slate-600">
              This event has been removed from schedules and a cancellation email was dispatched to both parties.
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
