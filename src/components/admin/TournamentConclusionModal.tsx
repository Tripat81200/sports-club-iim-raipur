import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Award, Medal, Crown, Star, Share2, Check, X, AlertCircle, Sparkles, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { TournamentEvent, Team, Fixture, StandingsRow } from '../../types';
import { TeamBadge } from '../common/TeamBadge';
import { api } from '../../services/api';

interface TournamentConclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TournamentEvent;
  teams: Team[];
  fixtures: Fixture[];
  standings: StandingsRow[];
  onUpdateEvent: (updated: Partial<TournamentEvent>) => Promise<void>;
}

export const TournamentConclusionModal: React.FC<TournamentConclusionModalProps> = ({
  isOpen,
  onClose,
  event,
  teams,
  fixtures,
  standings,
  onUpdateEvent,
}) => {
  const isCompleted = event.status === 'completed';

  // 1. Calculate Recommended Winners from Standings
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => a.rank - b.rank);
  }, [standings]);

  const recommendedWinner = sortedStandings[0] ? teams.find((t) => t.id === sortedStandings[0].teamId) : null;
  const recommendedRunnerUp = sortedStandings[1] ? teams.find((t) => t.id === sortedStandings[1].teamId) : null;
  const recommendedSecondRunnerUp = sortedStandings[2] ? teams.find((t) => t.id === sortedStandings[2].teamId) : null;

  // 2. Calculate Top Scorer across all fixtures
  const topScorerCalc = useMemo(() => {
    const map = new Map<string, { playerId: string; name: string; teamName: string; goals: number }>();
    for (const f of fixtures.filter((x) => x.status === 'completed')) {
      for (const ps of (f.playerStats || [])) {
        if (ps.goals && ps.goals > 0) {
          const key = ps.playerId || ps.playerName;
          const current = map.get(key) || {
            playerId: ps.playerId,
            name: ps.playerName,
            teamName: ps.teamName || (teams.find((t) => t.id === ps.teamId)?.name || ''),
            goals: 0,
          };
          current.goals += Number(ps.goals);
          map.set(key, current);
        }
      }
    }
    const list = Array.from(map.values()).sort((a, b) => b.goals - a.goals);
    return list[0] || null;
  }, [fixtures, teams]);

  // Form states
  const [winnerTeamId, setWinnerTeamId] = useState<string>(event.winnerTeamId || (recommendedWinner?.id || ''));
  const [runnerUpTeamId, setRunnerUpTeamId] = useState<string>(event.runnerUpTeamId || (recommendedRunnerUp?.id || ''));
  const [secondRunnerUpTeamId, setSecondRunnerUpTeamId] = useState<string>(event.secondRunnerUpTeamId || (recommendedSecondRunnerUp?.id || ''));
  const [topScorerPlayerName, setTopScorerPlayerName] = useState<string>(event.topScorerPlayerName || (topScorerCalc?.name || ''));
  const [topScorerTeamName, setTopScorerTeamName] = useState<string>(event.topScorerTeamName || (topScorerCalc?.teamName || ''));
  const [topScorerGoals, setTopScorerGoals] = useState<number>(event.topScorerGoals ?? (topScorerCalc?.goals || 0));
  const [mvpPlayerName, setMvpPlayerName] = useState<string>(event.mvpPlayerName || '');
  const [mvpTeamName, setMvpTeamName] = useState<string>(event.mvpTeamName || '');
  const [concludingNotes, setConcludingNotes] = useState<string>(
    event.concludingNotes || 'Congratulations to all participating teams, managers, and players for an unforgettable championship!'
  );
  const [customAwards, setCustomAwards] = useState<Array<{ id: string; title: string; recipient: string; team?: string }>>(
    event.customAwards || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  // Sync state if event props change
  useEffect(() => {
    if (isOpen) {
      setWinnerTeamId(event.winnerTeamId || (recommendedWinner?.id || ''));
      setRunnerUpTeamId(event.runnerUpTeamId || (recommendedRunnerUp?.id || ''));
      setSecondRunnerUpTeamId(event.secondRunnerUpTeamId || (recommendedSecondRunnerUp?.id || ''));
      setTopScorerPlayerName(event.topScorerPlayerName || (topScorerCalc?.name || ''));
      setTopScorerTeamName(event.topScorerTeamName || (topScorerCalc?.teamName || ''));
      setTopScorerGoals(event.topScorerGoals ?? (topScorerCalc?.goals || 0));
      setMvpPlayerName(event.mvpPlayerName || '');
      setMvpTeamName(event.mvpTeamName || '');
      setConcludingNotes(
        event.concludingNotes || 'Congratulations to all participating teams, managers, and players for an unforgettable championship!'
      );
      setCustomAwards(event.customAwards || []);
    }
  }, [isOpen, event]);

  if (!isOpen) return null;

  const handleAddCustomAward = () => {
    setCustomAwards([
      ...customAwards,
      { id: `award_${Date.now()}`, title: 'Best Goalkeeper', recipient: '', team: '' },
    ]);
  };

  const handleRemoveCustomAward = (id: string) => {
    setCustomAwards(customAwards.filter((a) => a.id !== id));
  };

  const handleSaveWinners = async (markAsCompleted: boolean) => {
    setIsSubmitting(true);
    try {
      const winnerTeam = teams.find((t) => t.id === winnerTeamId);
      const runnerUpTeam = teams.find((t) => t.id === runnerUpTeamId);
      const secondRunnerUpTeam = teams.find((t) => t.id === secondRunnerUpTeamId);

      await onUpdateEvent({
        status: markAsCompleted ? 'completed' : 'ongoing',
        winnerTeamId: winnerTeamId || null,
        winnerTeamName: winnerTeam ? winnerTeam.name : null,
        winnerColor: winnerTeam ? winnerTeam.color : null,
        winnerLogoUrl: winnerTeam ? winnerTeam.logoUrl : null,
        runnerUpTeamId: runnerUpTeamId || null,
        runnerUpTeamName: runnerUpTeam ? runnerUpTeam.name : null,
        runnerUpColor: runnerUpTeam ? runnerUpTeam.color : null,
        secondRunnerUpTeamId: secondRunnerUpTeamId || null,
        secondRunnerUpTeamName: secondRunnerUpTeam ? secondRunnerUpTeam.name : null,
        secondRunnerUpColor: secondRunnerUpTeam ? secondRunnerUpTeam.color : null,
        topScorerPlayerName: topScorerPlayerName.trim() || null,
        topScorerTeamName: topScorerTeamName.trim() || null,
        topScorerGoals: Number(topScorerGoals) || 0,
        mvpPlayerName: mvpPlayerName.trim() || null,
        mvpTeamName: mvpTeamName.trim() || null,
        concludingNotes: concludingNotes.trim() || null,
        customAwards,
        completedAt: markAsCompleted ? (event.completedAt || new Date().toISOString()) : null,
      });

      onClose();
    } catch (err: any) {
      alert('Failed to save winners: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    try {
      // First save current form data so the broadcast has latest inputs
      const winnerTeam = teams.find((t) => t.id === winnerTeamId);
      const runnerUpTeam = teams.find((t) => t.id === runnerUpTeamId);
      const secondRunnerUpTeam = teams.find((t) => t.id === secondRunnerUpTeamId);

      await onUpdateEvent({
        status: 'completed',
        winnerTeamId: winnerTeamId || null,
        winnerTeamName: winnerTeam ? winnerTeam.name : null,
        winnerColor: winnerTeam ? winnerTeam.color : null,
        winnerLogoUrl: winnerTeam ? winnerTeam.logoUrl : null,
        runnerUpTeamId: runnerUpTeamId || null,
        runnerUpTeamName: runnerUpTeam ? runnerUpTeam.name : null,
        secondRunnerUpTeamId: secondRunnerUpTeamId || null,
        secondRunnerUpTeamName: secondRunnerUpTeam ? secondRunnerUpTeam.name : null,
        topScorerPlayerName: topScorerPlayerName.trim() || null,
        topScorerTeamName: topScorerTeamName.trim() || null,
        topScorerGoals: Number(topScorerGoals) || 0,
        mvpPlayerName: mvpPlayerName.trim() || null,
        mvpTeamName: mvpTeamName.trim() || null,
        concludingNotes: concludingNotes.trim() || null,
        customAwards,
        completedAt: event.completedAt || new Date().toISOString(),
      });

      const broadcastData = await api.getChampionshipBroadcast(event.id);
      window.open(broadcastData.shareUrl, '_blank');
    } catch (err: any) {
      alert('Failed to generate broadcast: ' + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 my-auto max-h-[90vh] overflow-y-auto">
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>Conclude Tournament & Announce Winners</span>
                {isCompleted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Concluded
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Grand Finale declaration, podium rankings, and WhatsApp championship broadcast.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-6 relative">
          {/* Podium Selection Section */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Tournament Podium Rankings
              </span>
              <span className="text-[11px] text-slate-400">
                Pre-filled from points table
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Champion (Gold) */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/40">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase mb-2">
                  <span>🥇 Champion (1st Place)</span>
                </div>
                <select
                  value={winnerTeamId}
                  onChange={(e) => setWinnerTeamId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Select Winner --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {sortedStandings.find((s) => s.teamId === t.id) ? `(Rank #${sortedStandings.find((s) => s.teamId === t.id)?.rank})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Runner-Up (Silver) */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-slate-700/20 to-slate-900 border border-slate-600/50">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase mb-2">
                  <span>🥈 1st Runner-Up (2nd)</span>
                </div>
                <select
                  value={runnerUpTeamId}
                  onChange={(e) => setRunnerUpTeamId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-slate-400"
                >
                  <option value="">-- Select Runner-Up --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Second Runner-Up (Bronze) */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-amber-900/20 to-slate-900 border border-amber-700/40">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 uppercase mb-2">
                  <span>🥉 2nd Runner-Up (3rd)</span>
                </div>
                <select
                  value={secondRunnerUpTeamId}
                  onChange={(e) => setSecondRunnerUpTeamId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-600"
                >
                  <option value="">-- Select 2nd Runner-Up --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Individual Honors: Golden Boot & MVP */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Individual Honours & Player Awards
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Golden Boot / Top Scorer */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    ⚽ Top Goalscorer / Golden Boot
                  </span>
                  {topScorerCalc && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      Auto-detected: {topScorerCalc.name} ({topScorerCalc.goals}G)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Player Name"
                    value={topScorerPlayerName}
                    onChange={(e) => setTopScorerPlayerName(e.target.value)}
                    className="col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="number"
                    placeholder="Goals"
                    value={topScorerGoals}
                    onChange={(e) => setTopScorerGoals(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Club / Team Name"
                  value={topScorerTeamName}
                  onChange={(e) => setTopScorerTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Tournament MVP */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    ⭐ Tournament MVP / Best Player
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="MVP Player Name (e.g. SIRIL / RIYAS)"
                  value={mvpPlayerName}
                  onChange={(e) => setMvpPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="text"
                  placeholder="Player's Team Name"
                  value={mvpTeamName}
                  onChange={(e) => setMvpTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Custom Special Awards */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">Special Recognitions & Custom Awards</span>
                <button
                  type="button"
                  onClick={handleAddCustomAward}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Award</span>
                </button>
              </div>

              {customAwards.length === 0 ? (
                <div className="text-center py-2 text-slate-500 text-xs">
                  No custom awards added. (Optional)
                </div>
              ) : (
                <div className="space-y-2">
                  {customAwards.map((a, idx) => (
                    <div key={a.id || idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Award Title (e.g. Best Goalkeeper)"
                        value={a.title}
                        onChange={(e) => {
                          const updated = [...customAwards];
                          updated[idx].title = e.target.value;
                          setCustomAwards(updated);
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Recipient Name"
                        value={a.recipient}
                        onChange={(e) => {
                          const updated = [...customAwards];
                          updated[idx].recipient = e.target.value;
                          setCustomAwards(updated);
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Team Name"
                        value={a.team || ''}
                        onChange={(e) => {
                          const updated = [...customAwards];
                          updated[idx].team = e.target.value;
                          setCustomAwards(updated);
                        }}
                        className="w-1/4 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomAward(a.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Concluding Message */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Official Committee Closing Statement / Note
            </label>
            <textarea
              rows={2}
              value={concludingNotes}
              onChange={(e) => setConcludingNotes(e.target.value)}
              placeholder="Concluding remarks to include in the official announcement..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <button
                type="button"
                onClick={() => handleSaveWinners(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 transition-all"
              >
                Re-open Tournament
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Matches completed: <b className="text-emerald-400">{fixtures.filter((f) => f.status === 'completed').length} / {fixtures.length}</b>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharing || isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSharing ? 'Generating...' : '📢 Announce on WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveWinners(true)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : '🏆 Confirm & Conclude Tournament'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
