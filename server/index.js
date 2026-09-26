import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateRoundRobin,
  generateKnockout,
  generateLeagueWithPlayoffs,
  generateDoubleElimination,
} from './algorithms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'store.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to read database
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { events: [], teams: [], fixtures: [] };
  }
}

// Helper to write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// ========================
// EVENTS API
// ========================
app.get('/api/events', (req, res) => {
  const db = readDb();
  res.json(db.events || []);
});

app.post('/api/events', (req, res) => {
  const db = readDb();
  const newEvent = {
    id: `evt_${Date.now()}`,
    name: req.body.name || 'New Tournament',
    sport: req.body.sport || 'Football',
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    endDate: req.body.endDate || new Date().toISOString().split('T')[0],
    venue: req.body.venue || 'IIM Raipur Sports Complex',
    format: req.body.format || 'round_robin', // round_robin, knockout, league_playoffs, double_elimination, exhibition
    scoringRules: {
      pointsWin: Number(req.body.scoringRules?.pointsWin ?? 3),
      pointsDraw: Number(req.body.scoringRules?.pointsDraw ?? 1),
      pointsLoss: Number(req.body.scoringRules?.pointsLoss ?? 0),
      bonusThreshold: Number(req.body.scoringRules?.bonusThreshold ?? 3),
      bonusPoints: Number(req.body.scoringRules?.bonusPoints ?? 0),
      penaltyPoints: Number(req.body.scoringRules?.penaltyPoints ?? 0),
    },
    teamCapacity: {
      min: Number(req.body.teamCapacity?.min ?? 5),
      max: Number(req.body.teamCapacity?.max ?? 15),
    },
  };
  db.events.push(newEvent);
  writeDb(db);
  res.status(201).json(newEvent);
});

app.put('/api/events/:id', (req, res) => {
  const db = readDb();
  const idx = db.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });

  db.events[idx] = {
    ...db.events[idx],
    ...req.body,
    scoringRules: {
      ...db.events[idx].scoringRules,
      ...(req.body.scoringRules || {}),
    },
    teamCapacity: {
      ...db.events[idx].teamCapacity,
      ...(req.body.teamCapacity || {}),
    },
  };
  writeDb(db);
  res.json(db.events[idx]);
});

app.delete('/api/events/:id', (req, res) => {
  const db = readDb();
  db.events = db.events.filter((e) => e.id !== req.params.id);
  db.teams = db.teams.filter((t) => t.eventId !== req.params.id);
  db.fixtures = db.fixtures.filter((f) => f.eventId !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ========================
// TEAMS API
// ========================
app.get('/api/teams', (req, res) => {
  const db = readDb();
  const { eventId } = req.query;
  if (eventId) {
    return res.json(db.teams.filter((t) => t.eventId === eventId));
  }
  res.json(db.teams || []);
});

app.post('/api/teams', (req, res) => {
  const db = readDb();
  const newTeam = {
    id: `team_${Date.now()}`,
    eventId: req.body.eventId,
    name: req.body.name,
    shortCode: req.body.shortCode || req.body.name.substring(0, 3).toUpperCase(),
    color: req.body.color || '#10b981',
    logoUrl: req.body.logoUrl || null,
    owner: req.body.owner || 'N/A',
    coOwner: req.body.coOwner || 'N/A',
    contactNumber: req.body.contactNumber || '',
    players: req.body.players || [],
  };
  db.teams.push(newTeam);
  writeDb(db);
  res.status(201).json(newTeam);
});

// Bulk import teams (from Excel/CSV parser)
app.post('/api/teams/bulk', (req, res) => {
  const db = readDb();
  const { eventId, teams } = req.body;
  if (!eventId || !Array.isArray(teams)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const added = [];
  for (const t of teams) {
    const newTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventId,
      name: t.name,
      shortCode: t.shortCode || t.name.substring(0, 3).toUpperCase(),
      color: t.color || '#10b981',
      logoUrl: t.logoUrl || null,
      owner: t.owner || 'N/A',
      coOwner: t.coOwner || 'N/A',
      contactNumber: t.contactNumber || '',
      players: t.players || [],
    };
    db.teams.push(newTeam);
    added.push(newTeam);
  }
  writeDb(db);
  res.status(201).json({ count: added.length, teams: added });
});

app.put('/api/teams/:id', (req, res) => {
  const db = readDb();
  const idx = db.teams.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Team not found' });

  db.teams[idx] = { ...db.teams[idx], ...req.body };
  writeDb(db);
  res.json(db.teams[idx]);
});

app.delete('/api/teams/:id', (req, res) => {
  const db = readDb();
  db.teams = db.teams.filter((t) => t.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ========================
// ADMIN SECURITY & PIN API
// ========================
let ADMIN_PIN = 'iimr2026';

app.post('/api/admin/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    return res.json({ success: true, token: 'iimr_admin_session_token' });
  }
  return res.status(401).json({ success: false, error: 'Incorrect Committee PIN' });
});

app.post('/api/admin/update-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (currentPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Current PIN is invalid' });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }
  ADMIN_PIN = newPin;
  res.json({ success: true, message: 'PIN updated successfully' });
});

