import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getHostEventsByUsername, PublicEvent } from '@/app/actions/events';
import { Clock, Video, MapPin, Link2, Calendar, ArrowRight, User } from 'lucide-react';

interface PageProps {
  params: Promise<{ username: string }>;
}

function getPlatformInfo(platform: string) {
  switch (platform) {
    case 'meet':
      return { label: 'Google Meet', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: Video };
    case 'zoom':
      return { label: 'Zoom', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Video };
    case 'physical':
      return { label: 'In Person', color: 'bg-amber-50 border-amber-200 text-amber-700', icon: MapPin };
    default:
      return { label: 'Custom Link', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Link2 };
  }
}

export default async function PublicEventsPage({ params }: PageProps) {
  const { username } = await params;
  const res = await getHostEventsByUsername(username);

  if (!res.success || !res.host) {
    notFound();
  }

  const { host, events = [] } = res;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">@{host.username}</h1>
            <p className="text-xs text-slate-500">Choose an event to schedule a meeting</p>
          </div>
        </div>
      </header>

      {/* Event list */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-24">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-700">No events available</h2>
            <p className="text-sm text-slate-400 mt-1">
              This user has not published any event types yet.
            </p>
          </div>
        ) : (
          events.map((event: PublicEvent) => {
            const platform = getPlatformInfo(event.platform);
            const PlatformIcon = platform.icon;

            return (
              <Link
                key={event.eventId}
                href={`/book/${event.slug}`}
                className="group flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title */}
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {event.title}
                  </h2>

                  {/* Description */}
                  {event.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{event.durationMins} min</span>
                    </span>

                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${platform.color}`}>
                      <PlatformIcon className="w-3.5 h-3.5" />
                      <span>{platform.label}</span>
                    </span>

                    {event.location && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[140px]">{event.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow CTA */}
                <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </Link>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-slate-400">
        Powered by{' '}
        <span className="font-semibold text-blue-600">Schedify</span>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `Book with @${username}`,
    description: `Schedule a meeting with ${username}. Choose an event type and pick a time that works for you.`,
  };
}
