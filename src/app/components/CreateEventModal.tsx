'use client';

import React, { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/lib/useStore';
import { EventType } from '@/lib/useStore';
import {
  createEventSchema,
  type CreateEventFormInput,
  type CreateEventFormOutput,
} from '@/app/schemas/events';
import CustomInput from '@/app/components/CustomInput';
import { createEvent, updateEvent, deleteEvent, getAvailablity } from '@/app/actions/events';
import { getConnectedIntegrationsAction } from '@/app/actions/integrations';
import { Platform } from '@prisma/client';
import {
  X,
  Video,
  MapPin,
  Sparkles,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: EventType | null;
}

const PLATFORM_OPTIONS = [
  {
    value: Platform.zoom,
    label: 'Zoom Video',
    description: 'Auto-generates unique Zoom room & password.',
    icon: <Video className="w-4 h-4 text-blue-600" />,
    bg: 'bg-blue-100 border-blue-200',
    selected: 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500',
    checkBg: 'bg-blue-600',
  },
  {
    value: Platform.physical,
    label: 'In-Person Meeting',
    description: 'Specify a physical address or meeting spot.',
    icon: <MapPin className="w-4 h-4 text-amber-600" />,
    bg: 'bg-amber-100 border-amber-200',
    selected: 'bg-amber-50/60 border-amber-500 ring-1 ring-amber-500',
    checkBg: 'bg-amber-600',
  },
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 Minutes' },
  { value: '30', label: '30 Minutes' },
  { value: '45', label: '45 Minutes' },
  { value: '60', label: '60 Minutes (1 Hour)' },
  { value: '90', label: '90 Minutes' },
  { value: '120', label: '120 Minutes (2 Hours)' },
];

export default function CreateEventModal({ isOpen, onClose, initialEvent }: CreateEventModalProps) {
  const { addEventType, updateEventType: updateStoreEvent, deleteEventType, zoom, setZoomConnected, setActiveTab } = useAppStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(true);

  const handleDeleteEvent = async () => {
    if (!initialEvent || isDeleting) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const numericId = parseInt(initialEvent.id, 10);
      const res = await deleteEvent(numericId);
      if (res.success) {
        deleteEventType(initialEvent.id);
        onClose();
      } else {
        setServerError(res.message || 'Failed to delete event type.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setServerError('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventFormInput, any, CreateEventFormOutput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: '30',
      platform: Platform.zoom,
      location: '',
      minNoticeMins: 240,
      rollingWindowDays: 60,
    },
  });

  // Sync initial event data when editing
  useEffect(() => {
    setServerError(null);
    if (initialEvent) {
      reset({
        title: initialEvent.title,
        description: initialEvent.description,
        duration: String(initialEvent.duration) as CreateEventFormInput['duration'],
        platform: (initialEvent.platform === 'custom' ? Platform.physical : initialEvent.platform) as Platform,
        location: initialEvent.customLocation || '',
        minNoticeMins: (initialEvent.minNoticeHours || 4) * 60,
        rollingWindowDays: initialEvent.bookingWindowDays || 60,
      });
    } else {
      reset({
        title: '',
        description: '',
        duration: '30',
        platform: Platform.zoom,
        location: '',
        minNoticeMins: 240,
        rollingWindowDays: 60,
      });
    }

    if (isOpen) {
      getConnectedIntegrationsAction().then((res) => {
        if (res.success && res.integrations) {
          setZoomConnected(res.integrations.includes('zoom'));
        }
      });
      getAvailablity().then((res) => {
        const isAvail = Boolean(res.success && res.availability && res.availability.length > 0);
        setHasAvailability(isAvail);
        if (!isAvail) {
          setServerError('You must set your availability schedule first before creating or updating an event type.');
        }
      });
    }
  }, [initialEvent, isOpen, reset, setZoomConnected]);

  const selectedPlatform = watch('platform');

  const onSubmit: SubmitHandler<CreateEventFormOutput> = async (data) => {
    setServerError(null);
    if (!hasAvailability) {
      setServerError('You must set your availability schedule first before creating or updating an event type.');
      return;
    }
    if (data.platform === Platform.zoom && !zoom.connected) {
      setServerError('You must connect a Zoom account in Profile Settings before creating a Zoom event.');
      return;
    }
    try {
      if (initialEvent) {
        const numericId = parseInt(initialEvent.id, 10);
        const res = await updateEvent(numericId, data);
        if (res.success) {
          updateStoreEvent(initialEvent.id, {
            title: data.title,
            description: data.description,
            duration: Number(data.duration),
            platform: data.platform as any,
            customLocation: data.location || '',
            bookingWindowDays: data.rollingWindowDays,
            minNoticeHours: Math.round(data.minNoticeMins / 60),
          });
          onClose();
        } else {
          setServerError(res.message || 'Failed to update event type.');
        }
      } else {
        const res = await createEvent(data);
        if (res.success) {
          const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          if(!res.eventType) return;
          addEventType({
            id: String(res.eventType.eventId),
            title: data.title,
            slug,
            description: data.description,
            duration: Number(data.duration),
            platform: data.platform as any,
            customLocation: data.location || '',
            color: 'indigo',
            bookingWindowType: 'rolling',
            bookingWindowDays: data.rollingWindowDays,
            minNoticeHours: Math.round(data.minNoticeMins / 60),
            bufferBeforeMins: 0,
            bufferAfterMins: 0,
          });
          onClose();
        } else {
          setServerError(res.message || 'Failed to create event type.');
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      setServerError('An unexpected error occurred while saving the event type.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialEvent ? 'Edit Event Type' : 'Create New Event Type'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure booking details and video platform for this event.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {serverError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{serverError}</span>
            </div>
            {!hasAvailability && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('availability');
                  onClose();
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 transition shrink-0 ml-2"
              >
                Set Schedule
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Title using CustomInput */}
            <CustomInput
              label="Event Title *"
              type="text"
              placeholder="e.g. 30 Min Discovery Call"
              error={errors.title?.message}
              {...register('title')}
            />

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Description / Instructions for Invitees *
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe what this meeting is about..."
                className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                  errors.description
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
                {...register('description')}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Duration *
              </label>
              <select
                className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition-all ${
                  errors.duration
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
                {...register('duration')}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.duration && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.duration.message}</p>
              )}
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Meeting Platform *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORM_OPTIONS.map((opt) => {
                  const isSelected = selectedPlatform === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('platform', opt.value, { shouldValidate: true })}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        isSelected ? opt.selected : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${opt.bg}`}>
                          {opt.icon}
                        </div>
                        {isSelected && (
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${opt.checkBg}`}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-xs text-slate-900 block">{opt.label}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              {errors.platform && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.platform.message}</p>
              )}

              {selectedPlatform === Platform.zoom && !zoom.connected && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">Zoom Account Required</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      You have not connected a Zoom account yet. Please connect your Zoom account in{' '}
                      <a href="/profile" target="_blank" className="font-bold underline hover:text-amber-900">
                        Profile Settings
                      </a>{' '}
                      before creating a Zoom meeting event.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location — shown when platform is physical using CustomInput */}
            {selectedPlatform === Platform.physical && (
              <CustomInput
                label="Physical Address / Location"
                type="text"
                placeholder="e.g. 742 Evergreen Terrace, Suite 300, SF"
                error={errors.location?.message}
                {...register('location')}
              />
            )}

            {/* Booking Window & Notice */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Min. Notice (minutes)</span>
                </label>
                <select
                  className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition-all ${
                    errors.minNoticeMins
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                  {...register('minNoticeMins', { valueAsNumber: true })}
                >
                  <option value={60}>60 mins (1 hour)</option>
                  <option value={240}>240 mins (4 hours)</option>
                  <option value={720}>720 mins (12 hours)</option>
                  <option value={1440}>1440 mins (24 hours)</option>
                </select>
                {errors.minNoticeMins && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.minNoticeMins.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Rolling Window (days)
                </label>
                <select
                  className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition-all ${
                    errors.rollingWindowDays
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                  {...register('rollingWindowDays', { valueAsNumber: true })}
                >
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
                {errors.rollingWindowDays && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.rollingWindowDays.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              {initialEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={isDeleting || isSubmitting}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 text-xs font-semibold hover:bg-rose-100 transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Delete Event'}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-all disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : initialEvent ? 'Save Changes' : 'Create Event Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
