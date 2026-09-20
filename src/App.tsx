import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { PublicPortal } from './components/public/PublicPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { TournamentEvent, Team, Fixture, StandingsRow } from './types';
import { api } from './services/api';
import { Trophy } from 'lucide-react';

export function App() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [activePortal, setActivePortal] = useState<'public' | 'admin'>('public');

  // Check URL params for fan-only mode e.g. ?mode=fan
  const [isFanOnlyMode, setIsFanOnlyMode] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

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
        liveMatchCount={liveMatches.length}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        isFanOnlyMode={isFanOnlyMode}
      />

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
          />
        )}
      </main>

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

export default App;
