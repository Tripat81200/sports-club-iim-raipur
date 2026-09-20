# Sports Club IIM Raipur - Tournament OS

A responsive full-stack tournament management and audience engagement platform built for **Sports Club IIM Raipur**.

![Sports Club IIM Raipur](https://img.shields.io/badge/Sports_Club-IIM_Raipur-10b981?style=for-the-badge)
![React](https://img.shields.io/badge/React_18-Vite-3b82f6?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06b6d4?style=for-the-badge)
![Express](https://img.shields.io/badge/Express-Backend-f59e0b?style=for-the-badge)

---

## ⚡ Key Highlights

### 1. Dual Portal Interface
- **Public Viewer Portal (Fan Experience)**:
  - Live countdown ticker for the upcoming match + pulse badge for games in progress.
  - Interactive Points Table / Leaderboard with real-time recalculation, Form pills (`W`, `D`, `L`), goal difference, and qualification markers.
  - Fixtures & Results Feed with tabs (`Live / Today`, `Upcoming Matches`, `Completed`), round filters, search bar, and "Player of the Match" badges.
  - Team Squad Drawer/Modal displaying owners, co-owners, jersey numbers, roles, and captain badges.
- **Admin Management Portal (Committee Operations)**:
  - **Tournament Setup & Scoring Engine**: Configure sport category, venue, dates, and dynamic scoring rules (Win, Draw, Loss, Bonus threshold, Penalty points).
  - **Tournament Structure Selector**: Supports **Round Robin (League)**, **Knockout (Single Elimination)**, **League + Knockout Playoffs**, **Double Elimination**, and **Exhibition** tournaments.
  - **Roster & Team Management**:
    - Manual entry with dynamic capacity limits per sport.
    - Bulk Excel / CSV (.xlsx, .csv) batch importer with column auto-mapping and downloadable template.
    - Poster / Text OCR parser for quick copy-paste of squad rosters into editable cards.
  - **Automated Fixtures & Live Logger**: 1-Click bracket generation, pitch/court scheduler, and result logger with "Player of the Match" award modal.
  - **WhatsApp Broadcast Studio**:
    - Generates pre-match announcements and post-match results.
    - Automatically attaches next-match preview information.
    - **No em-dashes (`—`) or en-dashes (`–`)** for authentic human tone.
    - Length guarded (< 450 chars) to prevent WhatsApp's "Read More" button collapse.
    - Compulsory signature appended:
      ```
      Regards,
      Sports Club
      ```
    - 1-Click Copy and direct WhatsApp trigger link (`https://api.whatsapp.com/send?text=...`).

---

## 🚀 Quick Start

### Prerequisites
Node.js (v18+) is installed.

### Running the Platform

#### Single-Command Start (Production & API):
```bash
npm start
```
Access the application at: `http://localhost:3001`

#### Development Mode (Vite Hot-Reload):
In two terminals:
```bash
# Terminal 1: Backend API
npm run server

# Terminal 2: Vite Dev Frontend
npm run dev
```
Access Vite dev server at: `http://localhost:3000`

---

## 📁 Project Structure

```
.
├── server/
│   ├── index.js              # Express REST API & static web server
│   ├── algorithms.js         # Round Robin, Knockout, League+Playoffs, Double Elimination
│   └── data/
│       └── store.json        # Persistent JSON database with realistic IIM Raipur seed data
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── Header.tsx    # Branded top navigation and portal switcher
│   │   ├── public/
│   │   │   ├── PublicPortal.tsx
│   │   │   ├── HeroTicker.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── FixturesFeed.tsx
│   │   │   └── TeamRosterModal.tsx
│   │   └── admin/
│   │       ├── AdminPortal.tsx
│   │       ├── EventConfig.tsx
│   │       ├── RosterManager.tsx
│   │       ├── FixtureManager.tsx
│   │       └── BroadcastStudio.tsx
│   ├── services/
│   │   └── api.ts            # Frontend REST API client
│   ├── types/
│   │   └── index.ts          # TypeScript models
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 🏆 Scoring Engine Matrix
The points table dynamically recalculates ranks based on active tournament rules:
- **Football default**: Win = 3 pts, Draw = 1 pt, Loss = 0 pts (+1 bonus point for 3+ goal margin).
- **Cricket / Basketball default**: Win = 2 pts, Draw = 1 pt, Loss = 0 pts (+1 bonus point for margin).
- Changes made in the Admin Portal immediately reflect on the live fan leaderboard.

---

Regards,  
**Sports Club IIM Raipur**
