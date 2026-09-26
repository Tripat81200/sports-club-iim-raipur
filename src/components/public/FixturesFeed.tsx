import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Trophy, Search, Share2, Radio, CheckCircle2, Star } from 'lucide-react';
import { Fixture, Team } from '../../types';
import { TeamBadge } from '../common/TeamBadge';

interface FixturesFeedProps {
  fixtures: Fixture[];
  teams: Team[];
  eventName: string;
  onSelectFixture?: (fixture: Fixture) => void;
}

export const FixturesFeed: React.FC<FixturesFeedProps> = ({
  fixtures,
  teams,
  eventName,
  onSelectFixture,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState<string>('all');

  // Unique rounds
  const rounds = Array.from(new Set(fixtures.map((f) => f.roundName))).filter(Boolean);

  // Filter fixtures
  const filtered = fixtures.filter((f) => {
    // Tab filter
    if (activeTab === 'live' && f.status !== 'live') return false;
    if (activeTab === 'upcoming' && f.status !== 'scheduled') return false;
    if (activeTab === 'completed' && f.status !== 'completed') return false;

    // Round filter
    if (selectedRound !== 'all' && f.roundName !== selectedRound) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHome = f.homeTeamName?.toLowerCase().includes(q);
      const matchAway = f.awayTeamName?.toLowerCase().includes(q);
      const matchVenue = f.venueLocation?.toLowerCase().includes(q);
      if (!matchHome && !matchAway && !matchVenue) return false;
    }

    return true;
  });

  const getTeamColor = (teamId: string) => {
    return teams.find((t) => t.id === teamId)?.color || '#10b981';
  };

  const handleShare = (f: Fixture) => {
    let shareText = '';
    if (f.status === 'completed') {
      shareText = `🏆 Sports Club IIM Raipur | Result: ${f.homeTeamName} ${f.homeScore} : ${f.awayScore} ${f.awayTeamName}${
        f.playerOfTheMatch ? ` (POTM: ${f.playerOfTheMatch.playerName})` : ''
      }`;
    } else {
      shareText = `🔥 Sports Club IIM Raipur | Matchup: ${f.homeTeamName} vs ${f.awayTeamName} on ${f.scheduledDate} at ${f.scheduledTime} (${f.venueLocation})`;
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl mb-8">
      {/* Title & Search / Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              Tournament Fixtures & Results
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time schedule, court allocations, and match reports
          </p>
        </div>

        {/* Search Bar & Round Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team or court..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 w-48 sm:w-56"
            />
          </div>

          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500/60 cursor-pointer"
          >
            <option value="all">All Rounds</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'All Matches', count: fixtures.length },
          { key: 'live', label: 'Live Now', count: fixtures.filter((f) => f.status === 'live').length },
          { key: 'upcoming', label: 'Upcoming', count: fixtures.filter((f) => f.status === 'scheduled').length },
          { key: 'completed', label: 'Completed', count: fixtures.filter((f) => f.status === 'completed').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-slate-800'
            }`}
          >
            {tab.key === 'live' && tab.count > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? 'bg-slate-950/40 text-slate-900' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Fixtures Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="text-sm font-semibold">No matches found</div>
          <p className="text-xs text-slate-500 mt-1">Try switching tabs or resetting your search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((fixture) => {
            const isLive = fixture.status === 'live';
            const isCompleted = fixture.status === 'completed';
            const homeWon = isCompleted && (fixture.homeScore ?? 0) > (fixture.awayScore ?? 0);
            const awayWon = isCompleted && (fixture.awayScore ?? 0) > (fixture.homeScore ?? 0);

            return (
              <div
                key={fixture.id}
                className={`relative rounded-2xl p-5 border transition-all ${
                  isLive
                    ? 'bg-gradient-to-br from-rose-950/20 via-slate-950 to-slate-950 border-rose-500/50 shadow-lg shadow-rose-950/20'
                    : isCompleted
                    ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                {/* Card Top: Round Name & Status Badge */}
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                    {fixture.roundName}
                  </span>

                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Final
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {fixture.scheduledTime}
                      </span>
                    )}

                    <button
                      onClick={() => handleShare(fixture)}
                      title="Share to WhatsApp"
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Teams & Scores */}
                <div className="space-y-3 mb-4">
                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamBadge
                        team={teams.find((t) => t.id === fixture.homeTeamId)}
                        color={getTeamColor(fixture.homeTeamId)}
                        name={fixture.homeTeamName}
                        size="sm"
                      />
                      <span
                        className={`font-bold text-sm truncate ${
                          homeWon ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {fixture.homeTeamName}
                      </span>
                    </div>

                    <div className="shrink-0 font-mono font-black text-lg">
                      {isCompleted || isLive ? (
                        <span className={homeWon ? 'text-emerald-400' : 'text-slate-200'}>
                          {fixture.homeScore ?? 0}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm font-sans font-medium">vs</span>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamBadge
                        team={teams.find((t) => t.id === fixture.awayTeamId)}
                        color={getTeamColor(fixture.awayTeamId)}
                        name={fixture.awayTeamName}
                        size="sm"
                      />
                      <span
                        className={`font-bold text-sm truncate ${
                          awayWon ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {fixture.awayTeamName}
                      </span>
                    </div>

                    <div className="shrink-0 font-mono font-black text-lg">
                      {isCompleted || isLive ? (
                        <span className={awayWon ? 'text-emerald-400' : 'text-slate-200'}>
                          {fixture.awayScore ?? 0}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm font-sans font-medium">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player of the Match Banner */}
                {fixture.playerOfTheMatch && (
                  <div className="mb-3 py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold truncate">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      <span className="truncate">POTM: {fixture.playerOfTheMatch.playerName}</span>
                    </div>
                    {fixture.playerOfTheMatch.performance && (
                      <span className="text-[10px] text-amber-400/80 font-medium shrink-0 ml-2">
                        {fixture.playerOfTheMatch.performance}
                      </span>
                    )}
                  </div>
                )}

                {/* Key Performers / Scorers Breakdown */}
                {fixture.playerStats && fixture.playerStats.length > 0 && (
                  <div className="mb-3 py-1.5 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Key Contributions
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {fixture.playerStats.slice(0, 5).map((ps, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1">
                          <span className="text-white font-medium">{ps.playerName}</span>
                          <span className="text-emerald-400 font-mono text-[10px] font-bold">
                            {ps.goals ? `${ps.goals}⚽ ` : ''}
                            {ps.assists ? `${ps.assists}🅰 ` : ''}
                            {ps.runs ? `${ps.runs}r ` : ''}
                            {ps.wickets ? `${ps.wickets}w ` : ''}
                            {ps.baskets ? `${ps.baskets}pts ` : ''}
                            {!ps.goals && !ps.assists && !ps.runs && !ps.wickets && !ps.baskets && ps.points ? `${ps.points}pts` : ''}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer: Date & Venue */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {fixture.scheduledDate} • {fixture.scheduledTime}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 truncate max-w-[160px]">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{fixture.venueLocation}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
