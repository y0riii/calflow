'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/useStore';
import { Booking } from '@/lib/useStore';
import {
  Calendar,
  Clock,
  Video,
  User,
  Mail,
  Globe,
  XCircle,
  ExternalLink,
  RotateCcw,
  Search,
  FileText,
  Copy,
  Check,
  X,
  Info,
  CheckCircle2,
} from 'lucide-react';

import { cancelBookingAction, rescheduleBookingAction } from '@/app/actions/bookings';

export default function BookingsList() {
  const { bookings, cancelBooking, rescheduleBooking } = useAppStore();
  const [filterStatus, setFilterStatus] = useState<'upcoming' | 'past' | 'cancelled' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Details Modal State
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reschedule Modal State
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-09-05');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');

  // Cancel Modal State
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.eventTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const isPast = new Date(b.startsAt).getTime() < Date.now();

    if (filterStatus === 'upcoming') {
      return matchesSearch && b.status === 'confirmed' && !isPast;
    }
    if (filterStatus === 'past') {
      return matchesSearch && (b.status === 'completed' || (b.status === 'confirmed' && isPast));
    }
    if (filterStatus === 'cancelled') {
      return matchesSearch && b.status === 'cancelled';
    }
    return matchesSearch;
  });

  const handleConfirmCancel = async () => {
    if (selectedBookingForCancel) {
      const numericId = parseInt(selectedBookingForCancel.id.replace(/\D+/g, ''), 10) || parseInt(selectedBookingForCancel.id, 10);
      const reason = cancelReason || 'Canceled by host';
      
      cancelBooking(selectedBookingForCancel.id, reason);
      if (numericId) {
        await cancelBookingAction(numericId, reason);
      }
      
      setSelectedBookingForCancel(null);
      if (selectedBookingForDetails?.id === selectedBookingForCancel.id) {
        setSelectedBookingForDetails(null);
      }
      setCancelReason('');
    }
  };

  const handleConfirmReschedule = async () => {
    if (selectedBookingForReschedule) {
      const newStartsAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      const durationMins = 30;
      const newEndsAt = new Date(new Date(newStartsAt).getTime() + durationMins * 60000).toISOString();
      const numericId = parseInt(selectedBookingForReschedule.id.replace(/\D+/g, ''), 10) || parseInt(selectedBookingForReschedule.id, 10);

      rescheduleBooking(selectedBookingForReschedule.id, newStartsAt, newEndsAt);
      if (numericId) {
        await rescheduleBookingAction(numericId, newStartsAt, newEndsAt);
      }

      setSelectedBookingForReschedule(null);
      if (selectedBookingForDetails?.id === selectedBookingForReschedule.id) {
        setSelectedBookingForDetails(null);
      }
    }
  };

  const handleCopyMeetingUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilterStatus('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterStatus === 'upcoming'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterStatus('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterStatus === 'past'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterStatus === 'cancelled'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Canceled
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Bookings
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search guest name, email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Bookings Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no scheduled bookings matching your selected tab or search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const startDate = new Date(booking.startsAt);
            const endDate = new Date(booking.endsAt);

            return (
              <div
                key={booking.id}
                onClick={() => setSelectedBookingForDetails(booking)}
                className="glass-card rounded-2xl p-5 border border-slate-200 space-y-4 cursor-pointer hover:border-blue-300 transition-all shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  {/* Event Title & Guest Info */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-base text-slate-900">{booking.eventTitle}</span>
                      {booking.status === 'confirmed' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Confirmed
                        </span>
                      )}
                      {booking.status === 'cancelled' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          Canceled
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-bold text-slate-900">{booking.guestName}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{booking.guestEmail}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{booking.guestTimezone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Badge */}
                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-left md:text-right shrink-0">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-700">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {startDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {startDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {endDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes Snippet & Details Button Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    {booking.notes ? (
                      <div className="flex items-center space-x-1.5 bg-blue-50/70 border border-blue-100 px-3 py-1 rounded-lg text-blue-800 font-medium max-w-md truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Notes: {booking.notes}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No preparation notes submitted.</span>
                    )}
                  </div>

                  {/* Booking Actions */}
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedBookingForDetails(booking)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-500 transition"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    {booking.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => setSelectedBookingForReschedule(booking)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>

                        <button
                          onClick={() => setSelectedBookingForCancel(booking)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {booking.status === 'cancelled' && booking.cancelReason && (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <span className="font-bold">Cancellation Reason:</span> {booking.cancelReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedBookingForDetails.eventTitle}
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    {selectedBookingForDetails.status === 'confirmed' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Confirmed Booking
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                        Canceled Booking
                      </span>
                    )}
                    {selectedBookingForDetails.syncedWithGoogle && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Google Calendar Synced</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBookingForDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Guest Profile Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Guest Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Full Name</span>
                    <span className="font-bold text-slate-900 text-sm flex items-center space-x-1.5 mt-0.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>{selectedBookingForDetails.guestName}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Email Address</span>
                    <span className="font-bold text-slate-900 flex items-center space-x-1.5 mt-0.5">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>{selectedBookingForDetails.guestEmail}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Guest Timezone</span>
                    <span className="font-semibold text-slate-700 flex items-center space-x-1.5 mt-0.5">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <span>{selectedBookingForDetails.guestTimezone}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Time & Meeting URL */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Schedule & Video Room
                </h4>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(selectedBookingForDetails.startsAt).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {selectedBookingForDetails.meetingUrl && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-slate-500 block text-[11px]">
                        Video Call Link ({selectedBookingForDetails.platform === 'zoom' ? 'Zoom' : 'Google Meet'}):
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={selectedBookingForDetails.meetingUrl}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyMeetingUrl(selectedBookingForDetails.meetingUrl)}
                          className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition flex items-center space-x-1 shrink-0"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={selectedBookingForDetails.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition flex items-center space-x-1 shrink-0"
                        >
                          <span>Join</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Submitted Answers / Preparation Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Anything that helps prepare for our meeting</span>
                </h4>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-xs text-slate-800 leading-relaxed font-medium">
                  {selectedBookingForDetails.notes ? (
                    <p className="whitespace-pre-wrap">{selectedBookingForDetails.notes}</p>
                  ) : (
                    <span className="text-slate-400 italic">
                      The guest did not leave any additional notes or answers when booking this slot.
                    </span>
                  )}
                </div>
              </div>

              {selectedBookingForDetails.status === 'cancelled' && selectedBookingForDetails.cancelReason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-600">
                    Cancellation Reason
                  </span>
                  <p>{selectedBookingForDetails.cancelReason}</p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedBookingForDetails(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-100 transition"
              >
                Close
              </button>

              {selectedBookingForDetails.status === 'confirmed' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedBookingForReschedule(selectedBookingForDetails);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBookingForCancel(selectedBookingForDetails);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {selectedBookingForReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-slate-900">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span>Reschedule Booking</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pick a new date and start time for{' '}
              <span className="text-slate-900 font-bold">{selectedBookingForReschedule.guestName}</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Start Time</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="14:00">02:00 PM</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedBookingForReschedule(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-slate-900">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Cancel Booking</span>
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel the booking with{' '}
              <span className="text-slate-900 font-bold">{selectedBookingForCancel.guestName}</span>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional explanation sent in cancellation notification email..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedBookingForCancel(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
