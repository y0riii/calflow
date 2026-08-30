'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/useStore';
import { getAvailablity, updateAvailability } from '@/app/actions/events';
import { weeklyAvailabilitySchema, type WeeklyAvailabilityInput } from '@/app/schemas/events';
import { DayAvailability } from '@/lib/mockData';
import { Clock, Plus, Trash2, Globe, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityEditor() {
  const { user, availability, setAvailability, toggleDayActive, addTimeSlot, removeTimeSlot, updateTimeSlot } =
    useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await getAvailablity();
        if (res.success && res.availability && res.availability.length > 0) {
          // Group DB availability items by dayOfWeek
          const dayMap: Record<number, { start: string; end: string }[]> = {};
          res.availability.forEach((item: any) => {
            const dayNum = item.dayOfWeek;
            if (!dayMap[dayNum]) dayMap[dayNum] = [];
            const startTimeStr = typeof item.startTime === 'string'
              ? item.startTime.substring(11, 16) || '09:00'
              : new Date(item.startTime).toISOString().substring(11, 16);
            const endTimeStr = typeof item.endTime === 'string'
              ? item.endTime.substring(11, 16) || '17:00'
              : new Date(item.endTime).toISOString().substring(11, 16);
            dayMap[dayNum].push({ start: startTimeStr, end: endTimeStr });
          });

          const formattedAvailability: DayAvailability[] = DAYS.map((dayName, index) => {
            const slots = dayMap[index];
            const active = !!(slots && slots.length > 0);
            return {
              day: dayName,
              active,
              slots: active ? slots : [{ start: '09:00', end: '17:00' }],
            };
          });

          setAvailability(formattedAvailability);
        }
      } catch (err) {
        console.error('Failed to load availability:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAvailability();
  }, [setAvailability]);

  const handleSaveAvailability = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Format current UI state into WeeklyAvailabilityInput schema structure
      const payload: WeeklyAvailabilityInput = availability
        .filter((day) => day.active)
        .map((day) => {
          const dayOfWeek = DAYS.indexOf(day.day);
          const intervals = day.slots.map((slot) => ({
            startTime: slot.start,
            endTime: slot.end,
          }));
          return {
            dayOfWeek,
            intervals,
          };
        });

      // Validate with Zod schema
      const parseResult = weeklyAvailabilitySchema.safeParse(payload);
      if (!parseResult.success) {
        setErrorMessage('Invalid time format. Times must be in HH:mm format.');
        setIsSaving(false);
        return;
      }

      // Call updateAvailability Server Action
      const res = await updateAvailability(parseResult.data);
      if (res.success) {
        setSuccessMessage('Availability schedule saved successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.message || 'Failed to update availability.');
      }
    } catch (err) {
      console.error('Error saving availability:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Weekly Working Availability</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default working hours across the week. Open slots will be automatically filtered against your Google Calendar events.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-800">{user.timezone || 'Eastern Time (US & Canada)'}</span>
          </div>

          <button
            onClick={handleSaveAvailability}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Availability</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500 text-xs space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading availability schedule…</span>
        </div>
      ) : (
        /* Days List */
        <div className="space-y-4">
          {availability.map((daySchedule, dayIndex) => (
            <div
              key={daySchedule.day}
              className={`glass-card p-5 rounded-2xl border transition-all ${
                daySchedule.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/50 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Day Toggle */}
                <div className="flex items-center space-x-3 w-40">
                  <button
                    onClick={() => toggleDayActive(dayIndex)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      daySchedule.active ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        daySchedule.active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-sm text-slate-900">{daySchedule.day}</span>
                </div>

                {/* Time Slots */}
                {daySchedule.active ? (
                  <div className="flex-1 space-y-2">
                    {daySchedule.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            updateTimeSlot(dayIndex, slotIndex, e.target.value, slot.end)
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                        />
                        <span className="text-xs text-slate-400 font-semibold">-</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            updateTimeSlot(dayIndex, slotIndex, slot.start, e.target.value)
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                        />

                        {daySchedule.slots.length > 1 && (
                          <button
                            onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-slate-400 italic">Unavailable / Day Off</div>
                )}

                {/* Add Slot Button */}
                {daySchedule.active && (
                  <button
                    onClick={() => addTimeSlot(dayIndex)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add Time Slot</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
