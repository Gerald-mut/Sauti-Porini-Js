# Sauti Porini - Command Center Dashboard

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-4.0%2B-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS-4264FB?style=for-the-badge&logo=mapbox&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.0%2B-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## Overview

The **Sauti Porini Dashboard** is a tactical 3D visualization interface designed for forest rangers. It renders real-time threat data on a 3D terrain map of Kakamega Forest, allowing rangers to distinguish between satellite alerts, acoustic sensor triggers, and verified citizen reports.

## Key Features

- **3D Terrain Visualization:** Uses Mapbox GL JS to render realistic topography (hills/valleys) for better patrol planning.
- **Live Data Layers:**
  - **Red Pulse:** Satellite deforestation alerts.
  - **Yellow Waves:** Acoustic sensor detections (chainsaws).
  - **Blue Pins:** Verified citizen USSD reports.
- **Glassmorphism UI:** A modern, dark-mode "Heads Up Display" (HUD) aesthetic using Tailwind CSS.
- **Actionable Intelligence:**
  - **Voice of the Forest:** One-click petition generation based on alert coordinates.
  - **Blockchain Verification:** Displays SHA-256 hash badges on reports to prove authenticity.

## Tech Stack

- **Core:** React.js (Vite)
- **Mapping:** react-map-gl, mapbox-gl
- **Styling:** Tailwind CSS, Framer Motion (Animations)
- **Icons:** Lucide React
- **State Management:** React Hooks

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Mapbox Public Access Token

### Steps

1.  **Navigate to the frontend directory:**

    ```bash
    cd sauti-porini/frontend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root directory:

    ```env
    VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
    ```

4.  **Run the Development Server:**

    ```bash
    npm run dev
    ```

    The dashboard will launch at `http://localhost:5173`.


## Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## Author & License
**Owner:** Gerald Muteru

This project is proprietary software. All rights reserved.
Unauthorized copying of this file, via any medium, is strictly prohibited.
**Owner:** Gerald Muteru

This project is proprietary software. All rights reserved.
