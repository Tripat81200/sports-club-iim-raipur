import React, { useState } from 'react';
import { HeroTicker } from './HeroTicker';
import { Leaderboard } from './Leaderboard';
import { FixturesFeed } from './FixturesFeed';
import { TeamRosterModal } from './TeamRosterModal';
import { TournamentEvent, Team, Fixture, StandingsRow } from '../../types';

interface PublicPortalProps {
  event: TournamentEvent | null;
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingsRow[];
  onRefresh: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  event,
  teams,
  fixtures,
  standings,
  onRefresh,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  if (!event) {
    return (
      <div className="py-20 text-center text-slate-400">
        <h2 className="text-xl font-bold">No active tournament selected</h2>
        <p className="text-sm mt-1">Please select an event from the top navigation.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Stadium Hero Banner & Match Ticker */}
      <HeroTicker event={event} fixtures={fixtures} />

      {/* Standings Points Table & Top Performers */}
      <Leaderboard
        standings={standings}
        scoringRules={event.scoringRules}
        teams={teams}
        fixtures={fixtures}
        sport={event.sport}
        onSelectTeam={(t) => setSelectedTeam(t)}
      />

      {/* Match Fixtures Feed */}
      <FixturesFeed
        fixtures={fixtures}
        teams={teams}
        eventName={event.name}
      />

      {/* Team Roster Modal */}
      <TeamRosterModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </div>
  );
};
