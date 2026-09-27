import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
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

// In-memory cache for ultra-fast sync reads & writes
let memoryDb = null;
let mongoClient = null;
let mongoCollection = null;
let isMongoConnected = false;

function initLocalDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDb = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local DB:', err);
    memoryDb = { events: [], teams: [], fixtures: [] };
  }
}
initLocalDb();

async function initMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Storage] MONGODB_URI environment variable not set. Running with local store.json.');
    return;
  }

  try {
    console.log('[Storage] Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    await mongoClient.connect();
    const db = mongoClient.db('iimr_sports');
    mongoCollection = db.collection('tournament_state');
    isMongoConnected = true;
    console.log('----------------------------------------------------');
    console.log('>>> [Storage] CONNECTED TO MONGODB ATLAS 24/7 CLOUD DB!');
    console.log('----------------------------------------------------');

    // Fetch existing state from MongoDB Atlas
    const cloudState = await mongoCollection.findOne({ id: 'main_state' });
    if (cloudState && Array.isArray(cloudState.events) && Array.isArray(cloudState.teams)) {
      memoryDb = {
        events: cloudState.events,
        teams: cloudState.teams,
        fixtures: cloudState.fixtures || [],
        lastSyncedAt: cloudState.lastSyncedAt || new Date().toISOString(),
      };
      console.log(`[Storage] Loaded data from MongoDB Atlas: ${memoryDb.events.length} events, ${memoryDb.teams.length} teams, ${memoryDb.fixtures.length} fixtures.`);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
      } catch (e) {}
    } else {
      // First time on MongoDB Atlas: Seed with initial data
      console.log('[Storage] Initializing MongoDB Atlas with tournament state...');
      await mongoCollection.updateOne(
        { id: 'main_state' },
        {
          $set: {
            id: 'main_state',
            events: memoryDb.events,
            teams: memoryDb.teams,
            fixtures: memoryDb.fixtures,
            lastSyncedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      console.log('[Storage] MongoDB Atlas seeded successfully!');
    }
  } catch (err) {
    isMongoConnected = false;
    console.error('[Storage Error] Failed to connect to MongoDB Atlas:', err.message);
    console.log('[Storage Fallback] Continuing with local file storage (store.json).');
  }
}

// Start MongoDB async connection
initMongoDB();

// Helper to read database
function readDb() {
  if (!memoryDb) {
    initLocalDb();
  }
  return memoryDb;
}

// Helper to write database
function writeDb(data) {
  memoryDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local DB:', err);
  }

  if (isMongoConnected && mongoCollection) {
    mongoCollection
      .updateOne(
        { id: 'main_state' },
        {
          $set: {
            id: 'main_state',
            events: data.events,
            teams: data.teams,
            fixtures: data.fixtures,
            lastSyncedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      )
      .catch((err) => {
        console.error('[Storage Error] Failed to sync to MongoDB Atlas:', err.message);
      });
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

// Bulk Import Fixtures (from Excel/CSV parser)
app.post('/api/fixtures/bulk', (req, res) => {
  const db = readDb();
  const { eventId, fixtures, replaceExisting } = req.body;
  if (!eventId || !Array.isArray(fixtures)) {
    return res.status(400).json({ error: 'Invalid payload: eventId and fixtures array required' });
  }

  const eventTeams = db.teams.filter((t) => t.eventId === eventId);

  if (replaceExisting) {
    db.fixtures = db.fixtures.filter((f) => f.eventId !== eventId);
  }

  const added = [];
  const baseTime = Date.now();

  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    const hRaw = String(f.homeTeamName || f.homeTeam || f['Home Team'] || f['Team 1'] || '').trim();
    const aRaw = String(f.awayTeamName || f.awayTeam || f['Away Team'] || f['Team 2'] || '').trim();

    // Match home & away teams
    const homeTeam = eventTeams.find(
      (t) =>
        t.id === f.homeTeamId ||
        t.name.toLowerCase() === hRaw.toLowerCase() ||
        (t.shortCode && t.shortCode.toLowerCase() === hRaw.toLowerCase())
    );
    const awayTeam = eventTeams.find(
      (t) =>
        t.id === f.awayTeamId ||
        t.name.toLowerCase() === aRaw.toLowerCase() ||
        (t.shortCode && t.shortCode.toLowerCase() === aRaw.toLowerCase())
    );

    const hasHomeScore = f.homeScore !== undefined && f.homeScore !== '' && f.homeScore !== null;
    const hasAwayScore = f.awayScore !== undefined && f.awayScore !== '' && f.awayScore !== null;
    const isCompleted = f.status === 'completed' || (hasHomeScore && hasAwayScore);

    const newFixture = {
      id: `fix_${baseTime}_${i}_${Math.random().toString(36).substr(2, 4)}`,
      eventId,
      roundNumber: Number(f.roundNumber || i + 1),
      roundName: f.roundName || f['Round'] || f['Stage'] || `Match ${i + 1}`,
      homeTeamId: homeTeam ? homeTeam.id : (f.homeTeamId || `custom_${baseTime}_h${i}`),
      awayTeamId: awayTeam ? awayTeam.id : (f.awayTeamId || `custom_${baseTime}_a${i}`),
      homeTeamName: homeTeam ? homeTeam.name : (hRaw || 'Team 1'),
      awayTeamName: awayTeam ? awayTeam.name : (aRaw || 'Team 2'),
      scheduledDate: String(f.scheduledDate || f.date || f['Date'] || new Date().toISOString().split('T')[0]).trim(),
      scheduledTime: String(f.scheduledTime || f.time || f['Time'] || '17:00').trim(),
      venueLocation: String(f.venueLocation || f.venue || f['Venue'] || 'Main Sports Complex').trim(),
      status: isCompleted ? 'completed' : (f.status || 'scheduled'),
      homeScore: hasHomeScore ? Number(f.homeScore) : null,
      awayScore: hasAwayScore ? Number(f.awayScore) : null,
      notes: f.notes || f['Notes'] || '',
      playerOfTheMatch: null,
      playerStats: [],
    };

    db.fixtures.push(newFixture);
    added.push(newFixture);
  }

  writeDb(db);
  res.status(201).json({ count: added.length, fixtures: added });
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
// Fully Context-Aware: Computes Prior Match Results, Streaks, Comebacks & Debuts
// Dynamic Varied Copy across Every Single Fixture and Stage, NO POTM, strictly NO em-dashes (—)
// Optimized length (340-440 chars) to prevent triggering WhatsApp's "Read More" truncation
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

  // Chronological comparator based on date, time, and round
  const getFixtureDateTime = (f) => {
    const d = String(f.scheduledDate || '1970-01-01').trim();
    let t = String(f.scheduledTime || '00:00').trim();
    if (t.length === 4 && t.indexOf(':') === 1) t = '0' + t;
    return `${d} ${t}`;
  };

  const compareFixturesChronological = (a, b) => {
    const dtA = getFixtureDateTime(a);
    const dtB = getFixtureDateTime(b);
    if (dtA !== dtB) return dtA.localeCompare(dtB);
    const rA = Number(a.roundNumber || 0);
    const rB = Number(b.roundNumber || 0);
    if (rA !== rB) return rA - rB;
    return String(a.id).localeCompare(String(b.id));
  };

  // Robust team matcher across IDs, team names, and short codes
  const isTeamInFixture = (f, team) => {
    if (!team) return false;
    const tId = String(team.id || '').trim().toLowerCase();
    const tName = String(team.name || '').trim().toLowerCase();
    const tCode = String(team.shortCode || '').trim().toLowerCase();

    const fHomeId = String(f.homeTeamId || '').trim().toLowerCase();
    const fAwayId = String(f.awayTeamId || '').trim().toLowerCase();
    const fHomeName = String(f.homeTeamName || '').trim().toLowerCase();
    const fAwayName = String(f.awayTeamName || '').trim().toLowerCase();

    const isHome = (tId && fHomeId === tId) || (tName && fHomeName === tName) || (tCode && fHomeName === tCode);
    const isAway = (tId && fAwayId === tId) || (tName && fAwayName === tName) || (tCode && fAwayName === tCode);

    if (isHome) return 'home';
    if (isAway) return 'away';
    return null;
  };

  // Only matches that were scheduled and completed STRICTLY BEFORE this fixture in date and time
  const priorCompletedFixtures = allEventFixtures.filter((f) => {
    if (f.id === fixture.id) return false;
    if (f.status !== 'completed' || f.homeScore === null || f.awayScore === null) return false;
    return compareFixturesChronological(f, fixture) < 0;
  });

  // Calculate team previous history, streaks, and form strictly before this match
  const getTeamHistory = (team) => {
    if (!team) return { played: 0, lastResult: null, streakType: null, streakCount: 0 };

    const matches = priorCompletedFixtures
      .map((f) => {
        const side = isTeamInFixture(f, team);
        return side ? { fixture: f, side } : null;
      })
      .filter(Boolean);

    matches.sort((a, b) => compareFixturesChronological(a.fixture, b.fixture));

    let streakType = null; // 'W', 'L', 'D'
    let streakCount = 0;
    let lastResult = null; // 'W', 'L', 'D'

    for (const item of matches) {
      const { fixture: m, side } = item;
      const isHome = side === 'home';
      const tScore = Number(isHome ? m.homeScore : m.awayScore);
      const oScore = Number(isHome ? m.awayScore : m.homeScore);

      let res = 'D';
      if (tScore > oScore) res = 'W';
      else if (tScore < oScore) res = 'L';

      if (res === streakType) {
        streakCount++;
      } else {
        streakType = res;
        streakCount = 1;
      }
      lastResult = res;
    }

    return {
      played: matches.length,
      lastResult,
      streakType,
      streakCount,
    };
  };

  const homeHist = getTeamHistory(homeTeam);
  const awayHist = getTeamHistory(awayTeam);

  // Deterministic seed from fixture properties to ensure every fixture has its own distinct phrasing
  const hash = String(fixture.id || fixture.roundNumber || fixture.scheduledTime || '')
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const roundLower = (fixture.roundName || '').toLowerCase();
  const isFinal = roundLower.includes('final') && !roundLower.includes('semi') && !roundLower.includes('quarter');
  const isSemi = roundLower.includes('semi');
  const isQuarter = roundLower.includes('quarter') || roundLower.includes('eliminator');

  // Next match strictly AFTER this fixture in chronological schedule
  const upcomingMatches = allEventFixtures.filter((f) => {
    if (f.id === fixture.id) return false;
    if (f.status !== 'scheduled' && f.status !== 'live') return false;
    return compareFixturesChronological(f, fixture) > 0;
  });
  upcomingMatches.sort(compareFixturesChronological);
  const nextMatch = upcomingMatches[0] || null;

  let message = '';

  if (type === 'post-match') {
    const hs = fixture.homeScore !== null ? Number(fixture.homeScore) : 0;
    const as = fixture.awayScore !== null ? Number(fixture.awayScore) : 0;
    const diff = Math.abs(hs - as);

    let dramaHeadline = '';
    let narrativeDetail = '';

    if (hs > as) {
      // Home team won
      if (isFinal) {
        dramaHeadline = `🏆 CHAMPIONS CROWNED! ${homeTeam.name} defeat ${awayTeam.name} ${hs}:${as} to conquer the tournament!`;
        narrativeDetail = `A historic victory etched into IIM Raipur sports legacy!`;
      } else if (isSemi) {
        dramaHeadline = `🔥 TICKET TO THE FINAL! ${homeTeam.name} triumph ${hs}:${as} over ${awayTeam.name}!`;
        narrativeDetail = `They advance to the Grand Finale after an unforgettable semifinal battle!`;
      } else if (isQuarter) {
        dramaHeadline = `⚡ SEMIFINAL BOUND! ${homeTeam.name} hold nerve for a gritty ${hs}:${as} win!`;
        narrativeDetail = `Knockout pressure conquered in style to punch their Final Four ticket.`;
      } else {
        // League match with dynamic streak context
        if (homeHist.played === 0) {
          dramaHeadline = `🔥 DREAM OPENER! ${homeTeam.name} kick off their tournament with a ${hs}:${as} victory!`;
          narrativeDetail = `First match on the pitch and an immediate statement with 3 points on the board.`;
        } else if (homeHist.streakType === 'W' && homeHist.streakCount >= 1) {
          dramaHeadline = `🔥 STREAK EXTENDED! ${homeTeam.name} power to a ${hs}:${as} win over ${awayTeam.name}!`;
          narrativeDetail = `Unstoppable momentum! That makes it ${homeHist.streakCount + 1} consecutive wins on the trot.`;
        } else if (homeHist.lastResult === 'L') {
          dramaHeadline = `⚡ RESILIENT COMEBACK! ${homeTeam.name} bounce back with a gritty ${hs}:${as} win!`;
          narrativeDetail = `After a setback in their previous match, they answered with sheer grit and heart today.`;
        } else if (diff <= 1) {
          const closePhrases = [
            `🔥 NAIL-BITING THRILLER! ${homeTeam.name} edge out ${awayTeam.name} ${hs}:${as}!`,
            `⚡ HEART-STOPPING FINISH! ${homeTeam.name} take a razor-thin ${hs}:${as} win!`,
          ];
          dramaHeadline = closePhrases[hash % closePhrases.length];
          narrativeDetail = `Down to the final second, they held their composure under intense pressure.`;
        } else {
          const domPhrases = [
            `🔥 COMMANDING DISPLAY! ${homeTeam.name} defeat ${awayTeam.name} ${hs}:${as}!`,
            `⚡ STATEMENT VICTORY! ${homeTeam.name} secure all 3 points with a ${hs}:${as} scoreline!`,
          ];
          dramaHeadline = domPhrases[hash % domPhrases.length];
          narrativeDetail = `Dominant rhythm from start to finish to boost their leaderboard standing.`;
        }
      }
    } else if (as > hs) {
      // Away team won
      if (isFinal) {
        dramaHeadline = `🏆 CHAMPIONS CROWNED! ${awayTeam.name} triumph ${as}:${hs} to lift the trophy!`;
        narrativeDetail = `A masterclass on the biggest stage to claim ultimate campus glory!`;
      } else if (isSemi) {
        dramaHeadline = `🔥 TICKET TO THE FINAL! ${awayTeam.name} topple ${homeTeam.name} ${as}:${hs}!`;
        narrativeDetail = `A high-voltage clash punches their ticket into the Championship Final!`;
      } else if (isQuarter) {
        dramaHeadline = `⚡ SEMIFINAL BOUND! ${awayTeam.name} seal a clutch ${as}:${hs} knockout win!`;
        narrativeDetail = `Steel nerves in elimination territory send them into the Final Four.`;
      } else {
        // League match with dynamic streak context
        if (awayHist.played === 0) {
          dramaHeadline = `🔥 SENSATIONAL OPENER! ${awayTeam.name} start their campaign with a ${as}:${hs} win!`;
          narrativeDetail = `First appearance of the tournament and an immediate statement on the table.`;
        } else if (awayHist.streakType === 'W' && awayHist.streakCount >= 1) {
          dramaHeadline = `🔥 STREAK EXTENDED! ${awayTeam.name} march on with a ${as}:${hs} win!`;
          narrativeDetail = `Sensational form! Now ${awayHist.streakCount + 1} matches unbeaten as they eye table summit.`;
        } else if (awayHist.lastResult === 'L') {
          dramaHeadline = `⚡ BOUNCE-BACK REDEMPTION! ${awayTeam.name} strike back with a ${as}:${hs} win!`;
          narrativeDetail = `Rebounding in emphatic style after their last defeat with pure determination.`;
        } else if (diff <= 1) {
          const closePhrases = [
            `🔥 BREATHTAKING FINISH! ${awayTeam.name} snatch a ${as}:${hs} victory!`,
            `⚡ NAIL-BITER TO THE END! ${awayTeam.name} conquer ${homeTeam.name} ${as}:${hs}!`,
          ];
          dramaHeadline = closePhrases[hash % closePhrases.length];
          narrativeDetail = `Nerves of steel down to the final whistle to take all points!`;
        } else {
          const domPhrases = [
            `🔥 CLINICAL MASTERCLASS! ${awayTeam.name} overpower ${homeTeam.name} ${as}:${hs}!`,
            `⚡ EMPHATIC STATEMENT! ${awayTeam.name} cruise to a ${as}:${hs} win!`,
          ];
          dramaHeadline = domPhrases[hash % domPhrases.length];
          narrativeDetail = `Flawless execution on the pitch to bag vital points for the standings.`;
        }
      }
    } else {
      // Draw
      if (homeHist.played === 0 && awayHist.played === 0) {
        dramaHeadline = `⚡ STALEMATE ON DEBUT! A thrilling contest finishes level at ${hs}:${as}!`;
        narrativeDetail = `Both teams open their tournament account with a hard-earned point on the board.`;
      } else {
        const drawPhrases = [
          `⚡ RELENTLESS DEADLOCK! ${homeTeam.name} and ${awayTeam.name} battle to a ${hs}:${as} draw!`,
          `🔥 PULSATING STALEMATE! An all-out contest finishes level at ${hs}:${as}!`,
        ];
        dramaHeadline = drawPhrases[hash % drawPhrases.length];
        narrativeDetail = `Neither titan gave an inch! Both sides share the spoils in a breathless encounter.`;
      }
    }

    const crowdLines = [
      `Electric atmosphere under the lights tonight! Big gratitude to the fans for non-stop cheers.`,
      `Incredible sportsmanship and deafening chants pitchside! Thanks to all who showed up.`,
      `Campus sports at its finest! Massive appreciation to the crowd for bringing the energy.`,
      `What a battle under floodlights! The race for the standings is heating up with every game.`,
    ];
    const crowdAppreciation = crowdLines[hash % crowdLines.length];

    let nextMatchLine = 'Next: Action wraps up for today. Rest up warriors!';
    if (nextMatch) {
      const nHome = nextMatch.homeTeamName || 'TBD';
      const nAway = nextMatch.awayTeamName || 'TBD';
      const nRound = nextMatch.roundName || 'Next Round';
      nextMatchLine = `👉 Up Next: ${nHome} vs ${nAway} at ${nextMatch.scheduledTime || 'TBD'} (${nextMatch.venueLocation || 'Ground'}). Be there!`;
    }

    message = `🏆 SPORTS CLUB IIM RAIPUR\nMATCH RESULT: ${event.name}\n\n⚽ ${homeTeam.name} ${hs} : ${as} ${awayTeam.name}\n${dramaHeadline}\n${narrativeDetail}\n\n${crowdAppreciation}\n\n📅 ${nextMatchLine}\n\nRegards,\nSports Club`;
  } else {
    // PRE-MATCH ANNOUNCEMENT
    const time = fixture.scheduledTime ? `${fixture.scheduledTime} hrs` : 'Today';
    const venue = fixture.venueLocation || event.venue || 'Sports Complex';

    let headerLine = '';
    let contextStory = '';

    if (isFinal) {
      headerLine = `🏆 THE GRAND FINALE IS HERE!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏟️ ${event.name} * Championship Final`;
      contextStory = `The ultimate pinnacle! Blood, sweat, and campus pride culminate tonight under floodlights. Only one squad lifts the coveted trophy!`;
    } else if (isSemi) {
      headerLine = `🔥 HIGH-VOLTAGE SEMIFINAL SHOWDOWN!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName}`;
      contextStory = `One win away from the Grand Final! Expect ferocious tackles, electric tempo, and nerves of pure steel.`;
    } else if (isQuarter) {
      headerLine = `⚡ DO-OR-DIE KNOCKOUT THRILLER!\nSPORTS CLUB IIM RAIPUR\n\n⚔️ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName}`;
      contextStory = `Win or pack up! Pure elimination intensity on the line tonight. Every pass carries tournament survival.`;
    } else {
      // League match headers rotating across matches
      const leagueHeaders = [
        `🔥 COLOSSAL MATCHDAY AT IIM RAIPUR!`,
        `⚡ HIGH-STAKES CLASH UNDER FLOODLIGHTS!`,
        `⚽ INTENSE TOURNAMENT ACTION TODAY!`,
        `🔥 BATTLE FOR TABLE SUPREMACY!`,
        `🏆 MATCHDAY SHOWDOWN AT IIM RAIPUR!`,
      ];
      headerLine = `${leagueHeaders[hash % leagueHeaders.length]}\nSPORTS CLUB IIM RAIPUR\n\n⚽ ${homeTeam.name} vs ${awayTeam.name}\n🏆 ${event.name} * ${fixture.roundName || 'League Match'}`;

      // Dynamic Narrative based strictly on prior completed matches before this fixture:
      if (homeHist.played === 0 && awayHist.played === 0) {
        // CASE 1: Both teams are playing their very first match of the tournament!
        const debutStories = [
          `Both squads make their tournament debut today! Zero matches behind them and everything to prove as their campaign kicks off.`,
          `Campaign opener for both contenders! High adrenaline and clean slates as they battle for an immediate statement win on day one.`,
          `Tournament debut for both sides! Fresh legs, fierce ambitions, and the entire campus watching to see who takes first blood.`,
        ];
        contextStory = debutStories[hash % debutStories.length];
      } else if (homeHist.played === 0 && awayHist.played > 0) {
        // CASE 2: Home is playing its first match, Away has played prior matches!
        if (awayHist.lastResult === 'W') {
          contextStory = `${homeTeam.name} kick off their campaign today against an in-form ${awayTeam.name} squad riding high on winning form!`;
        } else if (awayHist.lastResult === 'L') {
          contextStory = `${homeTeam.name} take the pitch for their tournament debut, while ${awayTeam.name} look to rebound after a tough previous match!`;
        } else {
          contextStory = `Tournament debut for ${homeTeam.name} as they face a battle-tested ${awayTeam.name} side in a high-intensity duel!`;
        }
      } else if (homeHist.played > 0 && awayHist.played === 0) {
        // CASE 3: Away is playing its first match, Home has played prior matches!
        if (homeHist.lastResult === 'W') {
          contextStory = `${homeTeam.name} enter carrying winning momentum, but debutants ${awayTeam.name} will be hungry to make an immediate impact!`;
        } else if (homeHist.lastResult === 'L') {
          contextStory = `${homeTeam.name} are determined to bounce back after a previous setback, while ${awayTeam.name} begin their campaign with fresh energy!`;
        } else {
          contextStory = `${homeTeam.name} look to build on their previous match as ${awayTeam.name} step onto the turf for their tournament debut!`;
        }
      } else {
        // CASE 4: Both teams have played prior matches before this fixture!
        if (homeHist.streakType === 'W' && homeHist.streakCount >= 2 && awayHist.streakType === 'W' && awayHist.streakCount >= 2) {
          contextStory = `Battle of the unbeatens! ${homeTeam.name} (${homeHist.streakCount} straight wins) clash with ${awayTeam.name} (${awayHist.streakCount} straight wins). Whose streak survives?`;
        } else if (homeHist.lastResult === 'W' && awayHist.lastResult === 'W') {
          const winWinStories = [
            `Both contenders enter on a high with winning momentum! Who keeps their victorious rhythm alive tonight?`,
            `Two in-form squads meet head-on. Expect maximum intensity with neither side willing to drop points.`,
          ];
          contextStory = winWinStories[hash % winWinStories.length];
        } else if (homeHist.lastResult === 'W' && awayHist.lastResult === 'L') {
          const winLossStories = [
            `${homeTeam.name} enter riding winning form, while ${awayTeam.name} are determined to bounce back stronger and claim redemption!`,
            `Can ${homeTeam.name} maintain their winning run, or will ${awayTeam.name} mount a fierce comeback?`,
          ];
          contextStory = winLossStories[hash % winLossStories.length];
        } else if (homeHist.lastResult === 'L' && awayHist.lastResult === 'W') {
          const lossWinStories = [
            `${awayTeam.name} arrive with winning momentum, but a hungry ${homeTeam.name} will fight tooth and nail for redemption!`,
            `Huge test of resilience: ${homeTeam.name} fight to get back in the win column against an in-form ${awayTeam.name}.`,
          ];
          contextStory = lossWinStories[hash % lossWinStories.length];
        } else if (homeHist.lastResult === 'L' && awayHist.lastResult === 'L') {
          const lossLossStories = [
            `Redemption is the only mission! Both teams are hungry to rebound with fury after previous setbacks.`,
            `A pivotal bounce-back duel! Neither squad can afford another slip on the points table.`,
          ];
          contextStory = lossLossStories[hash % lossLossStories.length];
        } else {
          const generalStories = [
            `Crucial league points and table position on the line! Every pass and challenge carries massive weight.`,
            `Tactical showdown awaits as both squads bring their absolute best to the turf for campus bragging rights.`,
            `The race for the playoffs intensifies with this heavyweight clash under the lights!`,
          ];
          contextStory = generalStories[hash % generalStories.length];
        }
      }
    }

    const hypeClosers = [
      `Pack the touchline, bring your batch banners, and scream your hearts out!`,
      `Ditch the dorms, fill the bleachers, and ignite the stadium with deafening chants!`,
      `The pitch is primed and floodlights are on. Rally your batch and turn up the volume!`,
      `Expect fierce tackles, electric pace, and unyielding drama right to the final whistle!`,
      `Bragging rights on the line. Make sure your batch chant echoes across campus!`,
      `Nothing beats campus sports under lights. Be there to fuel your squad to victory!`,
    ];
    const hypeCloser = hypeClosers[(hash + 2) % hypeClosers.length];

    message = `${headerLine}\n⏰ Match Time: ${time} | 📍 Venue: ${venue}\n\n${contextStory}\n\n${hypeCloser}\n\nRegards,\nSports Club`;
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

app.get('/api/storage-status', (req, res) => {
  res.json({
    connected: isMongoConnected,
    storageType: isMongoConnected ? 'mongodb_atlas' : 'local_file',
    message: isMongoConnected
      ? 'Connected to MongoDB Atlas 24/7 Cloud Database'
      : 'Using local temporary storage. Set MONGODB_URI on Render for 24/7 cloud sync.',
    eventsCount: memoryDb?.events?.length || 0,
    teamsCount: memoryDb?.teams?.length || 0,
    fixturesCount: memoryDb?.fixtures?.length || 0,
  });
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
