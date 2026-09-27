import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { PublicPortal } from './components/public/PublicPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { BackupModal } from './components/common/BackupModal';
import { TournamentEvent, Team, Fixture, StandingsRow } from './types';
import { api } from './services/api';
import { Trophy, Check } from 'lucide-react';

export function App() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [activePortal, setActivePortal] = useState<'public' | 'admin'>('public');

  // Check URL params for fan-only mode e.g. ?mode=fan
  const [isFanOnlyMode, setIsFanOnlyMode] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Backup & Restore State
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);
  const [autoRestoredBanner, setAutoRestoredBanner] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth and query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'fan' || params.get('view') === 'fan') {
      setIsFanOnlyMode(true);
      setActivePortal('public');
    }

    const auth = sessionStorage.getItem('iimr_sports_admin_auth');
    if (auth === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  // Load events on mount
  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Auto-save active state to browser localStorage on any changes
  useEffect(() => {
    if (events.length > 0 && teams.length > 0) {
      try {
        localStorage.setItem(
          'iimr_sports_hub_db_backup',
          JSON.stringify({
            events,
            teams,
            fixtures,
            updatedAt: Date.now(),
          })
        );
      } catch (err) {
        console.warn('Failed to auto-save to localStorage:', err);
      }
    }
  }, [events, teams, fixtures]);

  // Check if server was reset (e.g. Render container spin-down) and auto-restore from browser backup
  useEffect(() => {
    const checkAndRestore = async () => {
      try {
        const localBackupRaw = localStorage.getItem('iimr_sports_hub_db_backup');
        if (!localBackupRaw) return;
        const backup = JSON.parse(localBackupRaw);
        if (!backup.teams || backup.teams.length === 0) return;

        const serverTeams = await api.getTeams();
        if (backup.teams.length > serverTeams.length) {
          console.log('[AUTO-RESTORE] Server disk reset detected. Restoring tournament state from browser storage...');
          await api.syncState({
            events: backup.events || events,
            teams: backup.teams,
            fixtures: backup.fixtures || [],
          });
          setAutoRestoredBanner('Your previously saved tournament teams and schedule have been restored to the server!');
          setTimeout(() => setAutoRestoredBanner(null), 6000);
          loadEvents();
          if (selectedEvent) loadEventData();
        }
      } catch (err) {
        console.warn('[AUTO-RESTORE] Check failed:', err);
      }
    };

    checkAndRestore();
  }, []);

  // Load event-specific data (teams, fixtures, standings)
  const loadEventData = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const [tData, fData, sData] = await Promise.all([
        api.getTeams(selectedEvent.id),
        api.getFixtures(selectedEvent.id),
        api.getStandings(selectedEvent.id).catch(() => ({ standings: [] })),
      ]);

      setTeams(tData);
      setFixtures(fData);
      setStandings(sData.standings || []);
    } catch (err) {
      console.error('Failed to load event data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [selectedEvent?.id]);

  const handleUpdateEvent = async (updated: Partial<TournamentEvent>) => {
    if (!selectedEvent) return;
    const res = await api.updateEvent(selectedEvent.id, updated);
    setSelectedEvent(res);
    loadEvents();
    loadEventData();
  };

  const handleCreateNewEvent = async (newEvent: Partial<TournamentEvent>) => {
    const res = await api.createEvent(newEvent);
    await loadEvents();
    setSelectedEvent(res);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await api.deleteEvent(eventId);
    const updatedEvents = await api.getEvents();
    setEvents(updatedEvents);
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(updatedEvents.length > 0 ? updatedEvents[0] : null);
    }
  };

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('iimr_sports_admin_auth');
    setIsAdminAuthenticated(false);
    setActivePortal('public');
  };

  const liveMatches = fixtures.filter((f) => f.status === 'live');

  return (
    <div className="min-h-screen flex flex-col bg-[#070b12] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        events={events}
        selectedEvent={selectedEvent}
        onSelectEvent={(ev) => setSelectedEvent(ev)}
        activePortal={activePortal}
        onChangePortal={(p) => setActivePortal(p)}
        onOpenCreateEvent={() => {
          if (isAdminAuthenticated) {
            setActivePortal('admin');
          }
        }}
        onOpenBackupModal={() => setShowBackupModal(true)}
        liveMatchCount={liveMatches.length}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        isFanOnlyMode={isFanOnlyMode}
      />

      {/* Auto-Restored Banner */}
      {autoRestoredBanner && (
        <div className="bg-emerald-500 text-slate-950 text-xs font-bold py-2.5 px-4 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <Check className="w-4 h-4 shrink-0" />
          <span>{autoRestoredBanner}</span>
          <button
            onClick={() => setAutoRestoredBanner(null)}
            className="ml-3 font-black text-slate-900 hover:text-black p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activePortal === 'public' || !isAdminAuthenticated ? (
          <PublicPortal
            event={selectedEvent}
            teams={teams}
            fixtures={fixtures}
            standings={standings}
            onRefresh={loadEventData}
          />
        ) : (
          <AdminPortal
            currentEvent={selectedEvent}
            events={events}
            teams={teams}
            fixtures={fixtures}
            standings={standings}
            onRefreshAll={loadEventData}
            onUpdateEvent={handleUpdateEvent}
            onCreateNewEvent={handleCreateNewEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
      </main>

      {/* Backup, Save & Cloud Sync Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        events={events}
        teams={teams}
        fixtures={fixtures}
        onDataRestored={() => {
          loadEvents();
          loadEventData();
        }}
      />

      {/* Footer with Sports Club IIM Raipur Branding */}
      <footer className="border-t border-slate-900 bg-[#06090e] py-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2.5 font-bold text-slate-300 uppercase tracking-wider text-xs">
            <img src="/logo.png" alt="Sports Club Logo" className="w-5 h-5 object-contain" />
            <span>Sports Club IIM Raipur</span>
          </div>
          <p className="text-slate-400">
            Dedicated tournament management & broadcast system for Indian Institute of Management Raipur.
          </p>
          <div className="pt-2 text-slate-400 text-[11px]">
            &copy; 2026 Sports Club IIM Raipur • All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b12] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-xl font-bold mb-2">Sports Club IIM Raipur</h2>
          <p className="text-slate-400 text-xs max-w-sm mb-6">
            Something went wrong while displaying this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
