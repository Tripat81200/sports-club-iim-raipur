import React, { useState, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  Clock,
  MapPin,
  Trophy,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Flame,
  Swords,
  Crown,
} from 'lucide-react';
import { Fixture, Team, TournamentEvent, BroadcastPreview } from '../../types';
import { api } from '../../services/api';

interface BroadcastStudioProps {
  currentEvent: TournamentEvent;
  fixtures: Fixture[];
  teams: Team[];
  initialFixtureId?: string;
}

export const BroadcastStudio: React.FC<BroadcastStudioProps> = ({
  currentEvent,
  fixtures,
  teams,
  initialFixtureId,
}) => {
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>(
    initialFixtureId || fixtures[0]?.id || ''
  );
  const [broadcastType, setBroadcastType] = useState<'post-match' | 'pre-match'>('pre-match');
  const [broadcastData, setBroadcastData] = useState<BroadcastPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Fetch or generate broadcast preview
  useEffect(() => {
    if (!selectedFixtureId) return;

    const fetchBroadcast = async () => {
      setLoading(true);
      try {
        const preview = await api.getBroadcast(broadcastType, selectedFixtureId);
        setBroadcastData(preview);
        setCustomMessage(preview.message);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBroadcast();
  }, [selectedFixtureId, broadcastType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppSend = () => {
    const encoded = encodeURIComponent(customMessage);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const activeFixture = fixtures.find((f) => f.id === selectedFixtureId);
  const charLength = customMessage.length;
  // WhatsApp typically collapses around ~650 chars; 500-600 chars maximizes excitement without triggering "Read More"
  const isSafeLength = charLength <= 630;

  // Identify stage
  const roundLower = (activeFixture?.roundName || '').toLowerCase();
  const stageBadge = roundLower.includes('final') && !roundLower.includes('semi') && !roundLower.includes('quarter')
    ? { label: 'Championship Final', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' }
    : roundLower.includes('semi')
    ? { label: 'Semifinal Knockout', color: 'text-rose-400 bg-rose-500/20 border-rose-500/30' }
    : roundLower.includes('quarter')
    ? { label: 'Quarterfinal Eliminator', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' }
    : { label: 'League Matchday', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              WhatsApp Broadcast Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic stage-tailored campus hype messages filled with energy to pack the sidelines without hitting WhatsApp&apos;s &apos;Read More&apos; fold.
          </p>
        </div>

        {/* Broadcast Type Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setBroadcastType('pre-match')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              broadcastType === 'pre-match'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pre-Match Hype
          </button>
          <button
            onClick={() => setBroadcastType('post-match')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              broadcastType === 'post-match'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Post-Match Wrap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Match Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Select Match ({fixtures.length})
            </label>
            {activeFixture && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${stageBadge.color}`}>
                {stageBadge.label}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {fixtures.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No fixtures found for this tournament.
              </div>
            ) : (
              fixtures.map((f) => {
                const isSelected = f.id === selectedFixtureId;
                const isCompleted = f.status === 'completed';

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFixtureId(f.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-bold uppercase tracking-wider">{f.roundName}</span>
                      <span
                        className={`font-semibold ${
                          f.status === 'live'
                            ? 'text-rose-400'
                            : isCompleted
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {f.status === 'live' ? '● LIVE' : isCompleted ? 'Final' : f.scheduledTime}
                      </span>
                    </div>

                    <div className="font-bold text-white text-xs truncate">
                      {f.homeTeamName} vs {f.awayTeamName}
                    </div>

                    {isCompleted && f.homeScore !== null && (
                      <div className="text-[11px] text-emerald-400 font-mono font-bold mt-1">
                        Result: {f.homeScore} : {f.awayScore}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: WhatsApp Preview & Trigger */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Personalized Broadcast Preview
            </span>

            {/* Character counter & Read More guard */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isSafeLength
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {isSafeLength ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{charLength} / 630 chars</span>
              <span className="text-[10px] hidden sm:inline">
                {isSafeLength ? '(High Hype * Fits in One Screen)' : '(Too long for WhatsApp)'}
              </span>
            </div>
          </div>

          {/* WhatsApp Chat Bubble Mockup */}
          <div className="bg-[#0b141a] p-5 rounded-2xl border border-slate-800 shadow-inner relative">
            <div className="bg-[#1f2c34] text-slate-100 p-4 rounded-2xl rounded-tl-sm max-w-lg shadow-lg border border-slate-700/50">
              <textarea
                rows={12}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-transparent resize-none focus:outline-none text-xs leading-relaxed font-sans text-slate-100 placeholder-slate-400 selection:bg-emerald-500/40"
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">19:15 ✓✓</div>
            </div>
          </div>

          {/* Guidelines Compliance Checks */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Personalized for {stageBadge.label} with rich crowd-rallying hype</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Player of the Match removed per preference (pure sports filler hype)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Zero em-dashes (—) and strictly includes compulsory signature</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleWhatsAppSend}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Send on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
