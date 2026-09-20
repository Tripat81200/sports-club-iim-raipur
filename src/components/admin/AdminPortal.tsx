import React, { useState } from 'react';
import { Settings, Users, Calendar, Send, Trophy } from 'lucide-react';
import { EventConfig } from './EventConfig';
import { RosterManager } from './RosterManager';
import { FixtureManager } from './FixtureManager';
import { BroadcastStudio } from './BroadcastStudio';
import { TournamentEvent, Team, Fixture, StandingsRow } from '../../types';

interface AdminPortalProps {
  currentEvent: TournamentEvent | null;
  events: TournamentEvent[];
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingsRow[];
  onRefreshAll: () => void;
  onUpdateEvent: (updated: Partial<TournamentEvent>) => Promise<void>;
  onCreateNewEvent: (newEvent: Partial<TournamentEvent>) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentEvent,
  events,
  teams,
  fixtures,
  standings,
  onRefreshAll,
  onUpdateEvent,
  onCreateNewEvent,
}) => {
  const [adminTab, setAdminTab] = useState<'config' | 'rosters' | 'fixtures' | 'broadcast'>('fixtures');
  const [selectedBroadcastFixtureId, setSelectedBroadcastFixtureId] = useState<string | undefined>();

  if (!currentEvent) {
    return (
      <div className="py-20 text-center text-slate-400">
        <h2 className="text-xl font-bold">No active tournament selected</h2>
        <p className="text-sm mt-1">Please select an event from the top navigation or create one.</p>
      </div>
    );
  }

  const navigateToBroadcast = (fixtureId: string) => {
    setSelectedBroadcastFixtureId(fixtureId);
    setAdminTab('broadcast');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Admin Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4 mb-8 overflow-x-auto">
        {[
          {
            key: 'config',
            label: '1. Event & Scoring Engine',
            icon: Settings,
            badge: currentEvent.sport,
          },
          {
            key: 'rosters',
            label: '2. Teams & Rosters',
            icon: Users,
            badge: `${teams.length} Teams`,
          },
          {
            key: 'fixtures',
            label: '3. Fixtures & Live Logger',
            icon: Calendar,
            badge: `${fixtures.length} Matches`,
          },
          {
            key: 'broadcast',
            label: '4. WhatsApp Broadcast',
            icon: Send,
            badge: 'Hype',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Admin Views */}
      {adminTab === 'config' && (
        <EventConfig
          currentEvent={currentEvent}
          onUpdateEvent={onUpdateEvent}
          onCreateNewEvent={onCreateNewEvent}
        />
      )}

      {adminTab === 'rosters' && (
        <RosterManager
          currentEvent={currentEvent}
          teams={teams}
          onRefreshTeams={onRefreshAll}
        />
      )}

      {adminTab === 'fixtures' && (
        <FixtureManager
          currentEvent={currentEvent}
          teams={teams}
          fixtures={fixtures}
          onRefreshFixtures={onRefreshAll}
          onRefreshStandings={onRefreshAll}
          onNavigateToBroadcast={navigateToBroadcast}
        />
      )}

      {adminTab === 'broadcast' && (
        <BroadcastStudio
          currentEvent={currentEvent}
          fixtures={fixtures}
          teams={teams}
          initialFixtureId={selectedBroadcastFixtureId}
        />
      )}
    </div>
  );
};
