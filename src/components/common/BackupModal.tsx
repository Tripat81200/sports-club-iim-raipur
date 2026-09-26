import React, { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, Check, X, Shield, HardDrive, AlertCircle, Database } from 'lucide-react';
import { api } from '../../services/api';
import { TournamentEvent, Team, Fixture } from '../../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: TournamentEvent[];
  teams: Team[];
  fixtures: Fixture[];
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  events,
  teams,
  fixtures,
  onDataRestored,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<{
    connected: boolean;
    storageType: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getStorageStatus()
        .then((res) => setCloudStatus(res))
        .catch(() => setCloudStatus(null));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Download Backup as JSON
  const handleDownloadBackup = () => {
    try {
      const backupData = {
        app: 'Sports Club IIM Raipur',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        events,
        teams,
        fixtures,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `sports_club_iim_raipur_backup_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSyncStatus('Backup downloaded successfully to your computer!');
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err: any) {
      setErrorMsg('Failed to download backup: ' + err.message);
    }
  };

  // 2. Upload / Restore Backup from JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate structure
        const targetEvents = parsed.events || (parsed.data && parsed.data.events);
        const targetTeams = parsed.teams || (parsed.data && parsed.data.teams);
        const targetFixtures = parsed.fixtures || (parsed.data && parsed.data.fixtures);

        if (!Array.isArray(targetEvents) || !Array.isArray(targetTeams) || !Array.isArray(targetFixtures)) {
          throw new Error('Invalid backup file format. Missing events, teams, or fixtures.');
        }

        setIsSyncing(true);
        // Sync to server
        await api.syncState({
          events: targetEvents,
          teams: targetTeams,
          fixtures: targetFixtures,
        });

        // Also update local storage
        localStorage.setItem(
          'iimr_sports_hub_db_backup',
          JSON.stringify({
            events: targetEvents,
            teams: targetTeams,
            fixtures: targetFixtures,
            updatedAt: Date.now(),
          })
        );

        setSyncStatus('Tournament data restored & saved successfully!');
        onDataRestored();
        setTimeout(() => {
          setSyncStatus(null);
          onClose();
        }, 1500);
      } catch (err: any) {
        setErrorMsg('Error restoring backup file: ' + err.message);
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
  };

  // 3. Force Sync Current Browser State to Server
  const handleSyncToServer = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      await api.syncState({ events, teams, fixtures });
      localStorage.setItem(
        'iimr_sports_hub_db_backup',
        JSON.stringify({ events, teams, fixtures, updatedAt: Date.now() })
      );
      setSyncStatus('Current tournament state synced to cloud server & browser storage!');
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setErrorMsg('Failed to sync to server: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Save, Backup & Sync</h3>
              <p className="text-xs text-slate-400">Keep tournament schedules, logos, and stats safe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banners */}
        {syncStatus && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cloud Database Status Card */}
        <div className={`mb-5 p-3.5 rounded-2xl border text-xs ${
          cloudStatus?.connected
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Database className={`w-3.5 h-3.5 ${cloudStatus?.connected ? 'text-emerald-400' : 'text-amber-400'}`} />
              {cloudStatus?.connected ? 'Cloud Database: MongoDB Atlas (Connected)' : 'Storage Mode: Local File / Render Free'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              cloudStatus?.connected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {cloudStatus?.connected ? '24/7 Multi-Device Sync Active' : 'Single Laptop Cache'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {cloudStatus?.connected
              ? 'All teams, scores, and fixtures are permanently saved to MongoDB Atlas in the cloud. Any changes are automatically visible to all laptops, phones, and fans 24/7!'
              : 'Add MONGODB_URI to Render Environment Variables to permanently store data in MongoDB Atlas so changes sync across all laptops and fans 24/7.'}
          </p>
        </div>

        {/* Actions Grid */}
        <div className="space-y-3">
          {/* Action 1: Save & Sync to Server */}
          <button
            type="button"
            onClick={handleSyncToServer}
            disabled={isSyncing}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 hover:border-emerald-500 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Save & Sync to Server Now
                </div>
                <div className="text-[10px] text-slate-400">
                  {teams.length} teams, {fixtures.length} matches, {events.length} tournament(s)
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              Save
            </span>
          </button>

          {/* Action 2: Download Backup JSON */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  Download Backup File (.json)
                </div>
                <div className="text-[10px] text-slate-400">
                  Save a permanent copy to your laptop/phone
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40">
              Download
            </span>
          </button>

          {/* Action 3: Upload / Restore Backup JSON */}
          <label className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500 hover:bg-slate-900 transition-all text-left cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Restore from Backup File (.json)
                </div>
                <div className="text-[10px] text-slate-400">
                  Select your previously downloaded backup file
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/40">
              Upload
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Browser Auto-Save Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
