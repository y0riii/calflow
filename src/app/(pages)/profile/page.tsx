'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { useAppStore } from '@/lib/useStore';
import { updateUserAction, logoutAction, getCurrentUser } from '@/app/actions/authentication';
import { disconnectIntegrationAction, getConnectedIntegrationsAction } from '@/app/actions/integrations';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Globe,
  CheckCircle2,
  Video,
  Save,
  Check,
  ChevronLeft,
  Loader2,
  AlertCircle,
  LogOut,
} from 'lucide-react';

export default function ProfilePage() {
  const {
    user,
    updateUser,
    zoom,
    setZoomConnected,
    toggleZoomAutoGenerate,
  } = useAppStore();

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);

  // Profile Form State
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [timezone, setTimezone] = useState(user.timezone);
  const [bio, setBio] = useState(user.bio);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [integrationDetails, setIntegrationDetails] = useState<Record<string, { email: string }>>({});
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [integrationsRes, userRes] = await Promise.all([
          getConnectedIntegrationsAction(),
          getCurrentUser(),
        ]);

        if (userRes) {
          updateUser({
            name: userRes.username,
            username: userRes.username,
            email: userRes.email,
            timezone: userRes.timezone || 'America/New_York',
          });
          setName(userRes.username);
          setUsername(userRes.username);
          setEmail(userRes.email);
          setTimezone(userRes.timezone || 'America/New_York');
        }

        if (integrationsRes.success && integrationsRes.integrations) {
          setConnectedIntegrations(integrationsRes.integrations);
          if (integrationsRes.details) {
            setIntegrationDetails(integrationsRes.details);
          }
          if (integrationsRes.integrations.includes('zoom')) {
            setZoomConnected(true);
          }
        }
      } catch (err) {
        console.error("Error loading profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setZoomConnected, updateUser]);

  const handleDisconnect = async (provider: 'google' | 'zoom') => {
    setIsDisconnecting(provider);
    const res = await disconnectIntegrationAction(provider);
    if (res.success) {
      setConnectedIntegrations(prev => prev.filter(p => p !== provider));
    } else {
      alert(res.message);
    }
    setIsDisconnecting(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const res = await updateUserAction({ username, email, timezone });
      if (res.success) {
        updateUser({
          name,
          username,
          email,
          timezone,
          bio,
        });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        setErrorMessage(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await logoutAction();
      if (res?.success) {
        router.push('/login');
        router.refresh();
      } else {
        setErrorMessage(res?.message || 'Logout failed.');
      }
    } catch {
      setErrorMessage('An error occurred during logout.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Back Button & Header */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-blue-600 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Account & Integration Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your personal profile, link external account integrations, and configure calendar auto-sync.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Personal Profile Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
                  <UserIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{user.name}</h2>
                  <p className="text-xs text-slate-500">@{user.username}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Host Account
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Personal Information
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed after registration.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Timezone
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="America/New_York (Eastern Time)">America/New_York (Eastern Time)</option>
                      <option value="America/Chicago (Central Time)">America/Chicago (Central Time)</option>
                      <option value="America/Denver (Mountain Time)">America/Denver (Mountain Time)</option>
                      <option value="America/Los_Angeles (Pacific Time)">America/Los_Angeles (Pacific Time)</option>
                      <option value="Europe/London (GMT / BST)">Europe/London (GMT / BST)</option>
                      <option value="Europe/Paris (Central European Time)">Europe/Paris (CET)</option>
                      <option value="Africa/Cairo (Eastern European Time)">Africa/Cairo (EET)</option>
                      <option value="Asia/Dubai (Gulf Standard Time)">Asia/Dubai (GST)</option>
                      <option value="Asia/Tokyo (Japan Standard Time)">Asia/Tokyo (JST)</option>
                      <option value="Australia/Sydney (Australian Eastern Time)">Australia/Sydney (AEST)</option>
                      <option value="UTC (Coordinated Universal Time)">UTC (Coordinated Universal Time)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bio / Welcome Message
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short description displayed on public booking links..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile…</span>
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Profile Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Connected Accounts & Sync Settings (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Zoom Integration Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Zoom Account</h3>
                    <p className="text-[11px] text-slate-500">Video Conferencing</p>
                  </div>
                </div>

                {connectedIntegrations.includes('zoom') ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold">
                    Disconnected
                  </span>
                )}
              </div>

              {connectedIntegrations.includes('zoom') ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div>
                      <span className="text-slate-500 font-semibold text-[11px] block">Status:</span>
                      <span className="font-bold text-slate-900 block">Active Zoom Integration</span>
                    </div>
                    {integrationDetails.zoom?.email && (
                      <div>
                        <span className="text-slate-500 font-semibold text-[11px] block">Connected Account:</span>
                        <span className="font-bold text-cyan-700 block truncate">{integrationDetails.zoom.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Zoom Auto Generate Toggle */}
                  <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Auto-Create Zoom Video Links
                      </span>
                      <button
                        type="button"
                        onClick={toggleZoomAutoGenerate}
                        className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          zoom.autoGenerateLinks ? 'bg-cyan-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                            zoom.autoGenerateLinks ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Generate unique Zoom meeting URLs for invitees when Zoom is chosen as the event location.
                    </p>
                  </div>

                  <button
                    onClick={() => handleDisconnect('zoom')}
                    disabled={isDisconnecting === 'zoom'}
                    className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
                  >
                    {isDisconnecting === 'zoom' ? 'Disconnecting...' : 'Disconnect Zoom Account'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Link your Zoom account to automatically generate video call URLs when guests book a Zoom event type.
                  </p>
                  <a
                    href="/api/auth/zoom"
                    className="w-full py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-sm hover:bg-cyan-500 transition block text-center"
                  >
                    Connect Zoom Account
                  </a>
                </div>
              )}
            </div>

            {/* Danger Zone — Logout */}
            <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Session</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sign out of your account on this device. You will need to log in again to access your dashboard.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:bg-rose-500 transition disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
