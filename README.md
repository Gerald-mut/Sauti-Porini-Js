# Sauti Porini (Voice in the Wild)

> **From Passive Observation to Proactive Defense.**
> An autonomous environmental protection agent powered by Azure AI Foundry and deterministic state-machine logic.

## The Problem: Monitoring is Not Protection
Globally, we lose millions of hectares of forest annually to illegal logging and wildfires. While millions of dollars are poured into satellite monitoring, these systems are passive observers, they only alert us *after* a forest has been destroyed. We are experts at mapping deforestation, but we are failing to prevent it.

**Sauti Porini** acts as a digital ranger that never sleeps, shifting conservation from passive observation to proactive interception.

---

## System Architecture (Hybrid Intelligence)

To solve the classic AI problems of "alert fatigue" and excessive API token burn, Sauti Porini utilizes a **Hybrid Intelligence Architecture**:

1. **The Deterministic Brain (State Machine):** A lightweight backend constantly monitors baseline satellite data (NASA FIRMS) and live weather conditions (OpenWeather). It acts as a strict gatekeeper, quietly escalating forest sectors from `NORMAL` to `WATCH` using mathematical thresholds without wasting expensive AI compute.
2. **The Generative Brain (Azure AI Foundry):** When a verified ground threat is detected (e.g., an IoT acoustic sensor hearing a chainsaw or a citizen dialing our USSD code), the system violently escalates to `CRITICAL ALERT`. This wakes up the Azure Agent.
3. **Agentic Dispatch:** The Azure Agent acts as the Chief Dispatcher, synthesizing the threat timeline, weather context, and hashed whistleblower data to autonomously draft a highly specific, tactical dispatch for human rangers.

---

## Architecture

```text
                      [NASA FIRMS]      [OpenWeather API]
                           │                     │
                           ▼ (Satellite)         ▼ (Weather Data)
                     ┌────────────────────────────────┐
                     │         STATE MACHINE          │
                     │  NORMAL → WATCH → CRITICAL     │
                     └────────────────┬───────────────┘
                                      │
                                      │ (Escalates on Ground-Truth Threat)
                                      ▲
           ┌──────────────────────────┴──────────────────────────┐
           │                                                     │
   [IoT Acoustic Sensor]                                 [USSD (Africa's Talking)]
   (Mock Input → Real Azure Speech)                      (Community Threat Reporting)
           │                                                     │
           └──────────────────────────┬──────────────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────┐
                     │    AZURE AI FOUNDRY AGENT      │
                     │  (Generative Reasoning Brain)  │◄───► [Azure Cosmos DB]
                     │  • Queries zone history        │      (Persistent Zone Memory)
                     │  • Synthesizes tactical plan   │
                     └────────────────┬───────────────┘
                                      │
                                      ▼ (Tactical Dispatch / Logs)
                     ┌────────────────────────────────┐
                     │        REACT DASHBOARD         │
                     │       (Command Center)         │
                     └────────────────────────────────┘
```

---

## Technology Stack

### **Frontend (The Command Center)**
* **React:** Core UI framework.
* **Mapbox GL JS:** 3D terrain mapping and spatial data visualization.
* **Framer Motion:** Dynamic, real-time visual alerts (glassmorphism UI and pulsing threat pins).
* **Tailwind CSS:** Utility-first styling.

### **Backend (The Engine)**
* **Node.js & Express:** REST API and webhook handling.
* **Azure Cosmos DB (MongoDB API):** Gives the forest a "memory" by tracking the persistent state of geographic zones.
* **Azure AI Foundry:** Powers the generative agentic framework.
* **Africa's Talking API:** Handles USSD shortcode integration for community reporting.
* **Node Crypto:** Secures whistleblower identities using SHA-256 blockchain hashing.

---

## Directory Structure

```text
Sauti-Porini-Js/
├── agent-backend/
│   └── src/
│       ├── orchestrator.js       # Main state machine loop
│       ├── azureAgent.js         # Azure AI Foundry dispatch logic
│       ├── simulate_fire.js      # Demo: triggers WATCH state
│       └── simulate_ussd.js      # Demo: triggers CRITICAL alert
├── frontend-dashboard/           # React + Mapbox command center
├── .gitignore
└── README.md
```

---

## AI Logic Explained

### The State Machine (Deterministic Brain)
The state machine is the first line of defense. Instead of routing noisy satellite data directly to a large language model (LLM) which would result in astronomical API costs and high latency, Sauti Porini uses lightweight threshold logic to escalate zones from `NORMAL` to `WATCH`. It analyzes real-time hotspot counts and local weather conditions (such as wind speed, temperature, and humidity) mathematically. No generative AI models are called at this stage, ensuring a reliable, cost-efficient, and deterministic baseline.

