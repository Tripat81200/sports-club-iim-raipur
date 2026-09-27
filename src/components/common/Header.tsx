import React, { useState } from 'react';
import { Trophy, Shield, Users, Radio, Plus, Calendar, MapPin, Share2, Lock, Unlock, LogOut, Save } from 'lucide-react';
import { TournamentEvent } from '../../types';
import { AdminPinModal } from './AdminPinModal';
import { ShareFanModal } from './ShareFanModal';

interface HeaderProps {
  events: TournamentEvent[];
  selectedEvent: TournamentEvent | null;
  onSelectEvent: (event: TournamentEvent) => void;
  activePortal: 'public' | 'admin';
  onChangePortal: (portal: 'public' | 'admin') => void;
  onOpenCreateEvent: () => void;
  onOpenBackupModal?: () => void;
  liveMatchCount: number;
  isAdminAuthenticated: boolean;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
  isFanOnlyMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  activePortal,
  onChangePortal,
  onOpenCreateEvent,
  onOpenBackupModal,
  liveMatchCount,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
  isFanOnlyMode,
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleAdminClick = () => {
    if (isAdminAuthenticated) {
      onChangePortal('admin');
    } else {
      setShowPinModal(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/90 shadow-glow-emerald border border-amber-500/30 p-1.5 shrink-0">
              <img
                src="/logo.png"
                alt="Sports Club IIM Raipur Logo"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Sports Club <span className="text-emerald-400">IIM Raipur</span>
                </span>
                {liveMatchCount > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {liveMatchCount} LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Official Campus Tournament Management & Audience Portal
              </p>
            </div>
          </div>

          {/* Tournament Selector, Share Button, & Portal Switcher */}
          <div className="flex items-center gap-3">
            {/* Event Dropdown */}
            <div className="hidden lg:flex items-center bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const ev = events.find((x) => x.id === e.target.value);
                  if (ev) onSelectEvent(ev);
                }}
                className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer pr-2"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-slate-900 text-slate-100">
                    {ev.name} ({ev.sport})
                  </option>
                ))}
              </select>
            </div>

            {/* Share Fan Link Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
              title="Get Fan Link to share on batch WhatsApp groups"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Fan Link</span>
            </button>

            {/* Save / Backup Button */}
            {!isFanOnlyMode && onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-sm"
                title="Save tournament data, download backup file, or sync to server"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Save & Backup</span>
              </button>
            )}

            {/* Portal Switcher Tabs */}
            {!isFanOnlyMode && (
              <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => onChangePortal('public')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activePortal === 'public'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Fan Portal</span>
                </button>

                <button
                  onClick={handleAdminClick}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activePortal === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {isAdminAuthenticated ? (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Admin</span>
                </button>

                {isAdminAuthenticated && activePortal === 'admin' && (
                  <button
                    onClick={onAdminLogout}
                    className="p-2 ml-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                    title="Lock Admin Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}


          </div>
        </div>

        {/* Mobile Tournament Banner */}
        {selectedEvent && (
          <div className="lg:hidden py-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold truncate">
              <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{selectedEvent.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="text-emerald-400 p-1"
                title="Share Fan Link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px] border border-slate-700">
                {selectedEvent.sport}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setShowPinModal(false);
          onAdminLogin();
          onChangePortal('admin');
        }}
      />

      <ShareFanModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventName={selectedEvent?.name || 'Tournament'}
      />
    </header>
  );
};
