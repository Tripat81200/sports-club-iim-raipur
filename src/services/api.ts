import {
  TournamentEvent,
  Team,
  Fixture,
  StandingsResponse,
  BroadcastPreview,
  TournamentFormat,
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Events
  async getEvents(): Promise<TournamentEvent[]> {
    const res = await fetch(`${BASE_URL}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async createEvent(event: Partial<TournamentEvent>): Promise<TournamentEvent> {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async updateEvent(id: string, event: Partial<TournamentEvent>): Promise<TournamentEvent> {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  // Teams
  async getTeams(eventId?: string): Promise<Team[]> {
    const url = eventId ? `${BASE_URL}/teams?eventId=${eventId}` : `${BASE_URL}/teams`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const res = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team),
    });
    if (!res.ok) throw new Error('Failed to create team');
    return res.json();
  },

  async bulkCreateTeams(eventId: string, teams: Partial<Team>[]): Promise<{ count: number; teams: Team[] }> {
    const res = await fetch(`${BASE_URL}/teams/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, teams }),
    });
    if (!res.ok) throw new Error('Failed to bulk create teams');
    return res.json();
  },

  async updateTeam(id: string, team: Partial<Team>): Promise<Team> {
    const res = await fetch(`${BASE_URL}/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team),
    });
    if (!res.ok) throw new Error('Failed to update team');
    return res.json();
  },

  async deleteTeam(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/teams/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete team');
  },

  // Fixtures
  async getFixtures(eventId?: string): Promise<Fixture[]> {
    const url = eventId ? `${BASE_URL}/fixtures?eventId=${eventId}` : `${BASE_URL}/fixtures`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch fixtures');
    return res.json();
  },

  async createFixture(fixture: Partial<Fixture>): Promise<Fixture> {
    const res = await fetch(`${BASE_URL}/fixtures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture),
    });
    if (!res.ok) throw new Error('Failed to create fixture');
    return res.json();
  },

  async generateFixtures(eventId: string, format?: TournamentFormat): Promise<{ count: number; fixtures: Fixture[] }> {
    const res = await fetch(`${BASE_URL}/fixtures/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, format }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate fixtures');
    }
    return res.json();
  },

  async updateFixture(id: string, fixture: Partial<Fixture>): Promise<Fixture> {
    const res = await fetch(`${BASE_URL}/fixtures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture),
    });
    if (!res.ok) throw new Error('Failed to update fixture');
    return res.json();
  },

  async deleteFixture(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/fixtures/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete fixture');
  },

  // Standings
  async getStandings(eventId: string): Promise<StandingsResponse> {
    const res = await fetch(`${BASE_URL}/standings/${eventId}`);
    if (!res.ok) throw new Error('Failed to fetch standings');
    return res.json();
  },

  // Broadcasts
  async getBroadcast(
    type: 'pre-match' | 'post-match',
    fixtureId: string,
    style: string = 'hype'
  ): Promise<BroadcastPreview> {
    const res = await fetch(`${BASE_URL}/broadcasts/${type}/${fixtureId}?style=${style}`);
    if (!res.ok) throw new Error('Failed to fetch broadcast');
    return res.json();
  },

  // Admin Security
  async verifyAdminPin(pin: string): Promise<{ success: boolean; token?: string }> {
    const res = await fetch(`${BASE_URL}/admin/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Incorrect PIN');
    }
    return res.json();
  },

  async updateAdminPin(currentPin: string, newPin: string): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/admin/update-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update PIN');
    }
    return res.json();
  },

  // OCR helper
  async parseRosterText(rawText: string): Promise<{ teamName: string; owner: string; coOwner: string; contactNumber?: string; players: any[] }> {
    const res = await fetch(`${BASE_URL}/ocr/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });
    if (!res.ok) throw new Error('Failed to parse roster text');
    return res.json();
  },

  // State Sync & Backup
  async exportState(): Promise<{ exportedAt: string; data: { events: any[]; teams: any[]; fixtures: any[] } }> {
    const res = await fetch(`${BASE_URL}/export-state`);
    if (!res.ok) throw new Error('Failed to export state');
    return res.json();
  },

  async syncState(state: { events: any[]; teams: any[]; fixtures: any[] }): Promise<{ success: boolean; syncedAt: string }> {
    const res = await fetch(`${BASE_URL}/sync-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error('Failed to sync tournament state');
    return res.json();
  },

  async getStorageStatus(): Promise<{
    connected: boolean;
    storageType: 'mongodb_atlas' | 'local_file';
    message: string;
    eventsCount: number;
    teamsCount: number;
    fixturesCount: number;
  }> {
    const res = await fetch(`${BASE_URL}/storage-status`);
    if (!res.ok) throw new Error('Failed to fetch storage status');
    return res.json();
  },
};
