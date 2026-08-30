'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/useStore';
import {
  Calendar,
  Clock,
  Layers,
  User as UserIcon,
} from 'lucide-react';

export default function Navbar() {
  const { activeTab, setActiveTab, user } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();



  const handleTabClick = (tab: 'events' | 'bookings' | 'availability') => {
    setActiveTab(tab);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">CalFlow</span>
            </div>
          </Link>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleTabClick('events')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'events' && pathname === '/dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Event Types</span>
            </button>

            <button
              onClick={() => handleTabClick('bookings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'bookings' && pathname === '/dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Bookings</span>
            </button>

            <button
              onClick={() => handleTabClick('availability')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'availability' && pathname === '/dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Availability</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">

            {/* Profile Navigation Button */}
            <Link
              href="/profile"
              className={`flex items-center space-x-2 pl-2 border-l border-slate-200 transition ${
                pathname === '/profile' ? 'opacity-100 font-bold' : 'hover:opacity-80'
              }`}
              title="Account & Integration Settings"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                <p className="text-[10px] text-blue-600 font-semibold">Settings & Profile</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