### The Azure Agent (Generative Brain)
The generative brain only activates when the system escalates to `CRITICAL` (triggered by ground-truth threats like USSD citizen reporting or IoT acoustic detection). Once woken up, the Azure AI Foundry Agent initiates a multi-step reasoning loop:
1. **Queries Zone History:** Pulls historic event logs and persistent state data for the affected zone from Azure Cosmos DB.
2. **Checks Live Weather:** Assesses real-time wind speed and temperature to predict fire propagation or threat mobility.
3. **Synthesizes Tactical Dispatch:** Integrates all timeline events into a highly detailed, actionable briefing for human rangers.
4. **Outputs Confidence Score:** Evaluates its own recommendation, providing a reasoning chain along with a numeric confidence score to guide field intervention.

### The Acoustic Pipeline (Mock input → Real pipeline)
Acoustic threat classification handles sensor input. The raw audio input is currently simulated (using pre-recorded mock `.wav` threat audio), but the backend routes this audio through a real Azure Speech classification service. The service transcribes and processes the audio stream to extract specific hazard and threat keywords (such as `"chainsaw"`, `"gunshot"`, `"vehicle"`, or `"fire"`). Once a keyword match is verified, the pipeline triggers an immediate, automated escalation to a `CRITICAL` alert state, bridging simulated sensors with a production-grade NLP pipeline.

---

## Simulated vs Real

| Component | Status | Notes |
| :--- | :--- | :--- |
| **NASA FIRMS data** | Simulated | Uses a demo script to mock hot-spot coordinates, though structured realistically. |
| **OpenWeather API** | Real | Fetches live, real-time meteorological conditions for wind speeds and temperature. |
| **Azure AI Foundry Agent** | Real | Generative orchestration using gpt-4o-mini to analyze context and write dispatches. |
| **Africa's Talking USSD** | Real | Configured to process incoming citizen report webhooks and trigger critical alerts. |
| **Acoustic sensor input** | Simulated | Feeds a pre-recorded mock `.wav` audio file representing forest ambient noise or threats. |
| **Azure Speech classifier** | Real | Transcribes the simulated audio and searches for critical keywords (e.g., chainsaw, gunshot). |
| **Cosmos DB** | Real | Tracks live geographic zone documents and historical forest sector state changes. |
| **Whistleblower SHA-256 hashing** | Real | Encrypts and anonymizes reporter phone numbers before storage to protect identity. |

---

## Getting Started

### Prerequisites
* Node.js 
* Azure Cosmos DB (or a local MongoDB instance)
* Azure AI Foundry account
* Mapbox API Token
* OpenWeather API Token

### 1. Clone the Repository
```bash
git clone https://github.com/Gerald-mut/Sauti-Porini-Js.git
cd Sauti-Porini-Js
```

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and start the orchestrator:

```bash
cd Sauti-Porini-Js/agent-backend
npm install
```

Create a `.env` file in the backend root (`agent-backend/`) and add your keys:

```env
PORT=3000
MONGODB_URI=your_azure_cosmos_connection_string
AZURE_AI_PROJECT_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
OPENWEATHER_API_KEY=your_openweather_key
```

Start the orchestrator:

```bash
node src/orchestrator.js
```

### 3. Frontend Setup
Navigate to the frontend directory, install dependencies, and start the development server:

```bash
cd Sauti-Porini-Js/frontend-dashboard
npm install
```

Create a `.env` file in the frontend root (`frontend-dashboard/`):

```env
VITE_MAPBOX_TOKEN=your_mapbox_token
```

Start the development server:

```bash
npm run dev
```

---

## Running the Local Demo (Simulators)

To demonstrate the State Machine and Azure Agent without waiting for a real forest fire, use the included simulator scripts.

**Start the Baseline:** Ensure your frontend and backend are running. The map will be peaceful (`NORMAL` state).

**Trigger "Demo Mode" (Satellite Hit):** Open a new terminal, navigate to the backend directory, and run:

```bash
cd agent-backend
node src/simulate_fire.js
```
Watch the map dynamically update a sector to the amber `WATCH` state based on live wind speeds.

**Trigger Ground Truth (USSD Citizen Report):** Open a new terminal, navigate to the backend directory, and run:

```bash
cd agent-backend
node src/simulate_ussd.js
```
Watch the map violently flash red (`CRITICAL ALERT`). Click the pin to see the autonomous tactical dispatch drafted by Azure AI, and check the data tables to see the SHA-256 hashed whistleblower ID.

---

## Core Features
* **Zero False Positives:** Deterministic logic filters noise before involving the LLM.
* **Rapid Interception:** Reduces response times from days to minutes by linking satellite anomalies with real-time ground sensors.
* **Whistleblower Protection:** Secures citizen USSD reports using cryptographic hashing to protect local community members reporting illegal logging.
* **Acoustic Threat Detection:** Routes simulated audio through a real Azure Speech classification pipeline to extract threat labels before triggering escalation — a real sensor pipeline, not a bare webhook.

---

## Author
* Gerald Muteru Wangome
