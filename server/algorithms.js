// Tournament Fixture Generation Algorithms
// Supports: Round Robin (League), Knockout (Single Elimination), League + Playoffs, Double Elimination, Custom

/**
 * Generates Round Robin fixtures using standard circle polygon rotation.
 */
export function generateRoundRobin(teams, eventId, options = {}) {
  const teamList = [...teams];
  const hasBye = teamList.length % 2 !== 0;
  if (hasBye) {
    teamList.push({ id: '__BYE__', name: 'BYE' });
  }

  const numTeams = teamList.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const fixtures = [];

  let matchIndex = 1;
  const baseDate = options.startDate ? new Date(options.startDate) : new Date();

  for (let round = 0; round < numRounds; round++) {
    const roundDate = new Date(baseDate);
    roundDate.setDate(roundDate.getDate() + round);
    const dateStr = roundDate.toISOString().split('T')[0];

    for (let match = 0; match < matchesPerRound; match++) {
      const homeIdx = (round + match) % (numTeams - 1);
      let awayIdx = (numTeams - 1 - match + round) % (numTeams - 1);

      if (match === 0) {
        awayIdx = numTeams - 1;
      }

      const home = teamList[homeIdx];
      const away = teamList[awayIdx];

      // Skip match if one of the teams is a BYE
      if (home.id === '__BYE__' || away.id === '__BYE__') {
        continue;
      }

      // Alternate home and away to balance venues
      const isHome = (round + match) % 2 === 0;
      const homeTeam = isHome ? home : away;
      const awayTeam = isHome ? away : home;

      const timeSlot = match === 0 ? '16:00' : match === 1 ? '17:30' : '19:00';
      const court = match % 2 === 0 ? 'Main Sports Complex - Ground A' : 'Main Sports Complex - Ground B';

      fixtures.push({
        id: `fix_${Date.now()}_${matchIndex++}`,
        eventId,
        roundNumber: round + 1,
        roundName: `Round ${round + 1}`,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        scheduledDate: dateStr,
        scheduledTime: timeSlot,
        venueLocation: court,
        status: 'scheduled',
        homeScore: null,
        awayScore: null,
        playerOfTheMatch: null,
        notes: '',
      });
    }
  }

  return fixtures;
}

/**
 * Generates Knockout (Single Elimination) bracket tree.
 */
export function generateKnockout(teams, eventId, options = {}) {
  const teamList = [...teams];
  const count = teamList.length;
  if (count < 2) return [];

  // Next power of 2
  let power = 2;
  while (power < count) {
    power *= 2;
  }

  const fixtures = [];
  let matchIndex = 1;
  const baseDate = options.startDate ? new Date(options.startDate) : new Date();

  // Determine round labels
  function getRoundName(roundTeamsLeft) {
    if (roundTeamsLeft === 2) return 'Grand Final';
    if (roundTeamsLeft === 4) return 'Semifinals';
    if (roundTeamsLeft === 8) return 'Quarterfinals';
    return `Round of ${roundTeamsLeft}`;
  }

  // Round 1 matches
  const round1Matches = power / 2;
  const roundDate = new Date(baseDate).toISOString().split('T')[0];

  for (let i = 0; i < round1Matches; i++) {
    const home = teamList[i] || null;
    const away = teamList[power - 1 - i] || null;

    if (!home && !away) continue;

    fixtures.push({
      id: `fix_${Date.now()}_${matchIndex++}`,
      eventId,
      roundNumber: 1,
      roundName: getRoundName(power),
      homeTeamId: home ? home.id : 'TBD',
      awayTeamId: away ? away.id : 'TBD',
      homeTeamName: home ? home.name : 'TBD',
      awayTeamName: away ? away.name : 'TBD',
      scheduledDate: roundDate,
      scheduledTime: `${16 + (i % 3)}:00`,
      venueLocation: `Court ${1 + (i % 2)}`,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: '',
    });
  }

  // Generate subsequent knockout rounds (Semifinals, Finals placeholders)
  let remaining = power / 2;
  let currentRoundNum = 2;

  while (remaining >= 2) {
    const nextMatches = remaining / 2;
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + currentRoundNum);
    const dateStr = nextDate.toISOString().split('T')[0];

    for (let m = 0; m < nextMatches; m++) {
      fixtures.push({
        id: `fix_${Date.now()}_${matchIndex++}`,
        eventId,
        roundNumber: currentRoundNum,
        roundName: getRoundName(remaining),
        homeTeamId: 'TBD',
        awayTeamId: 'TBD',
        homeTeamName: `Winner Match ${m * 2 + 1}`,
        awayTeamName: `Winner Match ${m * 2 + 2}`,
        scheduledDate: dateStr,
        scheduledTime: '18:00',
        venueLocation: 'Main Stadium Court',
        status: 'scheduled',
        homeScore: null,
        awayScore: null,
        playerOfTheMatch: null,
        notes: '',
      });
    }

    remaining = nextMatches;
    currentRoundNum++;
  }

  return fixtures;
}

