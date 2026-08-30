'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/useStore';
import {
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  RotateCcw,
  XCircle,
  Paperclip,
} from 'lucide-react';

export default function EmailNotificationsPreview() {
  const { user, bookings } = useAppStore();
  const [templateType, setTemplateType] = useState<'confirmation' | 'reschedule' | 'cancellation'>(
    'confirmation'
  );

  const sampleBooking = bookings[0] || {
    id: 'b1',
    eventTitle: '30 Min Discovery Call',
    guestName: 'Sarah Jenkins',
    guestEmail: 'sarah.j@acme-corp.io',
    startsAt: '2026-09-02T14:00:00Z',
    endsAt: '2026-09-02T14:30:00Z',
    guestTimezone: 'America/New_York',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    platform: 'zoom',
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Automated Transactional Emails</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preview the exact HTML emails dispatched to guests upon booking, rescheduling, or cancellation.
          </p>
        </div>

        {/* Template Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setTemplateType('confirmation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              templateType === 'confirmation'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Booking Confirmation
          </button>
          <button
            onClick={() => setTemplateType('reschedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              templateType === 'reschedule'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rescheduled Notice
          </button>
          <button
            onClick={() => setTemplateType('cancellation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              templateType === 'cancellation'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancellation Alert
          </button>
        </div>
      </div>

      {/* Email Container Frame */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl max-w-3xl mx-auto">
        {/* Email Header Metadata */}
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 w-16">From:</span>
            <span>{user.name} via CalFlow &lt;notifications@calflow.com&gt;</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 w-16">To:</span>
            <span className="text-blue-600 font-semibold">{sampleBooking.guestEmail}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 w-16">Subject:</span>
            <span className="font-bold text-slate-900">
              {templateType === 'confirmation' && `Confirmed: ${sampleBooking.eventTitle} with ${user.name}`}
              {templateType === 'reschedule' && `Rescheduled: ${sampleBooking.eventTitle} with ${user.name}`}
              {templateType === 'cancellation' && `Canceled: ${sampleBooking.eventTitle} with ${user.name}`}
            </span>
          </div>
        </div>

        {/* Email HTML Body Mock */}
        <div className="p-8 space-y-6 bg-slate-50/50 text-slate-900 text-sm">
          {/* Brand Logo Header */}
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="font-bold text-base text-slate-900">CalFlow</span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              {templateType === 'confirmation' && `You're scheduled with ${user.name}!`}
              {templateType === 'reschedule' && `Your appointment with ${user.name} was rescheduled`}
              {templateType === 'cancellation' && `Appointment with ${user.name} has been canceled`}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hi {sampleBooking.guestName}, details for your upcoming calendar event are below:
            </p>
          </div>

          {/* Event Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
            <div className="font-bold text-base text-blue-700">{sampleBooking.eventTitle}</div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Wednesday, September 2, 2026</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>02:00 PM - 02:30 PM ({sampleBooking.guestTimezone})</span>
              </div>
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong className="text-slate-900">Meeting Location:</strong>{' '}
                  <a href={sampleBooking.meetingUrl} className="text-blue-600 underline">
                    {sampleBooking.meetingUrl}
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* Action Links inside email */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">Manage this booking:</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center space-x-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reschedule Booking</span>
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Booking</span>
              </span>
            </div>
          </div>

          {/* ICS Attachment Notice */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 pt-2">
            <Paperclip className="w-4 h-4 text-slate-400" />
            <span>Attachment included: invite.ics (Google Calendar / Apple Calendar)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
