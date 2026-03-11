# CLAUDE.md — INGRES AI Chatbot Project

## Project Overview

**Problem Statement ID:** 25066  
**Title:** Development of an AI-driven ChatBOT for INGRES as a Virtual Assistant  
**Organization:** Ministry of Jal Shakti (MoJS)  
**Department:** Central Ground Water Board (CGWB)  
**Category:** Software | **Theme:** Smart Automation

INGRES (India Ground Water Resource Estimation System) is a GIS-based web platform developed by CGWB and IIT Hyderabad. This project builds an AI-powered chatbot to help users query the vast groundwater database using natural language, replacing the current difficult manual search experience.

---

## Architecture

```
project/
├── frontend/
│   ├── home/           # Landing page (see: Design System below)
│   ├── login/          # Auth pages (login, register, forgot password) — Firebase Auth
│   ├── dashboard/      # Post-login user dashboard
│   ├── chatbot/        # Main AI chatbot interface
│   ├── maps/           # India map visualization (Leaflet.js)
│   └── reports/        # Saved reports & chat history
│
├── backend/
│   ├── routes/         # API route definitions
│   ├── controllers/    # Business logic
│   ├── models/         # DB schemas
│   └── chatbot/        # AI query engine & NLP logic
│
└── database/           # Migrations, seeds, schema files
```

---

## Tech Stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Frontend   | HTML, CSS, Tailwind CSS, JavaScript (React)                             |
| Backend    | Node.js + Express **or** Python Flask                                   |
| Database   | MongoDB **or** MySQL                                                    |
| Auth       | **Firebase Authentication** (Email/Password + Google OAuth)             |
| AI/Chatbot | OpenAI API / LangChain / RAG with dataset                               |
| Maps       | Leaflet.js / Mapbox / Google Maps API                                   |
| Export     | PDF, CSV generation libraries                                           |

---

## Design System (from Landing Page)

> All pages must follow this design language for visual consistency.

### Color Palette

| Variable         | Value                        | Usage                        |
|------------------|------------------------------|------------------------------|
| `--bg`           | `#03100d`                    | Primary background           |
| `--bg2`          | `#061a14`                    | Section alt background       |
| `--surface`      | `#0a2318`                    | Cards, panels                |
| `--border`       | `#163d2e`                    | Borders, dividers            |
| `--accent`       | `#00e8a2`                    | Primary accent (green)       |
| `--accent2`      | `#00b87a`                    | Secondary accent             |
| `--accent-dim`   | `rgba(0,232,162,0.12)`       | Subtle accent backgrounds    |
| `--accent-glow`  | `rgba(0,232,162,0.25)`       | Glow / box-shadow tint       |
| `--warn`         | `#f5a623`                    | Critical status / warning    |
| `--danger`       | `#e84040`                    | Over-exploited / error       |
| `--semi`         | `#f0dc3a`                    | Semi-critical status         |
| `--text`         | `#ddf0e8`                    | Primary text                 |
| `--muted`        | `#5a8a77`                    | Secondary / placeholder text |

### Typography

| Role         | Font                         | Import |
|--------------|------------------------------|--------|
| Display/Hero | `Playfair Display` (serif)   | Google Fonts |
| Body         | `DM Sans` (sans-serif)       | Google Fonts |
| Mono/Code    | `DM Mono` (monospace)        | Google Fonts |

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Groundwater Status Colors

| Status        | Color     | Hex       |
|---------------|-----------|-----------|
| Safe          | 🟢 Green  | `#00e8a2` |
| Semi-Critical | 🟡 Yellow | `#f0dc3a` |
| Critical      | 🟠 Orange | `#f5a623` |
| Over-Exploited| 🔴 Red    | `#e84040` |

### Component Patterns

- **Buttons:** Rounded (`border-radius: 8–12px`), accent fill or ghost outline. Hover: `translateY(-2px)` + glow box-shadow. Active: ripple effect via `::after` pseudo.
- **Cards:** `background: var(--surface)`, `border: 1px solid var(--border)`. Hover: border brightens to `rgba(0,232,162,0.35)`, card lifts `translateY(-6px)`, shimmer sweep `::before`.
- **Inputs:** Semi-transparent dark fill, `border: 1px solid var(--border)`. Focus: border → `rgba(0,232,162,0.3)`.
- **Badges/Tags:** `background: var(--accent-dim)`, `border: 1px solid rgba(0,232,162,0.25)`, uppercase, `font-family: var(--font-mono)`.
- **Nav:** Fixed top, transparent → frosted glass (`rgba(3,16,13,0.92)` + `backdrop-filter: blur(20px)`) on scroll. Nav links have underline-sweep hover animation.

### Animations & Interactions

