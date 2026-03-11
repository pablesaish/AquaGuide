# CLAUDE.md — INGRES AI Chatbot Project

## Project Overview

**Problem Statement ID:** 25066  
**Title:** Development of an AI-driven ChatBOT for INGRES as a Virtual Assistant  
**Organization:** Ministry of Jal Shakti (MoJS)  
**Department:** Central Ground Water Board (CGWB)  
**Category:** Software | **Theme:** Smart Automation

INGRES (India Ground Water Resource Estimation System) is a GIS-based web platform developed by CGWB and IIT Hyderabad. This project builds an AI-powered chatbot to help users query the vast groundwater database using natural language, replacing the current difficult manual search experience. The data specifically focuses on the FY 2024-25 assessments.

---

## Tech Stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Frontend   | React.js, Vite, Vanilla CSS                                             |
| Data       | Processed JSON (`summaryData.json`) generated via `convert.js` & `processData.js` from Excel |
| Auth & DB  | **Firebase Authentication** and **Firestore** (for Chat History persistence) |
| AI/Chatbot | **OpenAI API** (`gpt-4o-mini`) via direct API calls                     |
| Analytics  | `chart.js` & `react-chartjs-2` for dynamically generated LLM charts     |
| Markdown   | `react-markdown` & `rehype-raw` for rendering AI responses                |

---

## Data Architecture
We use a static pre-computed JSON approach to save bandwidth without needing a complex backend.
1. `CentralReport_2024-25.xlsx` contains the raw data.
2. `convert.js` translates the Excel sheet into an unformatted `reportData.json`.
3. `processData.js` cleans the headers, extracts exhaustive raw data on a per-district basis, calculates State & National summaries, and writes to `public/summaryData.json`.
4. The React application fetches `summaryData.json` locally and dynamically injects precise, intelligently filtered data contexts into the OpenAI prompt based on states/districts mentioned in the user's query.

---

## Design System

> All pages adhere to a strict dark-mode glassmorphism aesthetic.

### Color Palette

| Variable         | Value                        | Usage                        |
|------------------|------------------------------|------------------------------|
| `--bg`           | `#03100d`                    | Primary background           |
| `--bg2`          | `#061a14`                    | Section alt background       |
| `--surface`      | `#0a2318`                    | Cards, panels                |
| `--border`       | `#163d2e`                    | Borders, dividers            |
| `--accent`       | `#00e8a2`                    | Primary accent (green)       |
| `--text`         | `#ddf0e8`                    | Primary text                 |
| `--muted`        | `#5a8a77`                    | Secondary / placeholder text |

### Current Implemented Systems:
- Interactive Tooltips & Hover Effects on Charts (`scale(1.02)`)
- Custom CSS injected for `react-markdown` styling to ensure AI-generated tables and lists adhere to the brand UI.
- Scroll reveal animations and glassmorphic `.msg-bubble` elements.
- Fluid responsive sidebars.

---

## Authentication & Persistence System

We use Google Firebase for authentication and database management:
- **Firebase Auth:** Email/password login and registration (`Login.jsx`, `Register.jsx`).
- **Firestore DB:** We store continuous User Chat Sessions under the `chat_sessions` collection.
  - Collection: `chat_sessions`
  - Docs schema: `{ userId, title, messages: [{role, text, data, ts}], updatedAt }`
- **History View:** Users can view, switch between, and delete past synced sessions both in the Chatbot Sidebar and via a dedicated `History.jsx` page.

---

## Pages and Routing (`App.jsx`)

1. **`/` (Landing)** — Interactive hero, scroll animations, map preview, features grid.
2. **`/login` & `/register`** — Firebase Auth flow.
3. **`/dashboard`** — Post-login user dashboard dynamically displaying total National summaries from `summaryData.json`.
4. **`/chatbot`** — Context-aware AI Chatbot powered by OpenAI. Renders Markdown and interactive Chart.js graphs inside the chat bubble dynamically. Automatically persists to Firestore.
5. **`/history`** — Dedicated view for querying and rendering past selected UI sessions from Firestore.
6. **`/maps`** — Interactive map view using Leaflet.js visualizing groundwater extraction and categories across districts.

### Components
- **`Sidebar.jsx`** — Centralized reusable navigation sidebar used across `Dashboard`, `Chatbot`, `History`, and `Map` pages to ensure a consistent user experience.

---

## Environment Variables

The project utilizes `.env` files which are securely git-ignored to prevent leaking sensitive keys:
```env
VITE_OPENAI_API_KEY=your_openai_key
```

Variables must be prefixed with `VITE_` to be exposed to the Vite build system.

---

## Development Notes

- **To run the app:** `npm run dev`
- **To process new Excel data:** run `node convert.js` and then `node processData.js` to regenerate `public/summaryData.json`.
- The AI context dynamically limits payload size by only sending the state data (and corresponding nested districts) that match the user's prompt query. It falls back to National stats if no location is mentioned.
- We switched from Gemini to OpenAI `gpt-4o-mini` due to better formatting capabilities and JSON chart generation compatibility.