// ========================
// FIXTURES API
// ========================
app.get('/api/fixtures', (req, res) => {
  const db = readDb();
  const { eventId } = req.query;
  if (eventId) {
    return res.json(db.fixtures.filter((f) => f.eventId === eventId));
  }
  res.json(db.fixtures || []);
});

// Create Manual Fixture
app.post('/api/fixtures', (req, res) => {
  const db = readDb();
  const homeTeam = db.teams.find((t) => t.id === req.body.homeTeamId);
  const awayTeam = db.teams.find((t) => t.id === req.body.awayTeamId);

  const newFixture = {
    id: `fix_${Date.now()}`,
    eventId: req.body.eventId,
    roundNumber: Number(req.body.roundNumber || 1),
    roundName: req.body.roundName || 'Special Match',
    homeTeamId: req.body.homeTeamId,
    awayTeamId: req.body.awayTeamId,
    homeTeamName: homeTeam ? homeTeam.name : req.body.homeTeamName || 'Team 1',
    awayTeamName: awayTeam ? awayTeam.name : req.body.awayTeamName || 'Team 2',
    scheduledDate: req.body.scheduledDate || new Date().toISOString().split('T')[0],
    scheduledTime: req.body.scheduledTime || '17:00',
    venueLocation: req.body.venueLocation || 'Main Sports Complex',
    status: req.body.status || 'scheduled',
    homeScore: req.body.homeScore !== undefined && req.body.homeScore !== '' ? Number(req.body.homeScore) : null,
    awayScore: req.body.awayScore !== undefined && req.body.awayScore !== '' ? Number(req.body.awayScore) : null,
    playerOfTheMatch: req.body.playerOfTheMatch || null,
    playerStats: req.body.playerStats || [],
    notes: req.body.notes || '',
  };
  db.fixtures.push(newFixture);
  writeDb(db);
  res.status(201).json(newFixture);
});

// Automated Fixture Generator
app.post('/api/fixtures/generate', (req, res) => {
  const db = readDb();
  const { eventId, format } = req.body;
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const teams = db.teams.filter((t) => t.eventId === eventId);
  if (teams.length < 2) {
    return res.status(400).json({ error: 'At least 2 teams required to generate fixtures' });
  }

  const selectedFormat = format || event.format || 'round_robin';
  let generated = [];
  const opts = { startDate: event.startDate };

  if (selectedFormat === 'knockout') {
    generated = generateKnockout(teams, eventId, opts);
  } else if (selectedFormat === 'league_playoffs') {
    generated = generateLeagueWithPlayoffs(teams, eventId, opts);
  } else if (selectedFormat === 'double_elimination') {
    generated = generateDoubleElimination(teams, eventId, opts);
  } else {
    generated = generateRoundRobin(teams, eventId, opts);
  }

  // Replace existing fixtures for this event
  db.fixtures = db.fixtures.filter((f) => f.eventId !== eventId);
  db.fixtures.push(...generated);
  writeDb(db);

  res.status(201).json({ count: generated.length, fixtures: generated });
});

