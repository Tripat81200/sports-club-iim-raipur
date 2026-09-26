import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, Info, ChevronRight, Award, Star, Flame, Target, Medal, Users } from 'lucide-react';
import { StandingsRow, ScoringRules, Team, Fixture } from '../../types';
import { TeamBadge } from '../common/TeamBadge';

interface LeaderboardProps {
  standings: StandingsRow[];
  scoringRules: ScoringRules;
  teams: Team[];
  fixtures?: Fixture[];
  sport?: string;
  onSelectTeam: (team: Team) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  standings,
  scoringRules,
  teams,
  fixtures = [],
  sport = 'Football',
  onSelectTeam,
}) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'performers'>('standings');

  // Aggregated Player Performance Stats across completed fixtures
  const playerStatsMap = useMemo(() => {
    const map = new Map<string, {
      playerId: string;
      playerName: string;
      teamId: string;
      teamName: string;
      goals: number;
      assists: number;
      runs: number;
      wickets: number;
      overs: number;
      baskets: number;
      rebounds: number;
      points: number;
      matchesCount: number;
    }>();

    const completedFixtures = fixtures.filter((f) => f.status === 'completed');

    for (const f of completedFixtures) {
      if (!f.playerStats) continue;
      for (const ps of f.playerStats) {
        if (!ps.playerId) continue;
        const existing = map.get(ps.playerId) || {
          playerId: ps.playerId,
          playerName: ps.playerName,
          teamId: ps.teamId,
          teamName: ps.teamName || (teams.find((t) => t.id === ps.teamId)?.name || 'Team'),
          goals: 0,
          assists: 0,
          runs: 0,
          wickets: 0,
          overs: 0,
          baskets: 0,
          rebounds: 0,
          points: 0,
          matchesCount: 0,
        };

        existing.goals += Number(ps.goals || 0);
        existing.assists += Number(ps.assists || 0);
        existing.runs += Number(ps.runs || 0);
        existing.wickets += Number(ps.wickets || 0);
        existing.overs += Number(ps.overs || 0);
        existing.baskets += Number(ps.baskets || 0);
        existing.rebounds += Number(ps.rebounds || 0);
        existing.points += Number(ps.points || (ps.baskets || 0));
        existing.matchesCount += 1;

        map.set(ps.playerId, existing);
      }
    }

    return Array.from(map.values());
  }, [fixtures, teams]);

  const isFootball = /football|soccer/i.test(sport);
  const isCricket = /cricket/i.test(sport);
  const isBasketball = /basketball/i.test(sport);

  // Sorted lists
  const topScorers = useMemo(() => {
    return [...playerStatsMap].sort((a, b) => {
      if (isFootball) return b.goals - a.goals || b.assists - a.assists;
      if (isCricket) return b.runs - a.runs;
      if (isBasketball) return (b.baskets || b.points) - (a.baskets || a.points);
      return b.points - a.points;
    });
  }, [playerStatsMap, isFootball, isCricket, isBasketball]);

  const topSecondary = useMemo(() => {
    if (isFootball) {
      return [...playerStatsMap].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals);
    }
    if (isCricket) {
      return [...playerStatsMap].filter((p) => p.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
    }
    if (isBasketball) {
      return [...playerStatsMap].filter((p) => p.rebounds > 0).sort((a, b) => b.rebounds - a.rebounds);
    }
    return [];
  }, [playerStatsMap, isFootball, isCricket, isBasketball]);

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl mb-8">
      {/* Table Header / Title */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                Tournament Leaderboards
              </h2>
            </div>

            {/* Tab switchers: Team Standings vs Top Performers */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('standings')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'standings'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Team Standings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('performers')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'performers'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Top Performers</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'standings'
              ? 'Official points table calculated in real time based on active tournament regulations'
              : `Top individual performer stats & leaderboards for ${sport}`}
          </p>
        </div>

        {/* Scoring Rules Pill (Shown on Standings tab) */}
        {activeTab === 'standings' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-semibold shrink-0">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Win: <b className="text-emerald-400">{scoringRules.pointsWin} pts</b> • Draw: <b className="text-amber-400">{scoringRules.pointsDraw} pt</b> • Loss: <b className="text-slate-400">{scoringRules.pointsLoss} pt</b>
              {scoringRules.bonusPoints > 0 && (
                <> • Bonus: <b className="text-cyan-400">+{scoringRules.bonusPoints} pt</b> (diff &ge; {scoringRules.bonusThreshold})</>
              )}
            </span>
          </div>
        )}
      </div>

      {activeTab === 'standings' ? (
        <>
          {/* Standings Table */}
          <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <th className="py-3.5 px-4 text-center w-12">#</th>
              <th className="py-3.5 px-4">Club / Team</th>
              <th className="py-3.5 px-3 text-center">P</th>
              <th className="py-3.5 px-3 text-center">W</th>
              <th className="py-3.5 px-3 text-center">D</th>
              <th className="py-3.5 px-3 text-center">L</th>
              <th className="py-3.5 px-3 text-center hidden md:table-cell">GF</th>
              <th className="py-3.5 px-3 text-center hidden md:table-cell">GA</th>
              <th className="py-3.5 px-3 text-center font-bold">GD</th>
              <th className="py-3.5 px-4 text-center font-black text-emerald-400 bg-emerald-950/20">PTS</th>
              <th className="py-3.5 px-4 text-center hidden sm:table-cell">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm font-medium">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 text-xs">
                  No teams registered for this tournament yet.
                </td>
              </tr>
            ) : (
              standings.map((row) => {
                const teamData = teams.find((t) => t.id === row.teamId);
                const isTopTeam = row.rank === 1;

                return (
                  <tr
                    key={row.teamId}
                    onClick={() => teamData && onSelectTeam(teamData)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          isTopTeam
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                            : row.rank <= 4
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>

                    {/* Team Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <TeamBadge
                          team={teamData}
                          color={row.color}
                          logoUrl={row.logoUrl || teamData?.logoUrl}
                          name={row.teamName}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {row.teamName}
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                          </div>
                          {teamData?.owner && (
                            <div className="text-[11px] text-slate-400">
                              Mgr: {teamData.owner}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* P, W, D, L */}
                    <td className="py-3.5 px-3 text-center text-slate-300 font-semibold">{row.played}</td>
                    <td className="py-3.5 px-3 text-center text-emerald-400 font-semibold">{row.won}</td>
                    <td className="py-3.5 px-3 text-center text-amber-400 font-semibold">{row.drawn}</td>
                    <td className="py-3.5 px-3 text-center text-rose-400 font-semibold">{row.lost}</td>

                    {/* GF, GA */}
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs hidden md:table-cell">
                      {row.goalsFor}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs hidden md:table-cell">
                      {row.goalsAgainst}
                    </td>

                    {/* GD */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-xs">
                      <span className={row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-center font-black text-base text-emerald-300 font-mono bg-emerald-950/20">
                      {row.points}
                    </td>

                    {/* Form Pills */}
                    <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {row.recentForm && row.recentForm.length > 0 ? (
                          row.recentForm.map((result, idx) => (
                            <span
                              key={idx}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black uppercase ${
                                result === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : result === 'D'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              {result}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Qualification note */}
      <div className="p-3.5 bg-slate-950/50 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500" />
          Ranks 1 to 4 advance to Playoffs / Semifinals
        </span>
        <span className="text-slate-500">Tap any team to view full squad & managers</span>
      </div>
      </>
      ) : (
        /* TAB 2: TOP PERFORMERS & SCORERS */
        <div className="p-6 space-y-6">
          {topScorers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Star className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-400">
                No individual player stats recorded yet.
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Tournament committee can log sport-specific player contributions (e.g. goals, runs, wickets, baskets) when logging match results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PRIMARY LEADERBOARD (Goals / Runs / Points) */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {isFootball
                        ? 'Golden Boot • Top Scorers'
                        : isCricket
                        ? 'Orange Cap • Top Run Scorers'
                        : isBasketball
                        ? 'Top Scorers • Points'
                        : 'Top Scorers'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    {isFootball ? 'Goals' : isCricket ? 'Runs' : isBasketball ? 'Points' : 'Points'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {topScorers.slice(0, 8).map((p, idx) => (
                    <div
                      key={p.playerId || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'text-slate-500 font-semibold'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">{p.playerName}</div>
                          <div className="text-[10px] text-slate-400">{p.teamName}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-sm text-emerald-400">
                          {isFootball
                            ? `${p.goals} Goals`
                            : isCricket
                            ? `${p.runs} Runs`
                            : isBasketball
                            ? `${p.baskets || p.points} Pts`
                            : `${p.points} Pts`}
                        </div>
                        {isFootball && p.assists > 0 && (
                          <div className="text-[10px] text-slate-500">{p.assists} Assists</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECONDARY LEADERBOARD (Assists / Wickets / Rebounds) */}
              {topSecondary.length > 0 && (
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        {isFootball
                          ? 'Top Playmakers • Assists'
                          : isCricket
                          ? 'Purple Cap • Top Wickets'
                          : isBasketball
                          ? 'Top Rebounders'
                          : 'Specialist Stats'}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {isFootball ? 'Assists' : isCricket ? 'Wickets' : isBasketball ? 'Rebounds' : 'Stats'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {topSecondary.slice(0, 8).map((p, idx) => (
                      <div
                        key={p.playerId || idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white text-xs">{p.playerName}</div>
                            <div className="text-[10px] text-slate-400">{p.teamName}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-black text-sm text-cyan-400">
                            {isFootball
                              ? `${p.assists} Assists`
                              : isCricket
                              ? `${p.wickets} Wkts`
                              : isBasketball
                              ? `${p.rebounds} Reb`
                              : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