- **Scroll reveal:** `.reveal` (fade up), `.reveal-left`, `.reveal-right`, `.reveal-scale` — triggered via `IntersectionObserver` at `threshold: 0.1`.
- **Stagger children:** `.stagger` parent triggers child animations with `0.08s` delay increments.
- **Scroll progress bar:** Fixed 2px top bar (`#scroll-bar`), accent gradient, updates width on scroll.
- **Parallax:** Hero glow blobs drift at `scrollY * 0.25` / `scrollY * 0.15`.
- **Typewriter:** Rotating example queries in hero, type + delete loop.
- **Particle canvas:** Floating dots with connecting lines in hero background.
- **Mouse spotlight:** Radial gradient follows cursor in hero section.
- **CountUp:** Animated number counters triggered when stat section enters viewport.
- **Marquee ticker:** Infinite horizontal scroll of status/state keywords below hero.
- **Bar grow:** Chart bars animate width from 0 on mount (`animation: bar-grow`).
- **Floating ring:** Slow-spinning orbital ring in hero (`animation: spin-slow 40s linear infinite`).

### Scrollbar

```css
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--accent2); border-radius: 2px; }
```

---

## Authentication — Firebase

> Replace all previous JWT + bcrypt local auth with **Firebase Authentication**.

### Setup

```bash
npm install firebase
```

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### Auth Methods

| Method                  | Firebase Function                             |
|-------------------------|-----------------------------------------------|
| Register (email/pass)   | `createUserWithEmailAndPassword(auth, email, password)` |
| Login (email/pass)      | `signInWithEmailAndPassword(auth, email, password)`     |
| Google OAuth            | `signInWithPopup(auth, new GoogleAuthProvider())`       |
| Logout                  | `signOut(auth)`                                         |
| Forgot Password         | `sendPasswordResetEmail(auth, email)`                   |
| Auth state listener     | `onAuthStateChanged(auth, callback)`                    |

### Session Management

- Use `onAuthStateChanged` in a top-level `AuthContext` provider to persist login state across page refreshes.
- Store additional user profile data (state, occupation) in **Firestore** under `users/{uid}` after registration — Firebase Auth only stores `email`, `displayName`, `photoURL`.
- Use the Firebase ID token (`user.getIdToken()`) for authenticating backend API calls if needed.

### Protected Routes

Wrap all post-login pages (Dashboard, Chatbot, Maps, Reports) with an `<AuthGuard>` component that redirects to `/login` if `auth.currentUser` is null.

```jsx
// components/AuthGuard.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

export default function AuthGuard({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) navigate("/login");
    });
    return unsub;
  }, []);
  return children;
}
```

---

## Core Modules

### 1. User System
- Register / Login / Forgot Password — **Firebase Auth**
- Google OAuth via Firebase `GoogleAuthProvider`
- Extended profile (state, occupation) stored in Firestore `users/{uid}`
- Auth state managed via `onAuthStateChanged` context

### 2. AI Chatbot System
- Natural language query → database query conversion
- Data retrieval from groundwater dataset
- Answer generation with structured output
- Follow-up question support
- Optional: multilingual (English, Hindi, Marathi via Google Translate API)
- Optional: voice input via Web Speech API

### 3. Groundwater Data System
- Filter by state / district / block / status category
- Categories: **Safe** | **Semi-Critical** | **Critical** | **Over-Exploited**
- Display: tables, charts, color-coded maps
- Data fields: `state`, `district`, `block`, `category`, `recharge`, `extraction`, `stage_of_extraction`, `year`

### 4. Admin Dashboard
- Upload/update groundwater datasets
- Manage users
- View chatbot usage analytics
- Update AI knowledge base

---

## Database Schema

### Firestore: `users/{uid}`
| Field        | Type      |
|--------------|-----------|
| uid          | string (doc ID) |
| name         | string    |
| email        | string    |
| state        | string    |
| occupation   | string    |
| created_at   | timestamp |

### `ChatHistory` (MongoDB / MySQL)
| Column     | Type      |
|------------|-----------|
| id         | PK        |
| user_id    | string (Firebase UID) |
| question   | text      |
| answer     | text      |
| timestamp  | timestamp |

### `GroundwaterData`
| Column               | Type   |
|----------------------|--------|
| id                   | PK     |
| state                | string |
| district             | string |
| block                | string |
| category             | enum   |
| recharge             | float  |
| extraction           | float  |
| stage_of_extraction  | float  |
| year                 | int    |

### `SavedReports`
| Column     | Type      |
|------------|-----------|
| id         | PK        |
| user_id    | string (Firebase UID) |
| title      | string    |
| data       | json/text |
| created_at | timestamp |

---