// Update Any Fixture (manual modification of teams, timings, status, scores)
app.put('/api/fixtures/:id', (req, res) => {
  const db = readDb();
  const idx = db.fixtures.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Fixture not found' });

  // If team IDs changed, auto-update team names
  let hName = req.body.homeTeamName || db.fixtures[idx].homeTeamName;
  let aName = req.body.awayTeamName || db.fixtures[idx].awayTeamName;

  if (req.body.homeTeamId && req.body.homeTeamId !== db.fixtures[idx].homeTeamId) {
    const t = db.teams.find((x) => x.id === req.body.homeTeamId);
    if (t) hName = t.name;
  }
  if (req.body.awayTeamId && req.body.awayTeamId !== db.fixtures[idx].awayTeamId) {
    const t = db.teams.find((x) => x.id === req.body.awayTeamId);
    if (t) aName = t.name;
  }

  db.fixtures[idx] = {
    ...db.fixtures[idx],
    ...req.body,
    homeTeamName: hName,
    awayTeamName: aName,
  };
  writeDb(db);
  res.json(db.fixtures[idx]);
});

app.delete('/api/fixtures/:id', (req, res) => {
  const db = readDb();
  db.fixtures = db.fixtures.filter((f) => f.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/fixtures/event/:eventId', (req, res) => {
  const db = readDb();
  db.fixtures = db.fixtures.filter((f) => f.eventId !== req.params.eventId);
  writeDb(db);
  res.json({ success: true });
});

// ========================
// STANDINGS / LEADERBOARD API
// ========================
app.get('/api/standings/:eventId', (req, res) => {
  const db = readDb();
  const { eventId } = req.params;
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const rules = event.scoringRules || { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, bonusThreshold: 3, bonusPoints: 0 };
  const teams = db.teams.filter((t) => t.eventId === eventId);
  const fixtures = db.fixtures.filter((f) => f.eventId === eventId && f.status === 'completed');

  const table = {};
  for (const t of teams) {
    table[t.id] = {
      teamId: t.id,
      teamName: t.name,
      shortCode: t.shortCode,
      color: t.color,
      logoUrl: t.logoUrl || null,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      points: 0,
      form: [],
    };
  }

  const sortedFixtures = [...fixtures].sort((a, b) => {
    const dtA = `${a.scheduledDate} ${a.scheduledTime || '00:00'}`;
    const dtB = `${b.scheduledDate} ${b.scheduledTime || '00:00'}`;
    return dtA.localeCompare(dtB);
  });

  for (const f of sortedFixtures) {
    const home = table[f.homeTeamId];
    const away = table[f.awayTeamId];

    if (!home || !away) continue;
    if (f.homeScore === null || f.awayScore === null) continue;

    const hs = Number(f.homeScore);
    const as = Number(f.awayScore);

    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won += 1;
      home.points += rules.pointsWin;
      home.form.push('W');
      away.lost += 1;
      away.points += rules.pointsLoss;
      away.form.push('L');

      if (rules.bonusThreshold > 0 && hs - as >= rules.bonusThreshold) {
        home.bonusPoints += rules.bonusPoints;
        home.points += rules.bonusPoints;
      }
    } else if (hs < as) {
      away.won += 1;
      away.points += rules.pointsWin;
      away.form.push('W');
      home.lost += 1;
      home.points += rules.pointsLoss;
      home.form.push('L');

      if (rules.bonusThreshold > 0 && as - hs >= rules.bonusThreshold) {
        away.bonusPoints += rules.bonusPoints;
        away.points += rules.bonusPoints;
      }
    } else {
      home.drawn += 1;
      home.points += rules.pointsDraw;
      home.form.push('D');
      away.drawn += 1;
      away.points += rules.pointsDraw;
      away.form.push('D');
    }
  }

  const leaderboard = Object.values(table).map((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.recentForm = row.form.slice(-5);
    return row;
  });

  leaderboard.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  leaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  res.json({
    eventId,
    eventName: event.name,
    scoringRules: rules,
    standings: leaderboard,
  });
});

