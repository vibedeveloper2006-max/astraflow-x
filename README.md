# AstraFlow X - Predictive Crowd Intelligence System 🏟️

AstraFlow X is a production-grade crowd management and predictive intelligence platform designed for large-scale venues, specifically tailored for the **Sawai Mansingh Stadium in Jaipur**. It leverages Gemini AI for real-time risk assessment and crowd flow optimization.

## 🚀 Key Features

- **Live Crowd Mapping:** Glassmorphic dashboard with real-time zone status and occupancy tracking.
- **Predictive Engine:** Time-series occupancy forecasting and congestion trend analysis.
- **AI Assistant:** Integrated Gemini-powered chat for crowd managers and stadium staff.
- **Smart Alerts:** Automated notification system for high-risk zones and overcrowding.
- **Simulation Suite:** CLI tools to test stadium load and flow scenarios.

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express, TypeScript, Zod validation.
- **AI/ML:** Google Gemini AI (Generative Language API).
- **Database:** Firebase Admin SDK.
- **DevOps:** Docker, npm Workspaces.

## 📦 Project Structure

```text
/
├── client/          # Next.js frontend application
├── server/          # Express/TypeScript backend API
├── shared/          # Shared type definitions and utilities
└── docker-compose.yml
```

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js 18+
- npm 9+
- Gemini API Key

### 2. Configure Environment
Create a `.env` file in the `server` directory:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
LOG_LEVEL=info
```

### 3. Install Dependencies
From the root directory:
```bash
npm install
```

### 4. Running the Application
Development mode:
```bash
# Start both server and client
npm run dev
```

Or individually:
```bash
npm run dev -w astraflow-x-server
npm run dev -w astraflow-x-client
```

## 🧪 Testing & Simulation

### Unit Tests
```bash
npm test -w astraflow-x-server
```

### Run Crowd Simulation
```bash
npm run simulate -w astraflow-x-server
```

## 🐳 Docker Deployment

Build and run using Docker Compose:
```bash
docker-compose up --build
```

---
*Built for Advanced Agentic Coding - Gemini API Developer Competition.*
