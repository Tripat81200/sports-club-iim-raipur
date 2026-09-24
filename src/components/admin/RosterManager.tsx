import React, { useState } from 'react';
import {
  Users,
  Plus,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  Check,
  Download,
  AlertTriangle,
  Shirt,
  Sparkles,
  Edit,
  X,
  Phone,
  Shield,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Team, Player, TournamentEvent } from '../../types';
import { api } from '../../services/api';

interface RosterManagerProps {
  currentEvent: TournamentEvent;
  teams: Team[];
  onRefreshTeams: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({
  currentEvent,
  teams,
  onRefreshTeams,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'ocr'>('manual');

  // Manual Form State
  const [teamName, setTeamName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [color, setColor] = useState('#10b981');
  const [owner, setOwner] = useState('');
  const [coOwner, setCoOwner] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', jerseyNumber: 10, role: 'Forward', isCaptain: true },
    { id: '2', name: '', jerseyNumber: 7, role: 'Midfielder', isCaptain: false },
    { id: '3', name: '', jerseyNumber: 1, role: 'Goalkeeper', isCaptain: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Team State
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Bulk Upload State
  const [bulkPreview, setBulkPreview] = useState<Partial<Team>[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

  // OCR State
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrParsedTeam, setOcrParsedTeam] = useState<Partial<Team> | null>(null);

  // Add player row
  const addPlayerRow = () => {
    setPlayers([
      ...players,
      {
        id: String(Date.now()),
        name: '',
        jerseyNumber: players.length + 1,
        role: 'Player',
        isCaptain: false,
      },
    ]);
  };

  const removePlayerRow = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const updatePlayerField = (id: string, field: keyof Player, value: any) => {
    setPlayers(
      players.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        if (field === 'isCaptain' && value === true) {
          // Unset other captains
          return { ...p, isCaptain: false };
        }
        return p;
      })
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return alert('Team name is required');

    const validPlayers = players.filter((p) => p.name.trim().length > 0);
    if (validPlayers.length < currentEvent.teamCapacity.min) {
      if (
        !confirm(
          `This sport typically requires at least ${currentEvent.teamCapacity.min} players. Save anyway?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.createTeam({
        eventId: currentEvent.id,
        name: teamName,
        shortCode: shortCode || teamName.substring(0, 3).toUpperCase(),
        color,
        owner,
        coOwner,
        contactNumber,
        players: validPlayers,
      });

      // Reset
      setTeamName('');
      setShortCode('');
      setOwner('');
      setCoOwner('');
      setContactNumber('');
      setPlayers([
        { id: '1', name: '', jerseyNumber: 10, role: 'Forward', isCaptain: true },
        { id: '2', name: '', jerseyNumber: 7, role: 'Midfielder', isCaptain: false },
        { id: '3', name: '', jerseyNumber: 1, role: 'Goalkeeper', isCaptain: false },
      ]);
      onRefreshTeams();
      alert('Team added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save team');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk File Upload (.xlsx, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        // Group rows by Team Name
        const teamMap = new Map<string, Partial<Team>>();

        rows.forEach((row, idx) => {
          const tName = row['Team Name'] || row['Team'] || row['team_name'] || `Squad ${idx + 1}`;
          const ownerName = row['Owner'] || row['Manager'] || 'N/A';
          const coOwnerName = row['Co-Owner'] || row['Co Owner'] || 'N/A';
          const playerName = row['Player Name'] || row['Player'] || row['Name'];
          const jersey = parseInt(row['Jersey Number'] || row['Jersey'] || '0', 10) || 0;
          const role = row['Role'] || row['Position'] || 'Player';
          const isCap = String(row['Captain'] || '').toLowerCase().includes('y') || false;

          if (!teamMap.has(tName)) {
            teamMap.set(tName, {
              name: tName,
              shortCode: tName.substring(0, 3).toUpperCase(),
              color: '#3b82f6',
              owner: ownerName,
              coOwner: coOwnerName,
              players: [],
            });
          }

          if (playerName) {
            teamMap.get(tName)?.players?.push({
              id: `p_${Date.now()}_${idx}`,
              name: playerName,
              jerseyNumber: jersey || (teamMap.get(tName)?.players?.length || 0) + 1,
              role: role,
              isCaptain: isCap,
            });
          }
        });

        setBulkPreview(Array.from(teamMap.values()));
      } catch (err) {
        console.error(err);
        alert('Could not parse the file. Please ensure it has valid columns.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleSaveBulkTeams = async () => {
    if (bulkPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.bulkCreateTeams(currentEvent.id, bulkPreview);
      setBulkPreview([]);
      setUploadFileName('');
      onRefreshTeams();
      alert(`Imported ${bulkPreview.length} teams successfully!`);
    } catch (err) {
      console.error(err);
      alert('Error importing teams');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Team Name,Owner,Co-Owner,Player Name,Jersey Number,Role,Captain\n' +
      'Raipur Rhinos,Aarav Sharma (PGP-1),Priya Verma (PGP-2),Aarav Sharma,10,Forward,Yes\n' +
      'Raipur Rhinos,Aarav Sharma (PGP-1),Priya Verma (PGP-2),Kabir Das,7,Winger,No\n' +
      'Raipur Rhinos,Aarav Sharma (PGP-1),Priya Verma (PGP-2),Manish Paul,1,Goalkeeper,No\n' +
      'Naya Raipur Knights,Rohan Iyer (PGP-2),Ananya Sen (PGP-1),Rohan Iyer,9,Striker,Yes\n' +
      'Naya Raipur Knights,Rohan Iyer (PGP-2),Ananya Sen (PGP-1),Ritvik Jha,1,Goalkeeper,No';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SportsClub_Roster_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // OCR Text Extraction
  const handleParseOcr = async () => {
    if (!ocrText.trim()) return;
    setOcrLoading(true);
    try {
      const res = await api.parseRosterText(ocrText);
      setOcrParsedTeam({
        name: res.teamName || 'Parsed Team',
        shortCode: (res.teamName ? res.teamName.substring(0, 3) : 'IMP').toUpperCase(),
        color: '#f59e0b',
        owner: res.owner || 'Unassigned',
        coOwner: res.coOwner || 'Unassigned',
        contactNumber: res.contactNumber || '',
        players: res.players || [],
      });
    } catch (err) {
      console.error(err);
      alert('Failed to extract roster text');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSaveOcrTeam = async () => {
    if (!ocrParsedTeam || !ocrParsedTeam.name) return;
    try {
      await api.createTeam({
        eventId: currentEvent.id,
        name: ocrParsedTeam.name,
        shortCode: (ocrParsedTeam.shortCode || ocrParsedTeam.name.substring(0, 3)).toUpperCase(),
        color: ocrParsedTeam.color || '#f59e0b',
        owner: ocrParsedTeam.owner || 'N/A',
        coOwner: ocrParsedTeam.coOwner || 'N/A',
        contactNumber: ocrParsedTeam.contactNumber || '',
        players: ocrParsedTeam.players || [],
      });
      setOcrParsedTeam(null);
      setOcrText('');
      onRefreshTeams();
      alert('OCR squad saved successfully!');
    } catch (err) {
      alert('Failed to save team');
    }
  };

  // Edit Team Handlers
  const handleSaveEditedTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (!editingTeam.name.trim()) {
      return alert('Team name is required');
    }

    setIsSavingEdit(true);
    try {
      await api.updateTeam(editingTeam.id, {
        name: editingTeam.name.trim(),
        shortCode: (editingTeam.shortCode || editingTeam.name.substring(0, 3)).toUpperCase(),
        color: editingTeam.color || '#10b981',
        owner: editingTeam.owner || 'N/A',
        coOwner: editingTeam.coOwner || 'N/A',
        contactNumber: editingTeam.contactNumber || '',
        players: editingTeam.players || [],
      });
      onRefreshTeams();
      setEditingTeam(null);
      alert('Team updated successfully!');
    } catch (err) {
      alert('Failed to update team');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const addPlayerToEditingTeam = () => {
    if (!editingTeam) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}_${editingTeam.players.length + 1}`,
      name: '',
      jerseyNumber: editingTeam.players.length + 1,
      role: 'Player',
      isCaptain: false,
    };
    setEditingTeam({
      ...editingTeam,
      players: [...editingTeam.players, newPlayer],
    });
  };

  const updateEditingPlayer = (idx: number, updates: Partial<Player>) => {
    if (!editingTeam) return;
    const updated = [...editingTeam.players];
    updated[idx] = { ...updated[idx], ...updates };
    setEditingTeam({ ...editingTeam, players: updated });
  };

  const removePlayerFromEditingTeam = (idx: number) => {
    if (!editingTeam) return;
    const updated = editingTeam.players.filter((_, i) => i !== idx);
    setEditingTeam({ ...editingTeam, players: updated });
  };

  const toggleCaptainInEditingTeam = (idx: number) => {
    if (!editingTeam) return;
    const updated = editingTeam.players.map((p, i) => ({
      ...p,
      isCaptain: i === idx,
    }));
    setEditingTeam({ ...editingTeam, players: updated });
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await api.deleteTeam(id);
      onRefreshTeams();
    } catch (err) {
      alert('Failed to delete team');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Selector: Manual vs Bulk Excel vs Image OCR */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Team & Squad Roster Hub
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Add teams manually, batch import via Excel/CSV, or extract from roster graphics & OCR text.
            </p>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bulk'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Excel (.xlsx / .csv)</span>
            </button>

            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ocr'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Poster / Text OCR</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MANUAL ENTRY */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Team / Club Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Raipur Rhinos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Short Code (3-4 Letters)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RRH"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Club Theme Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-400">{color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Team Owner / Manager
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. Aarav Sharma (PGP-1)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Co-Owner
                </label>
                <input
                  type="text"
                  value={coOwner}
                  onChange={(e) => setCoOwner(e.target.value)}
                  placeholder="e.g. Priya Verma (PGP-2)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Emergency Contact / WhatsApp
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Players Table */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Squad Players ({players.filter((p) => p.name.trim()).length} / Min {currentEvent.teamCapacity.min})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addPlayerRow}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Player</span>
                </button>
              </div>

              <div className="space-y-2">
                {players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="w-16">
                      <input
                        type="number"
                        placeholder="#"
                        value={p.jerseyNumber}
                        onChange={(e) => updatePlayerField(p.id, 'jerseyNumber', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs text-amber-400"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <input
                        type="text"
                        placeholder="Player full name..."
                        value={p.name}
                        onChange={(e) => updatePlayerField(p.id, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="text"
                        placeholder="Role / Position"
                        value={p.role}
                        onChange={(e) => updatePlayerField(p.id, 'role', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-300"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isCaptain}
                        onChange={(e) => updatePlayerField(p.id, 'isCaptain', e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="text-[11px]">Capt.</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayerRow(p.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Save Team</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: BULK EXCEL / CSV */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Batch Import via Spreadsheet</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload an `.xlsx` or `.csv` file with columns: Team Name, Owner, Co-Owner, Player Name, Jersey Number, Role.
                </p>
              </div>
              <button
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Dropzone */}
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl cursor-pointer bg-slate-950/40 hover:bg-slate-950 transition-all">
              <Upload className="w-10 h-10 text-emerald-400 mb-3" />
              <span className="text-sm font-bold text-white mb-1">
                {uploadFileName ? uploadFileName : 'Drop Excel or CSV file here, or click to browse'}
              </span>
              <span className="text-xs text-slate-400">Supports .xlsx, .xls, .csv files</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Preview of Parsed Teams */}
            {bulkPreview.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-400">
                    Parsed {bulkPreview.length} Teams Ready to Import:
                  </span>
                  <button
                    onClick={handleSaveBulkTeams}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Import All Teams</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {bulkPreview.map((team, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">{team.name}</span>
                        <span className="text-xs text-emerald-400 font-semibold">
                          {team.players?.length} Players
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        Owner: <span className="text-slate-200">{team.owner}</span> • Co-Owner: <span className="text-slate-200">{team.coOwner}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Players: {team.players?.map((p) => p.name).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OCR / TEXT PARSER */}
        {activeTab === 'ocr' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Roster Text / Poster OCR Parser
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste raw team announcement text or copy from tournament posters to automatically extract team details into editable cards.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Paste Roster Content
              </label>
              <textarea
                rows={6}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Example:&#10;Team Name: Raipur Rhinos&#10;Owner: Aarav Sharma&#10;1. Aarav Sharma (Captain)&#10;2. Kabir Das (Winger)&#10;3. Manish Paul (Goalkeeper)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseOcr}
                disabled={ocrLoading || !ocrText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{ocrLoading ? 'Parsing Text...' : 'Parse Text into Squad Card'}</span>
              </button>
            </div>

            {/* Parsed Preview Card */}
            {ocrParsedTeam && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Extracted Preview (Verify & Tweak)
                    </span>
                    <input
                      type="text"
                      value={ocrParsedTeam.name || ''}
                      onChange={(e) => setOcrParsedTeam({ ...ocrParsedTeam, name: e.target.value })}
                      placeholder="Team Name"
                      className="text-lg font-black text-white bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 mt-1 w-full focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    onClick={handleSaveOcrTeam}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shrink-0 ml-3"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Team</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      Manager / Owner
                    </label>
                    <input
                      type="text"
                      value={ocrParsedTeam.owner || ''}
                      onChange={(e) => setOcrParsedTeam({ ...ocrParsedTeam, owner: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                      placeholder="Owner Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      Co-Owner
                    </label>
                    <input
                      type="text"
                      value={ocrParsedTeam.coOwner || ''}
                      onChange={(e) => setOcrParsedTeam({ ...ocrParsedTeam, coOwner: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                      placeholder="Co-Owner Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={ocrParsedTeam.contactNumber || ''}
                      onChange={(e) => setOcrParsedTeam({ ...ocrParsedTeam, contactNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                      placeholder="Contact No."
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-400 mb-2">
                    Extracted Squad ({ocrParsedTeam.players?.length || 0}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {ocrParsedTeam.players?.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <span className="font-semibold text-slate-200">
                          #{p.jerseyNumber} {p.name} {p.isCaptain && <span className="text-amber-400 font-bold text-[10px]">(C)</span>}
                        </span>
                        <span className="text-slate-400 text-[11px]">{p.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Teams List */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Registered Teams ({teams.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Min requirement: 2 teams to schedule tournament
          </span>
        </div>

        {teams.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No teams registered yet. Use the form above to add teams!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || '#10b981' }}
                      />
                      <span className="font-bold text-white text-sm truncate">{t.name}</span>
                      {t.shortCode && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          [{t.shortCode}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setEditingTeam({
                            ...t,
                            players: t.players ? t.players.map((p) => ({ ...p })) : [],
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Edit team details & squad"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Remove team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 mb-3">
                    <div>
                      Mgr: <span className="text-slate-200">{t.owner}</span>
                    </div>
                    <div>
                      Co-Owner: <span className="text-slate-200">{t.coOwner}</span>
                    </div>
                    {t.contactNumber && (
                      <div className="text-slate-400">
                        Ph: <span className="text-slate-300 font-mono">{t.contactNumber}</span>
                      </div>
                    )}
                    <div className="text-emerald-400 font-semibold">
                      {t.players.length} Squad Members
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 truncate">
                  Captain:{' '}
                  <span className="text-slate-400">
                    {t.players.find((p) => p.isCaptain)?.name || 'None'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT TEAM & SQUAD MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Manage Squad & Details
                </span>
                <h3 className="text-xl font-black text-white">Edit Team: {editingTeam.name}</h3>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTeam} className="space-y-5">
              {/* Team Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Short Code (3-4 Chars)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editingTeam.shortCode || ''}
                    onChange={(e) =>
                      setEditingTeam({ ...editingTeam, shortCode: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Color, Manager & Co-Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Team Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTeam.color || '#10b981'}
                      onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={editingTeam.color || '#10b981'}
                      onChange={(e) => setEditingTeam({ ...editingTeam, color: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Owner / Manager
                  </label>
                  <input
                    type="text"
                    value={editingTeam.owner || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Co-Owner
                  </label>
                  <input
                    type="text"
                    value={editingTeam.coOwner || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, coOwner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={editingTeam.contactNumber || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, contactNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Players Roster */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Squad Players ({editingTeam.players.length})
                  </span>
                  <button
                    type="button"
                    onClick={addPlayerToEditingTeam}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Player</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editingTeam.players.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No players added to this squad yet. Click "Add Player" above.
                    </div>
                  ) : (
                    editingTeam.players.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800"
                      >
                        <input
                          type="number"
                          min="1"
                          value={p.jerseyNumber}
                          onChange={(e) =>
                            updateEditingPlayer(idx, {
                              jerseyNumber: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          placeholder="#"
                          className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-white"
                        />
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => updateEditingPlayer(idx, { name: e.target.value })}
                          placeholder="Player Name"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={p.role}
                          onChange={(e) => updateEditingPlayer(idx, { role: e.target.value })}
                          placeholder="Role (e.g. Forward)"
                          className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => toggleCaptainInEditingTeam(idx)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            p.isCaptain
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {p.isCaptain ? '★ Capt' : 'Capt?'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePlayerFromEditingTeam(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Remove player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
