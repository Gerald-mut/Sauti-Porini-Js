# Sauti Porini (Voice in the Wild)

> **From Passive Observation to Proactive Defense.** > An autonomous environmental protection agent powered by Azure AI Foundry and deterministic state-machine logic.


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

## Getting Started

### Prerequisites
* Node.js 
* Azure Cosmos DB (or a local MongoDB instance)
* Azure AI Foundry account
* Mapbox API Token
* OpenWeather API Token

### 1. Clone the Repository
```bash
git clone [https://github.com/Gerald-mut/sauti-porini.git](https://github.com/Gerald-mut/sauti-porini.git)
cd sauti-porini
```

### 2. Backend Setup
* Navigate to the backend directory and install dependencies:

```Bash
# Assuming backend is in the root or a specific folder
npm install
```
Create a .env file in the backend root and add your keys:

```Code snippet
PORT=3000
MONGODB_URI=your_azure_cosmos_connection_string
AZURE_AI_PROJECT_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
OPENWEATHER_API_KEY=your_openweather_key
```
Start the orchestrator:

```Bash
node src/orchestrator.js
```
### 3. Frontend Setup
Navigate to the frontend directory:

```Bash
cd frontend-dashboard
npm install
```
Create a .env file in the frontend root:

```Code snippet
VITE_MAPBOX_TOKEN=your_mapbox_token
Start the development server:
```

```Bash
npm run dev
Running the Local Demo (Simulators)
```
To demonstrate the State Machine and Azure Agent without waiting for a real forest fire, use the included simulator scripts.

Start the Baseline: Ensure your frontend and backend are running. The map will be peaceful (NORMAL state).

Trigger "Demo Mode" (Satellite Hit): Open a new terminal and run:

```Bash
node src/simulate_fire.js
```
Watch the map dynamically update a sector to the amber WATCH state based on live wind speeds.

Trigger Ground Truth (USSD Citizen Report):

```Bash
node src/simulate_ussd.js
```
Watch the map violently flash red (CRITICAL ALERT). Click the pin to see the autonomous tactical dispatch drafted by Azure AI, and check the data tables to see the SHA-256 hashed whistleblower ID.

### Core Features
* Zero False Positives: Deterministic logic filters noise before involving the LLM.

* Rapid Interception: Reduces response times from days to minutes by linking satellite anomalies with real-time ground sensors.

* Whistleblower Protection: Secures citizen USSD reports using cryptographic hashing to protect local community members reporting illegal logging.

### Author
* Gerald Muteru Wangome
