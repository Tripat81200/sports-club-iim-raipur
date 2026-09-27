import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  CheckCircle2,
  Trash2,
  Trophy,
  Edit,
  Radio,
  Star,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  X,
  Check,
  Activity,
  FileSpreadsheet,
  Upload,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { Fixture, Team, TournamentEvent, TournamentFormat, MatchPlayerStat } from '../../types';
import { api } from '../../services/api';

interface FixtureManagerProps {
  currentEvent: TournamentEvent;
  teams: Team[];
  fixtures: Fixture[];
  onRefreshFixtures: () => void;
  onRefreshStandings: () => void;
  onNavigateToBroadcast?: (fixtureId: string) => void;
}

export const FixtureManager: React.FC<FixtureManagerProps> = ({
  currentEvent,
  teams,
  fixtures,
  onRefreshFixtures,
  onRefreshStandings,
  onNavigateToBroadcast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>(
    currentEvent.format || 'round_robin'
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Excel Bulk Import State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFixturesPreview, setExcelFixturesPreview] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [replaceExistingFixtures, setReplaceExistingFixtures] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  // Manual Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHomeTeamId, setNewHomeTeamId] = useState('');
  const [newAwayTeamId, setNewAwayTeamId] = useState('');
  const [newRoundName, setNewRoundName] = useState('League Match');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('17:00');
  const [newVenue, setNewVenue] = useState('Main Sports Complex - Ground A');
  const [newNotes, setNewNotes] = useState('');
  const [isCreatingFixture, setIsCreatingFixture] = useState(false);

  // Edit & Result Logger Modal State
  const [activeFixture, setActiveFixture] = useState<Fixture | null>(null);
  const [editHomeTeamId, setEditHomeTeamId] = useState('');
  const [editAwayTeamId, setEditAwayTeamId] = useState('');
  const [editRoundName, setEditRoundName] = useState('');
  const [homeScore, setHomeScore] = useState<number | string>('');
  const [awayScore, setAwayScore] = useState<number | string>('');
  const [matchStatus, setMatchStatus] = useState<'scheduled' | 'live' | 'completed'>('scheduled');
  const [potmPlayerId, setPotmPlayerId] = useState<string>('');
  const [potmPerformance, setPotmPerformance] = useState('');
  const [playerStats, setPlayerStats] = useState<MatchPlayerStat[]>([]);
  const [matchNotes, setMatchNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [isSavingMatch, setIsSavingMatch] = useState(false);

  // Download Sample Template for Fixtures Excel
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Round': 'League Match 1',
        'Home Team': teams[0]?.name || 'Raipur Rhinos',
        'Away Team': teams[1]?.name || 'Naya Raipur Knights',
        'Date': new Date().toISOString().split('T')[0],
        'Time': '17:00',
        'Venue': 'Main Sports Complex - Ground A',
        'Home Score': '',
        'Away Score': '',
        'Notes': 'Opening fixture',
      },
      {
        'Round': 'League Match 2',
        'Home Team': teams[2]?.name || 'Mahanadi Warriors',
        'Away Team': teams[3]?.name || 'Bastar Blasters',
        'Date': new Date().toISOString().split('T')[0],
        'Time': '19:00',
        'Venue': 'Main Sports Complex - Ground B',
        'Home Score': '',
        'Away Score': '',
        'Notes': '',
      },
      {
        'Round': 'Semi Final 1',
        'Home Team': teams[4]?.name || 'Chhattisgarh Cheetahs',
        'Away Team': teams[5]?.name || 'Durg Dynamos',
        'Date': new Date(Date.now() + 86400000).toISOString().split('T')[0],
        'Time': '18:00',
        'Venue': 'Main Sports Complex',
        'Home Score': '',
        'Away Score': '',
        'Notes': 'Knockout Match',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fixtures');
    XLSX.writeFile(wb, `${currentEvent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_fixtures_template.xlsx`);
  };

  // Parse Excel / CSV file
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('The uploaded spreadsheet appears to be empty.');
          return;
        }

        const parsed = rows.map((r, idx) => {
          const round = r['Round'] || r['Round Name'] || r['Stage'] || r['Match'] || `Match ${idx + 1}`;
          const hTeam = r['Home Team'] || r['Team 1'] || r['Home'] || r['Team A'] || r['home'] || '';
          const aTeam = r['Away Team'] || r['Team 2'] || r['Away'] || r['Team B'] || r['away'] || '';

          let dateStr = r['Date'] || r['Match Date'] || r['Scheduled Date'] || r['date'] || '';
          if (dateStr instanceof Date) {
            dateStr = dateStr.toISOString().split('T')[0];
          } else if (typeof dateStr === 'string' && dateStr.trim()) {
            dateStr = dateStr.trim();
          } else {
            dateStr = new Date().toISOString().split('T')[0];
          }

          let timeStr = r['Time'] || r['Match Time'] || r['Scheduled Time'] || r['time'] || '17:00';
          if (typeof timeStr === 'number') {
            const totalMinutes = Math.round(timeStr * 24 * 60);
            const hrs = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const mins = String(totalMinutes % 60).padStart(2, '0');
            timeStr = `${hrs}:${mins}`;
          }

          const venue = r['Venue'] || r['Location'] || r['Ground'] || r['Court'] || 'Main Sports Complex';
          const hScore = r['Home Score'] !== undefined && r['Home Score'] !== '' ? r['Home Score'] : (r['Home Goals'] || r['Score 1'] || '');
          const aScore = r['Away Score'] !== undefined && r['Away Score'] !== '' ? r['Away Score'] : (r['Away Goals'] || r['Score 2'] || '');
          const notes = r['Notes'] || r['Remarks'] || '';

          return {
            roundNumber: idx + 1,
            roundName: String(round).trim(),
            homeTeamName: String(hTeam).trim(),
            awayTeamName: String(aTeam).trim(),
            scheduledDate: String(dateStr),
            scheduledTime: String(timeStr).trim(),
            venueLocation: String(venue).trim(),
            homeScore: hScore !== '' ? Number(hScore) : null,
            awayScore: aScore !== '' ? Number(aScore) : null,
            status: (hScore !== '' && aScore !== '') ? 'completed' : 'scheduled',
            notes: String(notes).trim(),
          };
        }).filter((f) => f.homeTeamName && f.awayTeamName);

        if (parsed.length === 0) {
          alert('Could not detect valid matches with Home Team and Away Team columns. Please check your file headers.');
          return;
        }

        setExcelFixturesPreview(parsed);
      } catch (err: any) {
        console.error(err);
        alert('Failed to read spreadsheet: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelImport = async () => {
    if (excelFixturesPreview.length === 0) return;
    setIsImportingExcel(true);
    try {
      await api.bulkImportFixtures(currentEvent.id, excelFixturesPreview, replaceExistingFixtures);
      onRefreshFixtures();
      onRefreshStandings();
      alert(`Successfully imported ${excelFixturesPreview.length} matches into the tournament schedule!`);
      setShowExcelModal(false);
      setExcelFixturesPreview([]);
      setExcelFileName('');
    } catch (err: any) {
      alert(err.message || 'Failed to import fixtures');
    } finally {
      setIsImportingExcel(false);
    }
  };

  // Generate Fixtures automatically
  const handleGenerate = async () => {
    if (teams.length < 2) {
      return alert('You need at least 2 teams to generate fixtures.');
    }
    if (
      fixtures.length > 0 &&
      !confirm('This will replace existing fixtures for this tournament with a fresh schedule. Continue?')
    ) {
      return;
    }

    setIsGenerating(true);
    try {
      await api.generateFixtures(currentEvent.id, selectedFormat);
      onRefreshFixtures();
      onRefreshStandings();
      alert('Tournament fixtures generated successfully!');
    } catch (err: any) {
      alert(err.message || 'Error generating fixtures');
    } finally {
      setIsGenerating(false);
    }
  };

  // Create Manual Custom Fixture
  const handleCreateManualFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeTeamId || !newAwayTeamId) {
      return alert('Please select both competing teams.');
    }
    if (newHomeTeamId === newAwayTeamId) {
      return alert('A team cannot play against itself. Please select two different teams.');
    }

    setIsCreatingFixture(true);
    try {
      const hTeam = teams.find((t) => t.id === newHomeTeamId);
      const aTeam = teams.find((t) => t.id === newAwayTeamId);

      await api.createFixture({
        eventId: currentEvent.id,
        roundNumber: fixtures.length + 1,
        roundName: newRoundName || 'Custom Match',
        homeTeamId: newHomeTeamId,
        awayTeamId: newAwayTeamId,
        homeTeamName: hTeam?.name || 'Home Team',
        awayTeamName: aTeam?.name || 'Away Team',
        scheduledDate: newDate,
        scheduledTime: newTime,
        venueLocation: newVenue,
        status: 'scheduled',
        notes: newNotes,
      });

      setShowCreateModal(false);
      setNewNotes('');
      onRefreshFixtures();
      alert('Custom match added to tournament schedule!');
    } catch (err: any) {
      alert(err.message || 'Failed to create custom match');
    } finally {
      setIsCreatingFixture(false);
    }
  };

  // Open Edit / Logger Modal
  const openEditModal = (f: Fixture) => {
    setActiveFixture(f);
    setEditHomeTeamId(f.homeTeamId);
    setEditAwayTeamId(f.awayTeamId);
    setEditRoundName(f.roundName);
    setHomeScore(f.homeScore !== null ? f.homeScore : '');
    setAwayScore(f.awayScore !== null ? f.awayScore : '');
    setMatchStatus(f.status);
    setPotmPlayerId(f.playerOfTheMatch?.playerId || '');
    setPotmPerformance(f.playerOfTheMatch?.performance || '');
    setPlayerStats(f.playerStats ? f.playerStats.map((p) => ({ ...p })) : []);
    setMatchNotes(f.notes || '');
    setScheduledDate(f.scheduledDate || '');
    setScheduledTime(f.scheduledTime || '');
    setVenueLocation(f.venueLocation || '');
  };

  // Player Stats Row Helpers
  const handleAddPlayerStatRow = () => {
    const hTeam = teams.find((t) => t.id === editHomeTeamId);
    const aTeam = teams.find((t) => t.id === editAwayTeamId);
    const defaultTeam = hTeam || aTeam;
    const defaultPlayer = defaultTeam?.players[0];

    const newStat: MatchPlayerStat = {
      playerId: defaultPlayer?.id || '',
      playerName: defaultPlayer?.name || '',
      teamId: defaultTeam?.id || '',
      teamName: defaultTeam?.name || '',
      goals: 0,
      assists: 0,
      runs: 0,
      wickets: 0,
      overs: 0,
      baskets: 0,
      rebounds: 0,
      points: 0,
    };
    setPlayerStats([...playerStats, newStat]);
  };

  const handlePlayerStatPlayerSelect = (idx: number, playerId: string) => {
    const hTeam = teams.find((t) => t.id === editHomeTeamId);
    const aTeam = teams.find((t) => t.id === editAwayTeamId);
    const allMatchPlayers = [
      ...(hTeam ? hTeam.players.map((p) => ({ ...p, teamId: hTeam.id, teamName: hTeam.name })) : []),
      ...(aTeam ? aTeam.players.map((p) => ({ ...p, teamId: aTeam.id, teamName: aTeam.name })) : []),
    ];
    const found = allMatchPlayers.find((p) => p.id === playerId);
    if (!found) return;

    const updated = [...playerStats];
    updated[idx] = {
      ...updated[idx],
      playerId: found.id,
      playerName: found.name,
      teamId: found.teamId,
      teamName: found.teamName,
    };
    setPlayerStats(updated);
  };

  const handleUpdatePlayerStat = (idx: number, updates: Partial<MatchPlayerStat>) => {
    const updated = [...playerStats];
    updated[idx] = { ...updated[idx], ...updates };
    setPlayerStats(updated);
  };

  const handleRemovePlayerStatRow = (idx: number) => {
    setPlayerStats(playerStats.filter((_, i) => i !== idx));
  };

  // Save Match Updates (both score, player stats, and fixture details)
  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFixture) return;

    setIsSavingMatch(true);
    try {
      let potmObj = null;
      if (potmPlayerId) {
        const hTeam = teams.find((t) => t.id === editHomeTeamId);
        const aTeam = teams.find((t) => t.id === editAwayTeamId);
        const allMatchPlayers = [...(hTeam?.players || []), ...(aTeam?.players || [])];
        const selectedPlayer = allMatchPlayers.find((p) => p.id === potmPlayerId);

        if (selectedPlayer) {
          const isHome = hTeam?.players.some((p) => p.id === potmPlayerId);
          potmObj = {
            playerId: selectedPlayer.id,
            playerName: selectedPlayer.name,
            teamId: isHome ? hTeam!.id : aTeam!.id,
            performance: potmPerformance,
          };
        }
      }

      const hTeamObj = teams.find((t) => t.id === editHomeTeamId);
      const aTeamObj = teams.find((t) => t.id === editAwayTeamId);

      // Filter out invalid/empty player stat entries
      const validPlayerStats = playerStats.filter((ps) => ps.playerId && ps.playerName);

      await api.updateFixture(activeFixture.id, {
        homeTeamId: editHomeTeamId,
        awayTeamId: editAwayTeamId,
        homeTeamName: hTeamObj?.name || activeFixture.homeTeamName,
        awayTeamName: aTeamObj?.name || activeFixture.awayTeamName,
        roundName: editRoundName || activeFixture.roundName,
        status: matchStatus,
        homeScore: homeScore !== '' ? Number(homeScore) : null,
        awayScore: awayScore !== '' ? Number(awayScore) : null,
        playerOfTheMatch: potmObj,
        playerStats: validPlayerStats,
        notes: matchNotes,
        scheduledDate,
        scheduledTime,
        venueLocation,
      });

      if (matchStatus === 'completed') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }

      onRefreshFixtures();
      onRefreshStandings();
      setActiveFixture(null);
    } catch (err) {
      alert('Error updating fixture details');
    } finally {
      setIsSavingMatch(false);
    }
  };

  const handleDeleteFixture = async (id: string) => {
    if (!confirm('Are you sure you want to remove this fixture from the schedule?')) return;
    try {
      await api.deleteFixture(id);
      onRefreshFixtures();
      onRefreshStandings();
    } catch (err) {
      alert('Failed to delete fixture');
    }
  };

  // Get active teams for player of the match selection
  const homeTeam = activeFixture ? teams.find((t) => t.id === editHomeTeamId) : null;
  const awayTeam = activeFixture ? teams.find((t) => t.id === editAwayTeamId) : null;

  return (
    <div className="space-y-8">
      {/* Top Generator & Manual Add Bar */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Fixtures & Match Management
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Auto-generate balanced tournament brackets or manually schedule and modify individual matches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Manual Custom Match Button */}
            <button
              onClick={() => {
                if (teams.length >= 2) {
                  setNewHomeTeamId(teams[0].id);
                  setNewAwayTeamId(teams[1].id);
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Custom Match</span>
            </button>

            {/* Import from Excel Button */}
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all border border-slate-700 hover:border-emerald-500/50 shadow-md"
              title="Upload spreadsheet with match schedule (.xlsx, .csv)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import from Excel</span>
            </button>

            {/* Auto Generator Dropdown */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as TournamentFormat)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="round_robin">Round Robin (Pure League)</option>
              <option value="league_playoffs">League + Knockout Playoffs</option>
              <option value="knockout">Knockout (Single Elimination)</option>
              <option value="double_elimination">Double Elimination</option>
            </select>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || teams.length < 2}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating...' : 'Auto-Generate'}</span>
            </button>
          </div>
        </div>

        {teams.length < 2 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <span>⚠️ You need to add at least 2 teams before scheduling fixtures.</span>
          </div>
        )}
      </div>

      {/* Scheduled Fixtures List */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Tournament Fixtures ({fixtures.length})
            </h3>
            <p className="text-xs text-slate-400">
              Click &apos;Modify / Log&apos; on any fixture to change teams, reschedule date/time, or record scores.
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold">
            {fixtures.filter((f) => f.status === 'completed').length} Completed
          </span>
        </div>

        {fixtures.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No fixtures scheduled yet. Use &apos;+ Add Custom Match&apos; or &apos;Auto-Generate&apos; above.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {fixtures.map((fixture) => {
              const isLive = fixture.status === 'live';
              const isCompleted = fixture.status === 'completed';

              return (
                <div
                  key={fixture.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/40 px-3 rounded-xl transition-colors"
                >
                  {/* Left: Round & Timing */}
                  <div className="w-52 shrink-0">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      {fixture.roundName}
                    </span>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{fixture.scheduledDate} • {fixture.scheduledTime}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      📍 {fixture.venueLocation}
                    </div>
                  </div>

                  {/* Center: Teams & Scores */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-white truncate max-w-[160px]">
                        {fixture.homeTeamName}
                      </span>
                      <span className="font-mono font-black text-base text-emerald-400 px-3">
                        {isCompleted || isLive ? `${fixture.homeScore ?? 0} : ${fixture.awayScore ?? 0}` : 'vs'}
                      </span>
                      <span className="font-bold text-white truncate max-w-[160px] text-right">
                        {fixture.awayTeamName}
                      </span>
                    </div>

                    {fixture.playerOfTheMatch && (
                      <div className="mt-1 text-center text-[11px] text-amber-400 font-semibold flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>POTM: {fixture.playerOfTheMatch.playerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Status Pill & Actions */}
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                        LIVE
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30">
                        Final
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                        Scheduled
                      </span>
                    )}

                    {/* Modify / Log Button */}
                    <button
                      onClick={() => openEditModal(fixture)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                      title="Edit teams, court, timing, or log scores"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modify / Log</span>
                    </button>

                    {onNavigateToBroadcast && (
                      <button
                        onClick={() => onNavigateToBroadcast(fixture.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Generate WhatsApp Broadcast"
                      >
                        Hype
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteFixture(fixture.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete fixture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD CUSTOM FIXTURE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-7 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Manual Match Creator
                </span>
                <h3 className="text-xl font-black text-white">Schedule Custom Fixture</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualFixture} className="space-y-4">
              {/* Teams Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Home Team *
                  </label>
                  <select
                    value={newHomeTeamId}
                    onChange={(e) => setNewHomeTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Away Team *
                  </label>
                  <select
                    value={newAwayTeamId}
                    onChange={(e) => setNewAwayTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Round Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Round / Match Stage Label
                </label>
                <input
                  type="text"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  placeholder="e.g. Semifinal 1, Exhibition Match, Group B"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date, Time, Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Time Slot
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Court / Pitch
                  </label>
                  <input
                    type="text"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    placeholder="e.g. Court 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Match Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Optional Match Note
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Special campus showcase game"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFixture}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  {isCreatingFixture ? 'Adding Match...' : 'Add Match to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL EDIT & SCORE LOGGER MODAL */}
      {activeFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Modify Fixture & Official Scorecard
                </span>
                <h3 className="text-xl font-black text-white">Edit Match Details</h3>
              </div>
              <button
                onClick={() => setActiveFixture(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResult} className="space-y-5">
              {/* Change Teams */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                    Modify Competing Teams
                  </span>
                  <span className="text-[10px] text-slate-400">Can swap or re-assign teams</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      Home Team
                    </label>
                    <select
                      value={editHomeTeamId}
                      onChange={(e) => setEditHomeTeamId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      Away Team
                    </label>
                    <select
                      value={editAwayTeamId}
                      onChange={(e) => setEditAwayTeamId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Match Stage / Round Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Round / Match Stage Name
                </label>
                <input
                  type="text"
                  value={editRoundName}
                  onChange={(e) => setEditRoundName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              {/* Match State Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Match State
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['scheduled', 'live', 'completed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setMatchStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        matchStatus === st
                          ? st === 'live'
                            ? 'bg-rose-500 text-white border-rose-400'
                            : st === 'completed'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score Input */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 truncate">
                    {homeTeam?.name || 'Home Team'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Score"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center font-mono font-black text-2xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 truncate text-right">
                    {awayTeam?.name || 'Away Team'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Score"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center font-mono font-black text-2xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Player of the Match Selection */}
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  <span>Award Player of the Match (POTM)</span>
                </label>
                <select
                  value={potmPlayerId}
                  onChange={(e) => setPotmPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- No POTM Selected --</option>
                  <optgroup label={`${homeTeam?.name || 'Home'} Players`}>
                    {homeTeam?.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name} ({p.role})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={`${awayTeam?.name || 'Away'} Players`}>
                    {awayTeam?.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name} ({p.role})
                      </option>
                    ))}
                  </optgroup>
                </select>

                {potmPlayerId && (
                  <input
                    type="text"
                    placeholder="Highlight performance note (e.g. 2 Goals & 1 Assist)"
                    value={potmPerformance}
                    onChange={(e) => setPotmPerformance(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200"
                  />
                )}
              </div>

              {/* OPTIONAL PLAYER PERFORMANCE STATS */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Player Performance Stats
                      </span>
                      <span className="ml-2 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Optional • {currentEvent.sport}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPlayerStatRow}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Player Stat</span>
                  </button>
                </div>

                {playerStats.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No player contributions logged yet. Click "+ Add Player Stat" to record goals, wickets, runs, baskets, etc.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {playerStats.map((stat, idx) => {
                      const isFootball = /football|soccer/i.test(currentEvent.sport);
                      const isCricket = /cricket/i.test(currentEvent.sport);
                      const isBasketball = /basketball/i.test(currentEvent.sport);

                      return (
                        <div
                          key={idx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs"
                        >
                          <select
                            value={stat.playerId}
                            onChange={(e) => handlePlayerStatPlayerSelect(idx, e.target.value)}
                            className="flex-1 min-w-[150px] bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="">-- Choose Player --</option>
                            <optgroup label={`${homeTeam?.name || 'Home'} Players`}>
                              {homeTeam?.players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  #{p.jerseyNumber} {p.name} ({homeTeam.shortCode || homeTeam.name})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label={`${awayTeam?.name || 'Away'} Players`}>
                              {awayTeam?.players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  #{p.jerseyNumber} {p.name} ({awayTeam.shortCode || awayTeam.name})
                                </option>
                              ))}
                            </optgroup>
                          </select>

                          {/* Dynamic Sport Inputs */}
                          {isFootball && (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">⚽ Goals</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.goals ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { goals: parseInt(e.target.value, 10) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">🅰 Ast</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.assists ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { assists: parseInt(e.target.value, 10) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                            </>
                          )}

                          {isCricket && (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">🏏 Runs</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.runs ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { runs: parseInt(e.target.value, 10) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">🎯 Wkts</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.wickets ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { wickets: parseInt(e.target.value, 10) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">Overs</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={stat.overs ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { overs: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                            </>
                          )}

                          {isBasketball && (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">🏀 Pts</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.baskets ?? stat.points ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, {
                                      baskets: parseInt(e.target.value, 10) || 0,
                                      points: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">Reb</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={stat.rebounds ?? 0}
                                  onChange={(e) =>
                                    handleUpdatePlayerStat(idx, { rebounds: parseInt(e.target.value, 10) || 0 })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                                />
                              </div>
                            </>
                          )}

                          {!isFootball && !isCricket && !isBasketball && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold">Points</span>
                              <input
                                type="number"
                                min="0"
                                value={stat.points ?? 0}
                                onChange={(e) =>
                                  handleUpdatePlayerStat(idx, { points: parseInt(e.target.value, 10) || 0 })
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-mono text-xs text-white"
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemovePlayerStatRow(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove stat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Timing & Court Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Time Slot
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pitch / Court
                  </label>
                  <input
                    type="text"
                    value={venueLocation}
                    onChange={(e) => setVenueLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Match Notes / Highlights
                </label>
                <input
                  type="text"
                  placeholder="e.g. Last minute stoppage winner"
                  value={matchNotes}
                  onChange={(e) => setMatchNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFixture(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMatch}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
                >
                  {isSavingMatch ? 'Saving...' : 'Save Fixture & Recalculate Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL FIXTURES MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Import Fixtures from Excel</h3>
                  <p className="text-xs text-slate-400">
                    Upload an .xlsx or .csv spreadsheet containing your tournament match schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelFixturesPreview([]);
                  setExcelFileName('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download & File Upload Area */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Need the format? Download sample spreadsheet</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pre-filled with your registered teams and standard columns (Round, Home Team, Away Team, Date, Time, Venue).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Template (.xlsx)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all bg-slate-950/60">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    {excelFileName ? excelFileName : 'Choose an Excel or CSV file'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Click to browse or drag and drop your schedule file (.xlsx, .xls, .csv)
                  </span>
                </div>
              </div>

              {/* Import Options Toggle */}
              {excelFixturesPreview.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-300">Schedule Mode:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="importMode"
                        checked={!replaceExistingFixtures}
                        onChange={() => setReplaceExistingFixtures(false)}
                        className="text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>Append to existing ({fixtures.length}) matches</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                      <input
                        type="radio"
                        name="importMode"
                        checked={replaceExistingFixtures}
                        onChange={() => setReplaceExistingFixtures(true)}
                        className="text-rose-500 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>Replace current schedule</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Parsed Preview Table */}
            {excelFixturesPreview.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider">
                    Parsed Matches Preview ({excelFixturesPreview.length})
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    ✓ Ready to Import
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Round</th>
                        <th className="py-2.5 px-3">Matchup</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Venue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {excelFixturesPreview.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-300">{m.roundName}</td>
                          <td className="py-2 px-3 font-bold text-white">
                            <span className="text-emerald-400">{m.homeTeamName}</span>
                            <span className="text-slate-500 mx-1.5 font-normal">vs</span>
                            <span className="text-amber-400">{m.awayTeamName}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                            {m.scheduledDate} • {m.scheduledTime}
                          </td>
                          <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">
                            {m.venueLocation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelFixturesPreview([]);
                  setExcelFileName('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmExcelImport}
                disabled={excelFixturesPreview.length === 0 || isImportingExcel}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-all shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isImportingExcel
                    ? 'Importing Matches...'
                    : `Confirm & Import ${excelFixturesPreview.length > 0 ? `(${excelFixturesPreview.length}) Matches` : ''}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
