import React from 'react';
import { X, Users, Shield, Award, Phone, Shirt, CheckCircle } from 'lucide-react';
import { Team } from '../../types';

interface TeamRosterModalProps {
  team: Team | null;
  onClose: () => void;
}

export const TeamRosterModal: React.FC<TeamRosterModalProps> = ({ team, onClose }) => {
  if (!team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className="relative p-6 border-b border-slate-800"
          style={{
            background: `linear-gradient(135deg, ${team.color || '#10b981'}25 0%, #0f172a 100%)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/20 bg-slate-950 shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/20 shrink-0"
                style={{ backgroundColor: team.color || '#10b981' }}
              >
                {team.shortCode || team.name.substring(0, 3).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{team.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                  {team.players.length} Players Squad
                </span>
                {team.contactNumber && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {team.contactNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ownership Badges */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Owner / Manager</div>
              <div className="font-bold text-slate-200">{team.owner || 'Unassigned'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Co-Owner</div>
              <div className="font-bold text-slate-200">{team.coOwner || 'Unassigned'}</div>
            </div>
          </div>
        </div>

        {/* Player Squad List */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Official Squad Roster</span>
            <span>Jersey & Role</span>
          </div>

          {team.players.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No players added to this team yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {team.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-xs text-amber-400">
                      #{player.jerseyNumber}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {player.name}
                        {player.isCaptain && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            C
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{player.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
