import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Star, Award, Share2, Check, Sparkles, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TournamentEvent, Team, StandingsRow } from '../../types';
import { TeamBadge } from '../common/TeamBadge';
import { api } from '../../services/api';

interface ChampionsPodiumProps {
  event: TournamentEvent;
  teams: Team[];
  standings?: StandingsRow[];
  onSelectTeam?: (team: Team) => void;
}

export const ChampionsPodium: React.FC<ChampionsPodiumProps> = ({
  event,
  teams,
  standings = [],
  onSelectTeam,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Trigger celebration confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#ffffff'],
      });
    } catch (e) {}
  };

  // Find team objects
  const winnerTeam = teams.find((t) => t.id === event.winnerTeamId) ||
    teams.find((t) => t.name.toLowerCase() === (event.winnerTeamName || '').toLowerCase());
  const runnerUpTeam = teams.find((t) => t.id === event.runnerUpTeamId) ||
    teams.find((t) => t.name.toLowerCase() === (event.runnerUpTeamName || '').toLowerCase());
  const secondRunnerUpTeam = teams.find((t) => t.id === event.secondRunnerUpTeamId) ||
    teams.find((t) => t.name.toLowerCase() === (event.secondRunnerUpTeamName || '').toLowerCase());

  // WhatsApp / Share handler
  const handleShare = async () => {
    setIsSharing(true);
    triggerConfetti();
    try {
      let broadcastText = '';
      try {
        const res = await api.getChampionshipBroadcast(event.id);
        if (res && res.broadcastText) {
          broadcastText = res.broadcastText;
        }
      } catch (err) {
        // Fallback text
        broadcastText = `🏆 *${event.name.toUpperCase()} - GRAND CHAMPIONS ANNOUNCED!* 🏆\n\n` +
          `🥇 *CHAMPIONS:* ${event.winnerTeamName || winnerTeam?.name || 'Winner'}\n` +
          (event.runnerUpTeamName ? `🥈 *RUNNERS-UP:* ${event.runnerUpTeamName}\n` : '') +
          (event.secondRunnerUpTeamName ? `🥉 *2ND RUNNERS-UP:* ${event.secondRunnerUpTeamName}\n` : '') +
          (event.topScorerPlayerName ? `👟 *TOP SCORER:* ${event.topScorerPlayerName} (${event.topScorerGoals || 0} Goals)\n` : '') +
          (event.mvpPlayerName ? `⭐ *PLAYER OF THE TOURNAMENT:* ${event.mvpPlayerName}\n` : '') +
          `\n✨ Relive all highlights on Sports Club IIM Raipur Fan Portal!\nhttps://sports-club-iim-raipur.onrender.com/?mode=fan`;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${event.name} Champions Announced`,
            text: broadcastText,
            url: window.location.href,
          });
          setIsSharing(false);
          return;
        } catch (e) {
          // fallback to clipboard
        }
      }

      await navigator.clipboard.writeText(broadcastText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(broadcastText)}`, '_blank');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl mb-8 animate-in fade-in duration-500">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 -mr-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Tournament Concluded • Official Ceremony
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Grand Champions & Podium Honours
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {event.concludingNotes ||
              `Honouring the champion clubs, finalists, and outstanding performers of the ${event.name}.`}
          </p>
        </div>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
        >
          {copiedShare ? (
            <>
              <Check className="w-4 h-4" />
              <span>Broadcast Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {/* 3-Tier Olympic Podium */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end mb-8 pt-4">
        {/* 2nd Place: Silver Runner-Up (Order 2 on mobile, Order 1 on md+) */}
        {runnerUpTeam || event.runnerUpTeamName ? (
          <div
            onClick={() => runnerUpTeam && onSelectTeam && onSelectTeam(runnerUpTeam)}
            className={`order-2 md:order-1 flex flex-col items-center bg-slate-900/90 rounded-2xl border border-slate-700/80 p-5 shadow-lg transition-all hover:border-slate-500 ${
              runnerUpTeam && onSelectTeam ? 'cursor-pointer hover:scale-[1.02]' : ''
            }`}
          >
            <div className="relative -mt-10 mb-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center shadow-md">
                <Medal className="w-6 h-6 text-slate-300" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                2
              </span>
            </div>

            <TeamBadge
              team={runnerUpTeam}
              color={event.runnerUpColor || runnerUpTeam?.color || '#94a3b8'}
              logoUrl={runnerUpTeam?.logoUrl}
              name={event.runnerUpTeamName || runnerUpTeam?.name || 'Runner-Up'}
              size="lg"
            />

            <h3 className="mt-3 text-base sm:text-lg font-black text-white text-center leading-tight">
              {event.runnerUpTeamName || runnerUpTeam?.name}
            </h3>
            <span className="mt-1 text-[11px] font-bold tracking-wider uppercase text-slate-300 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              🥈 1st Runner-Up
            </span>
            {runnerUpTeam?.owner && (
              <span className="text-[11px] text-slate-400 mt-2">Mgr: {runnerUpTeam.owner}</span>
            )}
          </div>
        ) : (
          <div className="order-2 md:order-1 hidden md:block" />
        )}

        {/* 1st Place: Gold Grand Champion (Order 1 on mobile, Order 2 on md+, taller & glowing) */}
        {winnerTeam || event.winnerTeamName ? (
          <div
            onClick={() => winnerTeam && onSelectTeam && onSelectTeam(winnerTeam)}
            className={`order-1 md:order-2 flex flex-col items-center bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-900 rounded-3xl border-2 border-amber-400 p-6 sm:p-7 shadow-2xl shadow-amber-500/20 md:-mt-6 transition-all ${
              winnerTeam && onSelectTeam ? 'cursor-pointer hover:scale-[1.03]' : ''
            }`}
          >
            <div className="relative -mt-14 mb-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border-4 border-amber-300 flex items-center justify-center shadow-xl shadow-amber-500/40">
                <Crown className="w-8 h-8 text-slate-950" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center ring-2 ring-slate-900">
                1
              </span>
            </div>

            <TeamBadge
              team={winnerTeam}
              color={event.winnerColor || winnerTeam?.color || '#f59e0b'}
              logoUrl={winnerTeam?.logoUrl}
              name={event.winnerTeamName || winnerTeam?.name || 'Grand Champion'}
              size="lg"
            />

            <h3 className="mt-3 text-lg sm:text-2xl font-black text-amber-300 text-center leading-tight">
              {event.winnerTeamName || winnerTeam?.name}
            </h3>
            <span className="mt-1.5 text-xs font-black tracking-wider uppercase text-slate-950 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm">
              🏆 Grand Champion
            </span>
            {winnerTeam?.owner && (
              <span className="text-xs text-amber-200/80 font-medium mt-2">
                Mgr: {winnerTeam.owner}
              </span>
            )}
          </div>
        ) : null}

        {/* 3rd Place: Bronze 2nd Runner-Up (Order 3) */}
        {secondRunnerUpTeam || event.secondRunnerUpTeamName ? (
          <div
            onClick={() => secondRunnerUpTeam && onSelectTeam && onSelectTeam(secondRunnerUpTeam)}
            className={`order-3 flex flex-col items-center bg-slate-900/90 rounded-2xl border border-amber-900/50 p-5 shadow-lg transition-all hover:border-amber-700/60 ${
              secondRunnerUpTeam && onSelectTeam ? 'cursor-pointer hover:scale-[1.02]' : ''
            }`}
          >
            <div className="relative -mt-10 mb-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-amber-600 flex items-center justify-center shadow-md">
                <Medal className="w-6 h-6 text-amber-600" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center">
                3
              </span>
            </div>

            <TeamBadge
              team={secondRunnerUpTeam}
              color={event.secondRunnerUpColor || secondRunnerUpTeam?.color || '#b45309'}
              logoUrl={secondRunnerUpTeam?.logoUrl}
              name={event.secondRunnerUpTeamName || secondRunnerUpTeam?.name || '2nd Runner-Up'}
              size="lg"
            />

            <h3 className="mt-3 text-base sm:text-lg font-black text-white text-center leading-tight">
              {event.secondRunnerUpTeamName || secondRunnerUpTeam?.name}
            </h3>
            <span className="mt-1 text-[11px] font-bold tracking-wider uppercase text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60">
              🥉 2nd Runner-Up
            </span>
            {secondRunnerUpTeam?.owner && (
              <span className="text-[11px] text-slate-400 mt-2">Mgr: {secondRunnerUpTeam.owner}</span>
            )}
          </div>
        ) : (
          <div className="order-3 hidden md:block" />
        )}
      </div>

      {/* Individual Awards / Honour Roll */}
      {(event.topScorerPlayerName || event.mvpPlayerName || (event.customAwards && event.customAwards.length > 0)) && (
        <div className="relative z-10 pt-6 border-t border-slate-800/80">
          <div className="text-xs font-black tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Tournament Individual Honours & Awards
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Top Scorer / Golden Boot */}
            {event.topScorerPlayerName && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Golden Boot • Top Scorer
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {event.topScorerPlayerName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {event.topScorerTeamName && <span>{event.topScorerTeamName} • </span>}
                    <span className="font-bold text-emerald-400">{event.topScorerGoals || 0} Goals</span>
                  </div>
                </div>
              </div>
            )}

            {/* MVP / Player of the Tournament */}
            {event.mvpPlayerName && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                  <Star className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                    Player of Tournament (MVP)
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {event.mvpPlayerName}
                  </div>
                  {event.mvpTeamName && (
                    <div className="text-xs text-slate-400 mt-0.5">{event.mvpTeamName}</div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Awards */}
            {(event.customAwards || []).map((award) => (
              <div
                key={award.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3"
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 truncate">
                    {award.title}
                  </div>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {award.recipient}
                  </div>
                  {award.team && (
                    <div className="text-xs text-slate-400 mt-0.5">{award.team}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
