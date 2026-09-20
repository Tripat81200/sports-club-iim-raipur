import React from 'react';
import { Trophy, TrendingUp, Info, ChevronRight, Award } from 'lucide-react';
import { StandingsRow, ScoringRules, Team } from '../../types';

interface LeaderboardProps {
  standings: StandingsRow[];
  scoringRules: ScoringRules;
  teams: Team[];
  onSelectTeam: (team: Team) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  standings,
  scoringRules,
  teams,
  onSelectTeam,
}) => {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl mb-8">
      {/* Table Header / Title */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              Tournament Standings
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculated in real time based on active scoring regulations
          </p>
        </div>

        {/* Scoring Rules Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-semibold">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Win: <b className="text-emerald-400">{scoringRules.pointsWin} pts</b> • Draw: <b className="text-amber-400">{scoringRules.pointsDraw} pt</b> • Loss: <b className="text-slate-400">{scoringRules.pointsLoss} pt</b>
            {scoringRules.bonusPoints > 0 && (
              <> • Bonus: <b className="text-cyan-400">+{scoringRules.bonusPoints} pt</b> (diff &ge; {scoringRules.bonusThreshold})</>
            )}
          </span>
        </div>
      </div>

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
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: row.color || '#10b981' }}
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
    </div>
  );
};
