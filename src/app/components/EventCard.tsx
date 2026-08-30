'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EventType } from '@/lib/useStore';
import { useAppStore } from '@/lib/useStore';
import { deleteEvent } from '@/app/actions/events';
import {
  Clock,
  Video,
  MapPin,
  Link2,
  Copy,
  Check,
  Edit2,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';

interface EventCardProps {
  event: EventType;
  onEdit: (event: EventType) => void;
}

export default function EventCard({ event, onEdit }: EventCardProps) {
  const { deleteEventType, bookings, user } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const upcomingBookingsCount = bookings.filter(
    (b) =>
      (b.eventTypeId === event.id || b.eventTypeId === event.slug || b.eventTitle === event.title) &&
      b.status === 'confirmed' &&
      new Date(b.startsAt).getTime() >= Date.now()
  ).length;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const numericId = parseInt(event.id, 10);
      const res = await deleteEvent(numericId);
      if (res.success) {
        deleteEventType(event.id);
      } else {
        // Fallback for local preview state
        deleteEventType(event.id);
      }
    } catch (err) {
      console.error('Error deleting event type:', err);
      deleteEventType(event.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPlatformBadge = () => {
    switch (event.platform) {
      case 'zoom':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <span>Zoom Video</span>
          </div>
        );
      case 'physical':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>In Person</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
            <Link2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Custom Link</span>
          </div>
        );
    }
  };

  const getBookingWindowLabel = () => {
    if (event.bookingWindowType === 'rolling') {
      return `Rolling ${event.bookingWindowDays || 60} Days`;
    }
    if (event.bookingWindowType === 'range') {
      return `Range: ${event.startDate || ''} to ${event.endDate || ''}`;
    }
    return 'Indefinite Future';
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/book/${user.username}/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-2xl glass-card transition-all duration-300 p-5 flex flex-col justify-between group border border-slate-200 hover:border-slate-300">
      <div className="space-y-3">
        {/* Title, Slug & Action Buttons */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
              {event.title}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">/{event.slug}</p>
          </div>

          <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100 transition pt-0.5">
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Edit Event Type"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
              title="Delete Event Type"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {event.description || 'No description provided.'}
        </p>

        {/* Badges Info */}
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{event.duration} mins</span>
          </div>

          {getPlatformBadge()}

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>{getBookingWindowLabel()}</span>
          </div>
        </div>
      </div>

      {/* Footer Links & Upcoming Count */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        {/* Bottom Left: Number of upcoming bookings */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200/70 text-blue-700 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{upcomingBookingsCount} {upcomingBookingsCount === 1 ? 'Upcoming' : 'Upcoming'}</span>
        </div>

        {/* Bottom Right: Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Booking Link</span>
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
