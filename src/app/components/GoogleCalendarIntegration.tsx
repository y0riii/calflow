'use client';

import React from 'react';
import { useAppStore } from '@/lib/useStore';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Video,
  ShieldCheck,
  Calendar,
  Zap,
} from 'lucide-react';

export default function GoogleCalendarIntegration() {
  const { googleCalendar, setGoogleConnected, setPrimaryCalendar, triggerGoogleSync } =
    useAppStore();

  return (
    <div className="space-y-6">
      {/* Top Main Connection Banner Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Calendar className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">Google Calendar Integration</h2>
                {googleCalendar.connected ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected & Active</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Automatically sync bookings to your Google Calendar, check for conflicting events, and auto-generate Google Meet rooms for invitees.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {googleCalendar.connected && (
              <button
                onClick={triggerGoogleSync}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Sync Now</span>
              </button>
            )}

            <button
              onClick={() => setGoogleConnected(!googleCalendar.connected)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${googleCalendar.connected
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
            >
              {googleCalendar.connected ? 'Disconnect Google Account' : 'Connect Google Account'}
            </button>
          </div>
        </div>

        {googleCalendar.connected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Account Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-semibold block">Connected Account</span>
              <span className="font-bold text-slate-900 block">{googleCalendar.accountEmail}</span>
              <span className="text-[11px] text-emerald-600 font-medium">
                Last synced: {new Date(googleCalendar.lastSyncedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Target Primary Calendar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-semibold block">Target Calendar</span>
              <select
                value={googleCalendar.primaryCalendar}
                onChange={(e) => setPrimaryCalendar(e.target.value)}
                className="w-full mt-1 bg-white border border-slate-200 text-slate-900 rounded-lg p-1 text-xs focus:outline-none"
              >
                <option value="Primary Google Calendar">Primary Google Calendar</option>
                <option value="Work Meetings Calendar">Work Meetings Calendar</option>
                <option value="Personal Calendar">Personal Calendar</option>
              </select>
            </div>

            {/* Auto Google Meet Status */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-semibold block">Video Platform Link</span>
              <div className="flex items-center space-x-1.5 text-emerald-700 font-bold mt-1">
                <Video className="w-4 h-4 text-emerald-600" />
                <span>Auto Google Meet Enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Real-Time Conflict Prevention</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            CalFlow queries your Google Calendar in real time before presenting open time slots to invitees, eliminating double-booking entirely.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">2-Way Invitation Sync</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bookings created by guests automatically append to both your Google Calendar and the guest&apos;s calendar with `.ics` invitations and meet links.
          </p>
        </div>
      </div>
    </div>
  );
}