## Pages to Build

| # | Page                      | Key Features                                                                         |
|---|---------------------------|--------------------------------------------------------------------------------------|
| 1 | Landing / Home            | Hero + particle canvas + typewriter, chat preview, map preview, features grid, CTA   |
| 2 | Login                     | Firebase email/pass + Google OAuth, forgot password — match dark design system       |
| 3 | Register                  | Name, email, password, state, occupation — saves to Firestore on success             |
| 4 | Dashboard                 | Welcome, chatbot panel, recent searches, saved reports, GW stats widgets             |
| 5 | AI Chatbot *(main)*       | Chat UI, message bubbles, typing animation, timestamps, save chat                    |
| 6 | Groundwater Data Explorer | Filter by state/district/block/category; table + chart views                         |
| 7 | Map Visualization         | India map, color-coded blocks (Green/Yellow/Orange/Red)                              |
| 8 | Chat History              | View, delete, download past conversations                                            |
| 9 | Saved Reports             | Export as PDF or CSV                                                                 |
| 10| Admin Panel *(optional)*  | Dataset upload, user management, analytics                                           |

---

## Landing Page Sections (implemented)

1. **Scroll progress bar** — fixed 2px top gradient bar
2. **Nav** — logo + links + Login/Get Started CTAs; frosts on scroll
3. **Hero** — particle canvas, mouse spotlight, parallax glow blobs, orbiting ring, typewriter, CountUp stats
4. **Ticker** — marquee of state/status keywords
5. **Chat Preview** — split layout: copy left, live chat UI right with embedded mini chart and data cards
6. **Map** — dot-based India overview, status legend, hover tooltips, national summary progress bars, quick query chips
7. **Features Grid** — 3×2 card grid with shimmer hover and emoji icons
8. **CTA** — centered radial glow, two action buttons, partner logos
9. **Footer** — logo, copyright, nav links

---

## Chatbot Capabilities

1. **Natural Language Query** — parse user intent from plain English
2. **Data Retrieval** — fetch matching rows from groundwater DB
3. **Answer Generation** — produce readable, structured responses
4. **Data Visualization** — return embedded charts, tables, map highlights
5. **Follow-up Questions** — maintain conversational context
6. **Multilingual** *(optional)* — English, Hindi, Marathi

### Example Queries
```
"Groundwater status in Maharashtra"
"Which districts in Gujarat are over-exploited?"
"Compare groundwater extraction in Pune 2020 vs 2023"
"Show all critical zones in India"
"Summarize groundwater status of Rajasthan"
```

---

## User Flow

```
Open website (Landing Page)
  → Register / Login (Firebase Auth)
    → Dashboard
      → Open Chatbot
        → Ask question (natural language)
          → AI fetches groundwater data
            → Response shown (text + chart/map)
              → Chat saved to history
                → User can save/export as report
```

---

## Advanced Features (Hackathon Differentiators)

- **AI Data Summary** — "Summarize groundwater status of India" → full generated report
- **Voice Input** — Web Speech API for hands-free querying
- **Smart Autocomplete** — suggestions as user types (e.g. "Groundwater status of...")
- **Offline Data Cache** — service worker for rural low-connectivity use
- **Trend Analysis** — year-over-year groundwater extraction comparison charts

---

## Environment Variables

```env
# Backend
PORT=5000
DB_URI=your_database_uri

# AI
OPENAI_API_KEY=your_openai_key

# Maps
MAPS_API_KEY=your_maps_key

# Firebase (Frontend)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Translation (optional)
GOOGLE_TRANSLATE_API_KEY=your_translate_key
```

---

## Development Notes

- All pages must use the Design System defined above — same fonts, colors, and animation patterns as the landing page.
- Always validate groundwater category values against: `Safe | Semi-Critical | Critical | Over-Exploited`
- The `stage_of_extraction` field is the primary indicator used by CGWB for categorization.
- All chatbot queries must degrade gracefully if no data is found (return a helpful "no data" message).
- Map data should lazy-load by state to avoid performance issues with the full India dataset.
- Chat history is user-scoped — use Firebase UID as the identifier; never expose one user's history to another.
- Admin routes must be protected by a separate `isAdmin` check (custom claim in Firebase or a Firestore `role` field).
- JWT secret is no longer needed — Firebase handles token issuance. If backend needs to verify the user, validate the Firebase ID token using the Firebase Admin SDK.

---

## Reference

- INGRES Portal: https://ingres.iith.ac.in/home
- Data Source: Central Ground Water Board (CGWB) annual assessment reports
- Assessment Units: Block / Mandal / Taluk level across all Indian states/UTs
- Firebase Docs: https://firebase.google.com/docs/auth/web/start