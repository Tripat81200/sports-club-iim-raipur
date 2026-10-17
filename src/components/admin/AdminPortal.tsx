import React, { useState } from 'react';
import { Settings, Users, Calendar, Send, Trophy, Award, Sparkles, Crown } from 'lucide-react';
import { EventConfig } from './EventConfig';
import { RosterManager } from './RosterManager';
import { FixtureManager } from './FixtureManager';
import { BroadcastStudio } from './BroadcastStudio';
import { TournamentConclusionModal } from './TournamentConclusionModal';
import { TournamentEvent, Team, Fixture, StandingsRow } from '../../types';
import { TeamBadge } from '../common/TeamBadge';

interface AdminPortalProps {
  currentEvent: TournamentEvent | null;
  events: TournamentEvent[];
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingsRow[];
  onRefreshAll: () => void;
  onUpdateEvent: (updated: Partial<TournamentEvent>) => Promise<void>;
  onCreateNewEvent: (newEvent: Partial<TournamentEvent>) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
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
  onDeleteEvent,
}) => {
  const [adminTab, setAdminTab] = useState<'config' | 'rosters' | 'fixtures' | 'broadcast' | 'conclusion'>('fixtures');
  const [selectedBroadcastFixtureId, setSelectedBroadcastFixtureId] = useState<string | undefined>();
  const [showConclusionModal, setShowConclusionModal] = useState(false);

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
          {
            key: 'conclusion',
            label: '5. Winners & Podium',
            icon: Trophy,
            badge: currentEvent.status === 'completed' ? '🏆 Declared' : 'Pending',
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

        {/* Quick Modal Trigger Button */}
        <button
          onClick={() => setShowConclusionModal(true)}
          className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer shadow-md ${
            currentEvent.status === 'completed'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-amber-500/20'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{currentEvent.status === 'completed' ? 'Manage Ceremony & Winners' : '🏆 End Tournament & Set Winners'}</span>
        </button>
      </div>

      {/* Admin Views */}
      {adminTab === 'config' && (
        <EventConfig
          currentEvent={currentEvent}
          onUpdateEvent={onUpdateEvent}
          onCreateNewEvent={onCreateNewEvent}
          onDeleteEvent={onDeleteEvent}
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

      {adminTab === 'conclusion' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    Tournament Conclusion & Champions Ceremony
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Declare overall tournament winners, individual honours (Top Scorer, MVP, Custom Awards), and publish official WhatsApp announcements.
                </p>
              </div>

              <button
                onClick={() => setShowConclusionModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{currentEvent.status === 'completed' ? 'Edit Grand Champions & Ceremony' : '🏆 Conclude & Crown Winners'}</span>
              </button>
            </div>

            {/* Current Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tournament Status
                </div>
                <div className="text-lg font-black flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      currentEvent.status === 'completed' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span className={currentEvent.status === 'completed' ? 'text-amber-300' : 'text-emerald-400'}>
                    {currentEvent.status === 'completed' ? 'Tournament Concluded (Final)' : 'Ongoing Championship'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {fixtures.filter((f) => f.status === 'completed').length} of {fixtures.length} matches completed
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Grand Champion (1st Place)
                </div>
                <div className="text-lg font-black text-white truncate">
                  {currentEvent.winnerTeamName || (standings[0]?.teamName ? `${standings[0].teamName} (Leading)` : 'Not Declared')}
                </div>
                <div className="text-xs text-amber-400/90 mt-1">
                  {currentEvent.winnerTeamName ? 'Official Winner Confirmed' : 'Based on current points table'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Top Scorer / Golden Boot
                </div>
                <div className="text-lg font-black text-white truncate">
                  {currentEvent.topScorerPlayerName || 'Pending Final Tally'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {currentEvent.topScorerGoals ? `${currentEvent.topScorerGoals} Goals Scored` : 'Calculated across fixtures'}
                </div>
              </div>
            </div>

            {/* Explanatory Banner */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white">How the Conclusion Ceremony Works:</p>
                <p>
                  1. Clicking <strong>"Conclude & Crown Winners"</strong> opens the ceremony modal where rankings are automatically computed from the official points table (including tie-breakers like Goal Difference).
                </p>
                <p>
                  2. You can customize or confirm 1st, 2nd, and 3rd place, assign the Golden Boot, Tournament MVP, and add any custom awards (e.g. Best Goalkeeper, Fair Play).
                </p>
                <p>
                  3. Once confirmed, the <strong>Fan Portal</strong> automatically displays the Olympic-style Champions Podium, gold badges on the leaderboard, and you can copy a beautifully formatted WhatsApp announcement to share with student groups!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Conclusion Modal */}
      <TournamentConclusionModal
        isOpen={showConclusionModal}
        onClose={() => setShowConclusionModal(false)}
        event={currentEvent}
        teams={teams}
        fixtures={fixtures}
        standings={standings}
        onUpdateEvent={async (updated) => {
          await onUpdateEvent(updated);
          onRefreshAll();
        }}
      />
    </div>
  );
};
