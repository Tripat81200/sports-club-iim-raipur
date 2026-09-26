export interface ScoringRules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  bonusThreshold: number;
  bonusPoints: number;
  penaltyPoints: number;
}

export interface TeamCapacity {
  min: number;
  max: number;
}

export type TournamentFormat = 'round_robin' | 'knockout' | 'league_playoffs' | 'double_elimination' | 'exhibition';

export interface TournamentEvent {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
  venue: string;
  format: TournamentFormat;
  scoringRules: ScoringRules;
  teamCapacity: TeamCapacity;
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  role: string;
  isCaptain?: boolean;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  shortCode?: string;
  color?: string;
  logoUrl?: string;
  owner: string;
  coOwner: string;
  contactNumber?: string;
  players: Player[];
}

export interface PlayerOfTheMatch {
  playerId: string;
  playerName: string;
  teamId: string;
  performance?: string;
}

export interface MatchPlayerStat {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName?: string;
  // Sport-specific performance stats (all optional)
  goals?: number;      // Football
  assists?: number;    // Football / Basketball
  runs?: number;       // Cricket
  wickets?: number;    // Cricket
  overs?: number;      // Cricket
  baskets?: number;    // Basketball (or points)
  rebounds?: number;   // Basketball
  points?: number;     // Badminton / TT / Volleyball / General
}

export interface Fixture {
  id: string;
  eventId: string;
  roundNumber: number;
  roundName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledDate: string;
  scheduledTime: string;
  venueLocation: string;
  status: 'scheduled' | 'live' | 'completed';
  homeScore: number | null;
  awayScore: number | null;
  playerOfTheMatch: PlayerOfTheMatch | null;
  playerStats?: MatchPlayerStat[];
  notes?: string;
}

export interface StandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  shortCode?: string;
  color?: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  bonusPoints: number;
  penaltyPoints: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  recentForm: ('W' | 'D' | 'L')[];
}

export interface StandingsResponse {
  eventId: string;
  eventName: string;
  scoringRules: ScoringRules;
  standings: StandingsRow[];
}

export interface BroadcastPreview {
  type: 'pre-match' | 'post-match';
  fixtureId: string;
  message: string;
  charCount: number;
  whatsappUrl: string;
}
