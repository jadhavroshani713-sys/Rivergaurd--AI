# 🌊 RiverGuard AI — Community River Cleanliness & Monitoring Platform

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Multimodal%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2.13-22B5BF?style=for-the-badge)](https://recharts.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **RiverGuard AI** is a modern, community-powered environmental platform designed to monitor, report, and restore river ecosystems. Powered by **Google Gemini Multimodal AI**, it enables citizens, NGOs, sanitation field workers, and municipal authorities to collaborate on cleaning waterways with automated pollution detection, transparent priority ranking, and verified restoration drives.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Role-Based Access](#-role-based-access)
- [AI Engine & Image Verification](#-ai-engine--image-verification)
- [Scoring & Priority Engine](#-scoring--priority-engine)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Deployment Guide](#-deployment-guide)
  - [Deploying on Vercel](#deploying-on-vercel-recommended)
  - [Integrating with Streamlit](#integrating-with-streamlit-python)
- [Demo Credentials](#-demo-credentials)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Key Features

### 📸 1. AI-Powered Visual Pollution Inspection
- **Multimodal Image Analysis**: Upload riverbank photos; Google Gemini detects waste types, assesses environmental damage, and estimates cleanup difficulty.
- **Auto-Categorization**: Classifies pollution into 9 distinct categories:
  - *Plastic Waste*, *Industrial Waste*, *Sewage*, *Solid Waste*, *Oil/Chemical Spills*, *Construction Debris*, *Algal Blooms*, *Dead Fauna*, and *Other*.
- **Offline Ecological Fallback**: If an API key is not configured or network is unavailable, an environmental rule engine provides intelligent local analysis so operations never stop.

### 🔍 2. AI Before & After Cleanup Verification
- Volunteers and sanitation workers submit "After" photos upon completing cleanups.
- Gemini evaluates the comparison with high scrutiny to verify debris eradication before marking the case `CLOSED` and awarding volunteer credit.

### 📊 3. Real-Time River Health Index & Priority Matrix
- **Basin Cleanliness Score (0-100)**: Real-time aggregated health index penalized by unresolved high-severity hazards and boosted by successful cleanups.
- **Multi-Factor Priority Scoring**: Weights severity (0-50), environmental threat (0-30), community upvotes (0-20), report age, and geographic clustering.

### 🗺️ 4. Interactive Geolocation & Hotspot Mapping
- Interactive pinpoints of pollution reports tagged with precise GPS coordinates.
- Filters by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and cleanup status.

### 🤝 5. Community Cleanup Drives & Task Coordination
- Organize volunteer drives, schedule dates, assign gear checklists (gloves, nets, disposal bags), and delegate operational zones.
- Real-time volunteer RSVP and attendance logging.

### 🏆 6. Gamification & Community Leaderboard
- Earn **Community Points** for reporting issues, confirming reports, joining drives, and leading teams.
- Unlock achievement badges:
  - 🏅 *River Watcher* • *Pollution Reporter* • *Cleanup Hero* • *Eco Volunteer* • *Community Leader* • *River Guardian*.

---

## 👥 Role-Based Access

RiverGuard AI supports 4 dedicated user perspectives:

| Role | Target User | Key Capabilities |
|---|---|---|
| **🧑‍🤝‍🧑 Citizen / Volunteer** | Local residents, students, environmentalists | • Submit geo-tagged pollution reports with photos<br>• Upvote/confirm nearby community alerts<br>• RSVP to cleanup drives & earn badges |
| **🏢 NGO Coordinator** | River trusts, green foundations, conservation groups | • Create & manage cleanup campaigns<br>• Allocate equipment & supervise field tasks<br>• Coordinate volunteer distribution |
| **👷 Field Worker** | Sanitation teams, municipality staff, field crews | • View assigned remediation work orders<br>• Upload "After" photos for AI verification<br>• Update real-time status (`IN_PROGRESS`, `COMPLETED`) |
| **🏛️ Municipal Admin** | City council, pollution control boards, civil authorities | • Access city-wide environmental dashboards<br>• Review high-risk chemical/sewage violations<br>• Dispatch emergency civic resources |

---

## 🧠 AI Engine & Image Verification

RiverGuard AI features an **Adaptive Model Auto-Discovery Engine** that queries Google AI Studio on startup to automatically discover and use the optimal available model:

```
[Citizen Photo Upload]
         │
         ▼
[Image Compression (640px JPEG)]
         │
         ▼
[Google Gemini Multimodal API] ──(Fallback)──> [Offline Rule Engine]
         │
         ├──> Pollution Classification (e.g., "Plastic Waste")
         ├──> Severity Level ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
         ├──> Environmental Threat & Water Turbidity Impact
         └──> Actionable Volunteer & Remediation Recommendations
```

Supported Gemini Models (auto-prioritized):
- `gemini-2.0-flash`
- `gemini-1.5-flash`
- `gemini-1.5-pro`

---

## 🧮 Scoring & Priority Engine

Each report receives an algorithmic priority score ($0 - 100$) based on transparent environmental metrics:

$$\text{Priority Score} = \text{Severity} + \text{Risk} + \text{Community Confirmations} + \text{Report Age} + \text{Density Clustering}$$

- **Severity Weight**: `LOW`: 10 pts, `MEDIUM`: 25 pts, `HIGH`: 40 pts, `CRITICAL`: 50 pts
- **Environmental Threat**: Up to 30 pts based on aquatic toxicity
- **Community Confirmations**: +1.5 pts per citizen upvote (max 20 pts)
- **Report Age**: Prevents forgotten reports from stagnating
- **Nearby Clustering**: Detects recurring dump sites and surges priority

---

## 🛠️ Tech Stack

- **Core Framework**: [React 18](https://reactjs.org/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) + PostCSS
- **Iconography**: [Lucide React](https://lucide.dev/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Artificial Intelligence**: [Google Gemini Multimodal API](https://ai.google.dev/)
- **State & Data Storage**: Browser LocalStorage / Multi-tenant shared state persistence

---

## 📁 Project Architecture

```
riverguard/
├── RiverGuardAI.jsx       # Main application containing all modules, state, and UI views
├── src/
│   ├── main.jsx           # React DOM root entry point
│   └── index.css          # Tailwind CSS directives & global styling
├── index.html             # Application HTML shell
├── package.json           # Dependencies and build scripts
├── vite.config.js         # Vite configuration with React plugin
├── tailwind.config.js     # Tailwind design system tokens
├── postcss.config.js      # PostCSS configuration
├── vercel.json            # Vercel single-page application routing rewrite
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version `18.0.0` or higher recommended)
- `npm` (comes with Node.js) or `yarn` / `pnpm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jadhavroshani713-sys/Rivergaurd--AI.git
   cd Rivergaurd--AI
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:5173](http://localhost:5173).

---

## ⚙️ Configuration

### Google Gemini API Key

You can configure your Gemini API key in two ways:

1. **In-App (Recommended for Quick Testing):**
   - Click the **AI Engine** icon in the navigation bar.
   - Enter your API key (obtained from [Google AI Studio](https://aistudio.google.com/app/apikey)).
   - Keys are safely preserved in your browser's `localStorage`.

2. **Environment Variable:**
   - Create a `.env` file in the root directory:
     ```env
     VITE_GEMINI_API_KEY=AIzaSyYourKeyHere...
     ```

---

## 🌐 Deployment Guide

### Deploying on Vercel (Recommended)

Because RiverGuard AI is built with Vite and React, it is 100% native to **Vercel**:

1. Fork or push this repository to your GitHub account.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Select `Rivergaurd--AI` and click **Import**.
4. Confirm build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. (Optional) Add `VITE_GEMINI_API_KEY` under **Environment Variables**.
6. Click **Deploy**.

*(Client-side routing rewrites are already handled by `vercel.json`)*

---

### Integrating with Streamlit (Python)

If you wish to embed or run RiverGuard AI inside a Python Streamlit application:

```python
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="RiverGuard AI", page_icon="🌊", layout="wide")

# Build the React application first: npm run build
with open("dist/index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

components.html(html_content, height=1000, scrolling=True)
```

---

## 🔑 Demo Credentials

RiverGuard AI comes pre-loaded with mock accounts so you can test all four operational perspectives:

| Role | Email | Password |
|---|---|---|
| **Citizen** | `rohit.patel@gmail.com` | `password123` |
| **NGO Coordinator** | `priya.sharma@cleanriver.org` | `password123` |
| **Field Worker** | `amit.verma@greencorps.org` | `password123` |
| **Municipal Admin** | `admin.pune@gov.in` | `password123` |

*You can also click **"Quick Sign In"** on the login page to immediately test any account.*

---

## 🤝 Contributing

Contributions are welcomed! Follow these steps:

1. Fork the Project (`https://github.com/jadhavroshani713-sys/Rivergaurd--AI/fork`)
2. Create your Feature Branch (`git checkout -b feature/NewFeature`)
3. Commit your Changes (`git commit -m "Add some NewFeature"`)
4. Push to the Branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.