/**
 * Generates League + Knockout Playoffs (Round Robin group stage + Semis & Final).
 */
export function generateLeagueWithPlayoffs(teams, eventId, options = {}) {
  // 1. Generate regular round-robin league matches
  const leagueFixtures = generateRoundRobin(teams, eventId, options);
  const maxRound = leagueFixtures.reduce((max, f) => Math.max(max, f.roundNumber), 0);

  const baseDate = options.startDate ? new Date(options.startDate) : new Date();
  const semiDate = new Date(baseDate);
  semiDate.setDate(semiDate.getDate() + maxRound + 1);
  const finalDate = new Date(baseDate);
  finalDate.setDate(finalDate.getDate() + maxRound + 2);

  const playoffFixtures = [
    {
      id: `fix_${Date.now()}_sf1`,
      eventId,
      roundNumber: maxRound + 1,
      roundName: 'Semifinal 1',
      homeTeamId: 'TBD',
      awayTeamId: 'TBD',
      homeTeamName: 'Table Rank 1',
      awayTeamName: 'Table Rank 4',
      scheduledDate: semiDate.toISOString().split('T')[0],
      scheduledTime: '17:00',
      venueLocation: 'Main Sports Complex - Ground A',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: 'Top 4 Playoff',
    },
    {
      id: `fix_${Date.now()}_sf2`,
      eventId,
      roundNumber: maxRound + 1,
      roundName: 'Semifinal 2',
      homeTeamId: 'TBD',
      awayTeamId: 'TBD',
      homeTeamName: 'Table Rank 2',
      awayTeamName: 'Table Rank 3',
      scheduledDate: semiDate.toISOString().split('T')[0],
      scheduledTime: '19:00',
      venueLocation: 'Main Sports Complex - Ground A',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: 'Top 4 Playoff',
    },
    {
      id: `fix_${Date.now()}_final`,
      eventId,
      roundNumber: maxRound + 2,
      roundName: 'Grand Final',
      homeTeamId: 'TBD',
      awayTeamId: 'TBD',
      homeTeamName: 'Winner SF 1',
      awayTeamName: 'Winner SF 2',
      scheduledDate: finalDate.toISOString().split('T')[0],
      scheduledTime: '18:30',
      venueLocation: 'IIM Raipur Main Stadium Arena',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: 'Championship Match',
    },
  ];

  return [...leagueFixtures, ...playoffFixtures];
}

/**
 * Generates Double Elimination tournament structure.
 */
export function generateDoubleElimination(teams, eventId, options = {}) {
  const upperFixtures = generateKnockout(teams, eventId, options).map(f => ({
    ...f,
    roundName: `Upper Bracket: ${f.roundName}`,
  }));

  const baseDate = options.startDate ? new Date(options.startDate) : new Date();
  const maxRound = upperFixtures.reduce((max, f) => Math.max(max, f.roundNumber), 0);

  const lowerFixtures = [
    {
      id: `fix_${Date.now()}_lb1`,
      eventId,
      roundNumber: maxRound + 1,
      roundName: 'Lower Bracket: Eliminator',
      homeTeamId: 'TBD',
      awayTeamId: 'TBD',
      homeTeamName: 'Lower Bracket Seed A',
      awayTeamName: 'Lower Bracket Seed B',
      scheduledDate: new Date(baseDate.getTime() + (maxRound + 1) * 86400000).toISOString().split('T')[0],
      scheduledTime: '17:00',
      venueLocation: 'Main Sports Complex - Ground B',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: 'Double Elimination Elimination Match',
    },
    {
      id: `fix_${Date.now()}_gf`,
      eventId,
      roundNumber: maxRound + 2,
      roundName: 'Championship Grand Final',
      homeTeamId: 'TBD',
      awayTeamId: 'TBD',
      homeTeamName: 'Winner Upper Bracket',
      awayTeamName: 'Winner Lower Bracket',
      scheduledDate: new Date(baseDate.getTime() + (maxRound + 2) * 86400000).toISOString().split('T')[0],
      scheduledTime: '18:30',
      venueLocation: 'IIM Raipur Main Stadium Arena',
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      playerOfTheMatch: null,
      notes: 'Championship Title Decider',
    }
  ];

  return [...upperFixtures, ...lowerFixtures];
}