// ========================
// BROADCAST & WHATSAPP GENERATOR API
// Personalized by Tournament Stage, Rich Campus Hype Fillers, NO POTM, strictly NO em-dashes (—)
// Optimized length (500-580 chars) to maximize excitement without hitting WhatsApp's "Read More" fold
// ========================
app.get('/api/broadcasts/:type/:fixtureId', (req, res) => {
  const db = readDb();
  const { type, fixtureId } = req.params;
  const fixture = db.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

  const event = db.events.find((e) => e.id === fixture.eventId) || { name: 'Campus Tournament', venue: 'Sports Ground', sport: 'Match' };
  const homeTeam = db.teams.find((t) => t.id === fixture.homeTeamId) || { name: fixture.homeTeamName || 'Team A', players: [] };
  const awayTeam = db.teams.find((t) => t.id === fixture.awayTeamId) || { name: fixture.awayTeamName || 'Team B', players: [] };

  const allEventFixtures = db.fixtures.filter((f) => f.eventId === fixture.eventId);
  const upcomingMatches = allEventFixtures.filter(
    (f) => f.id !== fixtureId && (f.status === 'scheduled' || f.status === 'live')
  );
  const nextMatch = upcomingMatches[0] || null;

  const roundLower = (fixture.roundName || '').toLowerCase();
  const isFinal = roundLower.includes('final') && !roundLower.includes('semi') && !roundLower.includes('quarter');
  const isSemi = roundLower.includes('semi');
  const isQuarter = roundLower.includes('quarter') || roundLower.includes('eliminator');

  let message = '';

  if (type === 'post-match') {
    const hs = fixture.homeScore !== null ? Number(fixture.homeScore) : 0;
    const as = fixture.awayScore !== null ? Number(fixture.awayScore) : 0;
    const diff = Math.abs(hs - as);

    // Narrative based on margin & stage
    let dramaText = '';
    if (hs > as) {
      if (isFinal) {
        dramaText = `🏆 GLORY DECLARED! ${homeTeam.name} emerge victorious ${hs}:${as} to etch their names into campus folklore as champions!`;
      } else if (isSemi) {
        dramaText = `🔥 TICKET PUNCHED! ${homeTeam.name} take down ${awayTeam.name} ${hs}:${as} in a thrilling clash to march straight into the Grand Final!`;
      } else if (isQuarter) {
        dramaText = `⚡ KNOCKOUT TRIUMPH! ${homeTeam.name} conquer the pressure cook with a gritty ${hs}:${as} win to lock in a Semifinal berth!`;
      } else if (diff <= 1) {
        dramaText = `🔥 WHAT A THRILLER! ${homeTeam.name} edge out ${awayTeam.name} ${hs}:${as} after heart-stopping drama down to the final whistle!`;
      } else {
        dramaText = `🔥 STUNNING DISPLAY! ${homeTeam.name} power past ${awayTeam.name} with a commanding ${hs}:${as} win to send shockwaves across the table!`;
      }
    } else if (as > hs) {
      if (isFinal) {
        dramaText = `🏆 GLORY DECLARED! ${awayTeam.name} seal the championship ${as}:${hs} in a legendary finals masterclass!`;
      } else if (isSemi) {
        dramaText = `🔥 TICKET PUNCHED! ${awayTeam.name} topple ${homeTeam.name} ${as}:${hs} to claim their spot in the coveted Championship Final!`;
      } else if (isQuarter) {
        dramaText = `⚡ KNOCKOUT TRIUMPH! ${awayTeam.name} hold their nerve ${as}:${hs} to advance into the Final Four!`;
      } else if (diff <= 1) {
        dramaText = `🔥 NAIL-BITER TO THE END! ${awayTeam.name} snatch victory ${as}:${hs} in a breathtaking back-and-forth contest!`;
      } else {
        dramaText = `🔥 SENSATIONAL SHOW! ${awayTeam.name} dismantle the opposition ${as}:${hs} in an emphatic statement win!`;
      }
    } else {
      dramaText = `⚡ RELENTLESS DEADLOCK! An all-out slugfest ends ${hs}:${as} as neither titan yields an inch on the pitch!`;
    }

    let nextMatchLine = 'Next: Matchday action wraps up for today. Rest up, warriors!';
    if (nextMatch) {
      const nHome = nextMatch.homeTeamName || 'TBD';
      const nAway = nextMatch.awayTeamName || 'TBD';
      const nRound = nextMatch.roundName || 'Next Round';
      nextMatchLine = `👉 Up Next: ${nHome} vs ${nAway} at ${nextMatch.scheduledTime || 'TBD'} (${nextMatch.venueLocation || 'Ground'}) in ${nRound}. Don't miss a beat!`;
    }

    // High energy campus hype, NO POTM, NO em-dash, strictly under WhatsApp Read More limit
    message = `🏆 SPORTS CLUB IIM RAIPUR\nMATCH RESULT: ${event.name}\n\n⚽ ${homeTeam.name} ${hs} : ${as} ${awayTeam.name}\n${dramaText}\n\nThe energy in the stadium was unreal tonight! Massive gratitude to the crowds for bringing deafening cheers.\n\n📅 ${nextMatchLine}\n\nRegards,\nSports Club`;
  } else {
    // PRE-MATCH ANNOUNCEMENT PERSONALIZED BY STAGE
    const time = fixture.scheduledTime ? `${fixture.scheduledTime} hrs` : 'Today';
    const venue = fixture.venueLocation || event.venue || 'Sports Complex';

    if (isFinal) {
      message = `🏆 THE GRAND FINALE IS HERE!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏟️ ${event.name} * Championship Final\n⏰ Time: ${time} | 📍 Venue: ${venue}\n\nThis is the ultimate pinnacle! Blood, sweat, and campus pride culminate tonight under floodlights. Only one squad lifts the trophy and claims undisputed bragging rights. Don't watch from the sidelines. Pack the arena, bring batch banners, and scream your hearts out!\n\nRegards,\nSports Club`;
    } else if (isSemi) {
      message = `🔥 HIGH-VOLTAGE SEMIFINAL SHOWDOWN!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName}\n⏰ Match Time: ${time} | 📍 Venue: ${venue}\n\nThe Final Four is in session! One colossal victory away from the Championship match. Expect ferocious tackles, electric pace, and nerves of pure steel. Ditch your dorms and storm the stadium pitchside to cheer your batch into the finals!\n\nRegards,\nSports Club`;
    } else if (isQuarter) {
      message = `⚡ DO-OR-DIE KNOCKOUT THRILLER!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName}\n⏰ Match Time: ${time} | 📍 Venue: ${venue}\n\nWin or go home! Pure elimination madness on the line tonight. Every pass and every strike carries tournament survival. The campus is buzzing and the atmosphere will be electric. Be there to fuel your team across the finish line!\n\nRegards,\nSports Club`;
    } else {
      message = `🔥 COLOSSAL MATCHDAY AT IIM RAIPUR!\nSPORTS CLUB IIM RAIPUR\n\n⚽ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName}\n⏰ Match Time: ${time} | 📍 Venue: ${venue}\n\nMassive league points and table supremacy at stake! Both heavyweight squads are geared up to put on a spectacle. Gather your friends, fill the bleachers, and ignite the stadium with your batch chants!\n\nRegards,\nSports Club`;
    }
  }

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

  res.json({
    type,
    fixtureId,
    message,
    charCount: message.length,
    whatsappUrl,
  });
});

