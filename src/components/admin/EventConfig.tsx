import React, { useState } from 'react';
import { Settings, Trophy, Shield, Calendar, MapPin, Check, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { TournamentEvent, TournamentFormat } from '../../types';

interface EventConfigProps {
  currentEvent: TournamentEvent;
  onUpdateEvent: (updated: Partial<TournamentEvent>) => Promise<void>;
  onCreateNewEvent: (newEvent: Partial<TournamentEvent>) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

export const EventConfig: React.FC<EventConfigProps> = ({
  currentEvent,
  onUpdateEvent,
  onCreateNewEvent,
  onDeleteEvent,
}) => {
  const [formData, setFormData] = useState<TournamentEvent>({ ...currentEvent });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Sync when event changes
  React.useEffect(() => {
    setFormData({ ...currentEvent });
    setIsCreatingNew(false);
  }, [currentEvent.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await onCreateNewEvent(formData);
        setIsCreatingNew(false);
      } else {
        await onUpdateEvent(formData);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error saving event settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sportsList = ['Football', 'Cricket', 'Basketball', 'Volleyball', 'Badminton', 'Table Tennis', 'Chess'];

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {isCreatingNew ? 'Create New Tournament' : 'Tournament Setup & Scoring Engine'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure tournament format, custom sports scoring points matrix, and venue guidelines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsCreatingNew(!isCreatingNew);
            if (!isCreatingNew) {
              setFormData({
                id: `evt_${Date.now()}`,
                name: 'New Campus Tournament 2026',
                sport: 'Football',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                venue: 'IIM Raipur Sports Ground',
                format: 'league_playoffs',
                scoringRules: {
                  pointsWin: 3,
                  pointsDraw: 1,
                  pointsLoss: 0,
                  bonusThreshold: 3,
                  bonusPoints: 1,
                  penaltyPoints: 0,
                },
                teamCapacity: { min: 7, max: 15 },
              });
            } else {
              setFormData({ ...currentEvent });
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            isCreatingNew
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isCreatingNew ? 'Cancel New Event' : '+ Create New Tournament'}</span>
        </button>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          Tournament configuration saved and live standings recalculated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tournament Event Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. IIM Raipur Sangram Cup 2026"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Sport Category
            </label>
            <select
              value={formData.sport}
              onChange={(e) => {
                const s = e.target.value;
                // Auto adjust default scoring for sport
                let win = 3, draw = 1, loss = 0, bonus = 1, thresh = 3;
                if (s === 'Cricket' || s === 'Basketball') {
                  win = 2; draw = 1; loss = 0; bonus = 1; thresh = s === 'Cricket' ? 50 : 15;
                }
                setFormData({
                  ...formData,
                  sport: s,
                  scoringRules: {
                    ...formData.scoringRules,
                    pointsWin: win,
                    pointsDraw: draw,
                    pointsLoss: loss,
                    bonusPoints: bonus,
                    bonusThreshold: thresh,
                  },
                });
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {sportsList.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Campus Venue / Location
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="e.g. Main Sports Complex & Grounds"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tournament Format Selector */}
        <div className="pt-4 border-t border-slate-800/80">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Tournament Structure / Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                id: 'league_playoffs',
                title: 'League + Knockout Playoffs',
                desc: 'Round-robin group matches where top 4 teams advance into Semifinals & Grand Final.',
                recommended: true,
              },
              {
                id: 'round_robin',
                title: 'Pure Round Robin (League)',
                desc: 'Every team plays every other team once. Winner decided by final points table.',
                recommended: false,
              },
              {
                id: 'knockout',
                title: 'Knockout (Single Elimination)',
                desc: 'Standard bracket tree where losing teams are eliminated immediately.',
                recommended: false,
              },
              {
                id: 'double_elimination',
                title: 'Double Elimination',
                desc: 'Winners and Losers bracket giving teams a second chance after their first loss.',
                recommended: false,
              },
              {
                id: 'exhibition',
                title: 'Custom / Exhibition',
                desc: 'Ad-hoc individual matches without rigid tree structures.',
                recommended: false,
              },
            ].map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => setFormData({ ...formData, format: fmt.id as TournamentFormat })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.format === fmt.id
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-white">{fmt.title}</span>
                  {fmt.recommended && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-emerald-500 text-slate-950">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{fmt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Rules Configurator */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Scoring Points Matrix Configurator
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Changes directly update the live points table standings across the entire platform.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                Points for Win
              </label>
              <input
                type="number"
                min="0"
                value={formData.scoringRules.pointsWin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, pointsWin: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Points for Draw
              </label>
              <input
                type="number"
                min="0"
                value={formData.scoringRules.pointsDraw}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, pointsDraw: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Points for Loss
              </label>
              <input
                type="number"
                min="0"
                value={formData.scoringRules.pointsLoss}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, pointsLoss: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                Bonus Points
              </label>
              <input
                type="number"
                min="0"
                value={formData.scoringRules.bonusPoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, bonusPoints: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                Bonus Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formData.scoringRules.bonusThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, bonusThreshold: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                Penalty Points
              </label>
              <input
                type="number"
                min="0"
                value={formData.scoringRules.penaltyPoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scoringRules: { ...formData.scoringRules, penaltyPoints: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-base text-white"
              />
            </div>
          </div>
        </div>

        {/* Team Capacity Rules */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Roster Capacity Guardrails
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Min Squad Size
              </label>
              <input
                type="number"
                min="1"
                value={formData.teamCapacity.min}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    teamCapacity: { ...formData.teamCapacity, min: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Max Squad Size
              </label>
              <input
                type="number"
                min="1"
                value={formData.teamCapacity.max}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    teamCapacity: { ...formData.teamCapacity, max: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-5 border-t border-slate-800 flex items-center justify-between gap-4">
          {!isCreatingNew && onDeleteEvent && (
            <button
              type="button"
              disabled={isDeleting || isSaving}
              onClick={async () => {
                const confirmed = window.confirm(
                  `Are you sure you want to permanently delete tournament "${currentEvent.name}"?\n\nThis will remove this tournament along with all its teams, players, and match fixtures. This action cannot be undone.`
                );
                if (!confirmed) return;
                setIsDeleting(true);
                try {
                  await onDeleteEvent(currentEvent.id);
                } catch (err) {
                  console.error(err);
                  alert('Failed to delete tournament');
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Tournament'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {showSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Configuration saved successfully!</span>
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : isCreatingNew ? 'Create Tournament' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
