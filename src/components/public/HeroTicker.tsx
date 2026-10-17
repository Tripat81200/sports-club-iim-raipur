import React, { useState, useEffect } from 'react';
import { Clock, Radio, Trophy, MapPin, Sparkles, ChevronRight, Crown, Medal } from 'lucide-react';
import { TournamentEvent, Fixture } from '../../types';

interface HeroTickerProps {
  event: TournamentEvent;
  fixtures: Fixture[];
  onSelectFixture?: (fixture: Fixture) => void;
}

export const HeroTicker: React.FC<HeroTickerProps> = ({ event, fixtures, onSelectFixture }) => {
  const liveMatch = fixtures.find((f) => f.status === 'live');
  const upcomingMatches = fixtures
    .filter((f) => f.status === 'scheduled')
    .sort((a, b) => {
      const dtA = `${a.scheduledDate} ${a.scheduledTime || '00:00'}`;
      const dtB = `${b.scheduledDate} ${b.scheduledTime || '00:00'}`;
      return dtA.localeCompare(dtB);
    });

  const nextMatch = upcomingMatches[0] || null;

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!nextMatch) {
      setTimeLeft(null);
      return;
    }

    const targetStr = `${nextMatch.scheduledDate}T${nextMatch.scheduledTime || '18:00'}:00`;
    const targetDate = new Date(targetStr).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [nextMatch]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0c1424] to-slate-950 border border-slate-800/80 p-6 sm:p-8 shadow-2xl mb-8">
      {/* Background stadium decorative glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Tournament Intro */}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-3.5 h-3.5" />
              {event.sport} Championship
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {event.venue}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700 capitalize">
              Format: {event.format.replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none mb-3">
            {event.name}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Follow live scores, real-time standings, match fixtures, and exclusive broadcast summaries powered by the
            Sports Club committee.
          </p>
        </div>

        {/* Right: Live Match Alert or Next Match Countdown */}
        <div className="w-full lg:w-96 shrink-0">
          {liveMatch ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/40 shadow-xl shadow-rose-950/30">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  LIVE NOW
                </span>
                <span className="text-xs font-semibold text-rose-300">{liveMatch.roundName}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base font-bold text-white truncate max-w-[180px]">
                    {liveMatch.homeTeamName}
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {liveMatch.homeScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base font-bold text-white truncate max-w-[180px]">
                    {liveMatch.awayTeamName}
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {liveMatch.awayScore ?? 0}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>📍 {liveMatch.venueLocation}</span>
                {liveMatch.notes && <span className="text-amber-400 font-medium">{liveMatch.notes}</span>}
              </div>
            </div>
          ) : nextMatch ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  UP NEXT
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {nextMatch.scheduledDate} • {nextMatch.scheduledTime}
                </span>
              </div>

              <div className="text-center py-1">
                <div className="text-sm font-bold text-slate-200">
                  {nextMatch.homeTeamName} <span className="text-amber-400">vs</span> {nextMatch.awayTeamName}
                </div>
                <div className="text-xs text-slate-400 mt-1">📍 {nextMatch.venueLocation}</div>
              </div>

              {/* Countdown Ticker Boxes */}
              {timeLeft && (
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                    Match Countdown
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-lg font-black text-white font-mono">{timeLeft.hours}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Hours</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-lg font-black text-white font-mono">{timeLeft.minutes}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Mins</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-lg font-black text-emerald-400 font-mono">{timeLeft.seconds}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Secs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : event.status === 'completed' || event.winnerTeamName ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 text-center animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md mb-3">
                <Crown className="w-3.5 h-3.5" />
                Tournament Champion
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 truncate tracking-tight mb-1">
                {event.winnerTeamName || 'Grand Champion'}
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {event.runnerUpTeamName ? (
                  <span>Runner-Up: <strong className="text-slate-200">{event.runnerUpTeamName}</strong></span>
                ) : (
                  <span>Official Champions Declared 🏆</span>
                )}
              </div>
              {event.topScorerPlayerName && (
                <div className="mt-3 pt-2.5 border-t border-amber-500/30 text-[11px] text-amber-200/90 flex items-center justify-center gap-1.5">
                  <span>👟 Golden Boot:</span>
                  <strong className="text-white">{event.topScorerPlayerName}</strong>
                  {event.topScorerGoals ? <span>({event.topScorerGoals}G)</span> : null}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-white">All Fixtures Completed</div>
              <div className="text-xs text-slate-400 mt-1">Check out the final leaderboard below!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