// ========================
// OCR / TEXT PARSER HELPER
// ========================
app.post('/api/ocr/parse', (req, res) => {
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'rawText is required' });

  // Intelligent regex extraction of team names, owner, co-owner, and players
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let parsedTeamName = 'Imported Squad';
  let owner = 'N/A';
  let coOwner = 'N/A';
  let contactNumber = '';
  const players = [];

  const coOwnerRegex = /(?:co[\s\-\_\.]*owner|joint[\s\-\_\.]*owner|co[\s\-\_\.]*manager|co[\s\-\_\.]*head)\s*[:\-\=]?\s*(.*)/i;
  const ownerRegex = /(?:(?<!co[\s\-\_\.]*)owner|manager|team[\s\-\_\.]*manager|head[\s\-\_\.]*coach|mentor)\s*[:\-\=]?\s*(.*)/i;
  const teamRegex = /(?:team[\s\-\_\.]*name|club[\s\-\_\.]*name|franchise|squad[\s\-\_\.]*name)\s*[:\-\=]?\s*(.*)/i;
  const contactRegex = /(?:contact|phone|mobile|call|whatsapp|tel)\s*[:\-\=]?\s*([0-9\+\-\s]{8,15})/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check contact number
    const contactMatch = line.match(contactRegex);
    if (contactMatch && !contactNumber) {
      contactNumber = contactMatch[1].trim();
    }

    // Check if line contains BOTH owner and co-owner (e.g. "Owner: Aarav | Co-Owner: Rohan")
    if (/(?:co[\s\-\_\.]*owner|joint[\s\-\_\.]*owner)/i.test(line) && /(?<!co[\s\-\_\.]*)owner/i.test(line)) {
      const parts = line.split(/[|,\/•;]/);
      for (const part of parts) {
        const coMatch = part.match(coOwnerRegex);
        if (coMatch && coMatch[1]?.trim()) {
          coOwner = coMatch[1].replace(/[:\-]/g, '').trim();
        }
        const oMatch = part.match(ownerRegex);
        if (oMatch && oMatch[1]?.trim() && !/(?:co[\s\-\_\.]*owner|joint[\s\-\_\.]*owner)/i.test(part)) {
          owner = oMatch[1].replace(/[:\-]/g, '').trim();
        }
      }
      continue;
    }

    // Check Co-Owner FIRST to eliminate collision with "owner" substring
    if (coOwnerRegex.test(line)) {
      const match = line.match(coOwnerRegex);
      let val = match && match[1] ? match[1].replace(/[:\-]/g, '').trim() : '';
      if (!val && i + 1 < lines.length && !/(team|owner|roster|squad|player|\d+)/i.test(lines[i + 1])) {
        // Multi-line: label on this line, value on next line
        val = lines[i + 1].trim();
        i++;
      }
      if (val) coOwner = val;
      continue;
    }

    // Check Owner SECOND (ensuring line does NOT contain co-owner)
    if (ownerRegex.test(line) && !/(?:co[\s\-\_\.]*owner|joint[\s\-\_\.]*owner)/i.test(line)) {
      const match = line.match(ownerRegex);
      let val = match && match[1] ? match[1].replace(/[:\-]/g, '').trim() : '';
      if (!val && i + 1 < lines.length && !/(team|owner|roster|squad|player|\d+)/i.test(lines[i + 1])) {
        // Multi-line: label on this line, value on next line
        val = lines[i + 1].trim();
        i++;
      }
      if (val) owner = val;
      continue;
    }

    // Check Team Name
    if (teamRegex.test(line) || /^team\s*[:\-]/i.test(line)) {
      const match = line.match(teamRegex) || line.match(/^team\s*[:\-]?\s*(.*)/i);
      let val = match && match[1] ? match[1].replace(/[:\-]/g, '').trim() : '';
      if (!val && i + 1 < lines.length && !/(owner|roster|player|\d+)/i.test(lines[i + 1])) {
        val = lines[i + 1].trim();
        i++;
      }
      if (val) parsedTeamName = val;
      continue;
    }

    // Ignore section headers like "PLAYERS:", "SQUAD:", "ROSTER:"
    if (/^(players|squad|roster|lineup|team members)\s*[:\-]?$/i.test(line)) {
      continue;
    }

    // Player with jersey number or role:
    // e.g. "10. Aarav Sharma (Forward) (C)", "7 - Kabir Malhotra - Striker", "#18 Virat Kohli (Captain)"
    const playerWithNumber = line.match(/^(?:#|\b)?(\d+)[\.\s\-\:\)\/\|]+([A-Za-z\s\.\'\-]+?)(?:\s*[\-\|\(]([^\)]+)[\)]?)?$/);
    if (playerWithNumber) {
      const num = parseInt(playerWithNumber[1], 10);
      const rawName = playerWithNumber[2].trim();
      const rawRole = playerWithNumber[3] ? playerWithNumber[3].trim() : 'Player';
      const isCaptain = /captain|\(c\)|\[c\]|\bcpt\b/i.test(line);

      players.push({
        id: `p_${Date.now()}_${players.length + 1}`,
        jerseyNumber: !isNaN(num) ? num : players.length + 1,
        name: rawName.replace(/\s*\((c|captain)\)/i, '').trim(),
        role: rawRole.replace(/\s*\((c|captain)\)/i, '').trim() || 'Player',
        isCaptain,
      });
    } else if (line.length >= 2 && !/roster|squad|tournament|players|contact|venue|schedule|date|iim\s*raipur/i.test(line)) {
      // Clean standalone player name
      const isCaptain = /captain|\(c\)|\[c\]/i.test(line);
      const cleanName = line.replace(/\s*\((c|captain|cpt)\)/i, '').replace(/^[•\-\*]\s*/, '').trim();
      if (cleanName.length > 1) {
        players.push({
          id: `p_${Date.now()}_${players.length + 1}`,
          jerseyNumber: players.length + 1,
          name: cleanName,
          role: 'Player',
          isCaptain,
        });
      }
    }
  }

  // Fallback for team name: if still 'Imported Squad', check if the first line is a title
  if (parsedTeamName === 'Imported Squad' && lines.length > 0) {
    const firstLine = lines[0];
    if (!/owner|player|\d+|roster|squad|contact|date/i.test(firstLine) && firstLine.length <= 40) {
      parsedTeamName = firstLine.replace(/[:\-]/g, '').trim();
    }
  }

  res.json({
    teamName: parsedTeamName,
    owner,
    coOwner,
    contactNumber,
    players,
  });
});

// ========================
// TOURNAMENT FULL STATE SYNC & BACKUP
// ========================
app.get('/api/export-state', (req, res) => {
  const db = readDb();
  res.json({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: db,
  });
});

app.post('/api/sync-state', (req, res) => {
  const { events, teams, fixtures } = req.body;
  if (!events || !teams || !fixtures) {
    return res.status(400).json({ error: 'Payload must contain events, teams, and fixtures' });
  }

  const db = {
    events,
    teams,
    fixtures,
    lastSyncedAt: new Date().toISOString(),
  };

  writeDb(db);
  console.log(`[STATE SYNC] Tournament state synchronized with ${events.length} events, ${teams.length} teams, ${fixtures.length} fixtures`);
  res.json({ success: true, message: 'Tournament state synced successfully', syncedAt: db.lastSyncedAt });
});

// Serve static files from the frontend build if available
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Sports Club IIM Raipur API & Web running on http://localhost:${PORT}`);
});
