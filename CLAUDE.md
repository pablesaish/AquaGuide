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
│   ├── home/           # Landing page
│   ├── login/          # Auth pages (login, register, forgot password)
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

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | HTML, CSS, Tailwind CSS, JavaScript (React opt) |
| Backend    | Node.js + Express **or** Python Flask           |
| Database   | MongoDB **or** MySQL                            |
| AI/Chatbot | OpenAI API / LangChain / RAG with dataset       |
| Maps       | Leaflet.js / Mapbox / Google Maps API           |
| Auth       | JWT + bcrypt; Google OAuth (optional)           |
| Export     | PDF, CSV generation libraries                   |

---

## Core Modules

### 1. User System
- Register / Login / Forgot Password
- JWT-based session management
- Optional: Google OAuth
- User fields: `name`, `email`, `password`, `state`, `occupation`

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

### `Users`
| Column       | Type      |
|--------------|-----------|
| id           | PK        |
| name         | string    |
| email        | string    |
| password     | string    |
| state        | string    |
| occupation   | string    |
| created_at   | timestamp |

### `ChatHistory`
| Column     | Type      |
|------------|-----------|
| id         | PK        |
| user_id    | FK        |
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
| user_id    | FK        |
| title      | string    |
| data       | json/text |
| created_at | timestamp |

---

## Pages to Build

| # | Page                    | Key Features                                                              |
|---|-------------------------|---------------------------------------------------------------------------|
| 1 | Landing / Home          | Hero, problem statement, chatbot preview, sample questions, login button  |
| 2 | Login                   | Email+password, Google OAuth (opt), forgot password                       |
| 3 | Register                | Name, email, password, state, occupation                                  |
| 4 | Dashboard               | Welcome, chatbot panel, recent searches, saved reports, GW stats widgets  |
| 5 | AI Chatbot *(main)*     | Chat UI, message bubbles, typing animation, timestamps, save chat         |
| 6 | Groundwater Data Explorer | Filter by state/district/block/category; table + chart views             |
| 7 | Map Visualization       | India map, color-coded blocks (Green/Yellow/Orange/Red)                   |
| 8 | Chat History            | View, delete, download past conversations                                 |
| 9 | Saved Reports           | Export as PDF or CSV                                                      |
| 10| Admin Panel *(optional)*| Dataset upload, user management, analytics                                |

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

## Map Color Coding

| Color  | Status        |
|--------|---------------|
| 🟢 Green  | Safe          |
| 🟡 Yellow | Semi-Critical |
| 🟠 Orange | Critical      |
| 🔴 Red    | Over-Exploited|

---

## User Flow

```
Open website
  → Register / Login
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
JWT_SECRET=your_jwt_secret

# AI
OPENAI_API_KEY=your_openai_key

# Maps
MAPS_API_KEY=your_maps_key

# Auth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Translation (optional)
GOOGLE_TRANSLATE_API_KEY=your_translate_key
```

---

## Development Notes

- Always validate groundwater category values against: `Safe | Semi-Critical | Critical | Over-Exploited`
- The `stage_of_extraction` field is the primary indicator used by CGWB for categorization
- All chatbot queries must degrade gracefully if no data is found (return a helpful "no data" message)
- Map data should lazy-load by state to avoid performance issues with the full India dataset
- Chat history is user-scoped — never expose one user's history to another
- Admin routes must be protected by a separate `isAdmin` middleware check

---

## Reference

- INGRES Portal: https://ingres.iith.ac.in/home  
- Data Source: Central Ground Water Board (CGWB) annual assessment reports  
- Assessment Units: Block / Mandal / Taluk level across all Indian states/UTs