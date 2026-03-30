import React, { useEffect, useState } from "react";
import ForestMap from "./ForestMap";
import { TreeDeciduous, Activity, Users, Wifi, Menu } from "lucide-react";
import GlassModal from "./components/GlassModal";
import Sidebar from "./components/Sidebar";
import LiveTerminal from "./components/LiveTerminal";

// Import the 3 separate functions
import { fetchAllAlerts } from "./services/api";

function App() {
  // We keep the state unified for easier passing to the Map,
  // but we populate it from separate sources.
  const [data, setData] = useState({
    satellite_alerts: [],
    ussd_reports: [],
    iot_events: [],
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch data from separate endpoints
  useEffect(() => {
    const loadData = async () => {
      try {
        const allAlerts = await fetchAllAlerts();

        // Client-side filtering: fast and efficient
        setData({
          satellite_alerts: allAlerts.filter((a) => {
            const type = String(a.threatType || "").toLowerCase();
            return [
              "satellite",
              "logging",
              "fire",
              "poaching",
              "deforestation",
            ].includes(type);
          }),
          ussd_reports: allAlerts.filter(
            (a) => String(a.threatType || "").toLowerCase() === "ussd",
          ),
          iot_events: allAlerts.filter(
            (a) => String(a.threatType || "").toLowerCase() === "iot",
          ),
        });
      } catch (error) {
        console.error("Error loading data streams:", error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getModalTitle = () => {
    switch (selectedCategory) {
      case "satellite":
        return "Deforestation Alerts (GFW)";
      case "iot":
        return "Acoustic Sensor Events";
      case "ussd":
        return "Community Reports";
      default:
        return "";
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* ForestMap handles the Visuals */}
      <ForestMap
        satelliteData={data.satellite_alerts}
        ussdData={data.ussd_reports}
        iotData={data.iot_events}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectCategory={setSelectedCategory}
      />

      {/* --- HUD HEADER --- */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        <div
          onClick={() => setIsSidebarOpen(true)}
          className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-black/50 transition-colors group"
        >
          <div className="bg-green-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
            <TreeDeciduous className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Sauti <span className="text-green-400">Porini</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Monitoring: Kakamega Forest
            </div>
          </div>
          <Menu
            className="text-white/50 ml-2 group-hover:text-white transition-colors"
            size={20}
          />
        </div>

        {/* Quick Stats Cards */}
        <div className="pointer-events-auto flex gap-3">
          <StatCard
            icon={<Activity className="text-red-400" />}
            label="Alerts"
            value={data.satellite_alerts.length}
            onClick={() => setSelectedCategory("satellite")}
          />
          <StatCard
            icon={<Users className="text-blue-400" />}
            label="Reports"
            value={data.ussd_reports.length}
            onClick={() => setSelectedCategory("ussd")}
          />
          <StatCard
            icon={<Wifi className="text-yellow-400" />}
            label="Sensors"
            value={data.iot_events.length}
            onClick={() => setSelectedCategory("iot")}
          />
        </div>
      </div>

      {/* --- DATA TABLES MODAL --- */}
      {/* This is where the separate data is displayed in separate tables */}
      <GlassModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={getModalTitle()}
      >
        {/* TABLE 1: SATELLITE DATA */}
        {selectedCategory === "satellite" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 text-sm uppercase tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">Location (Lat/Lon)</th>
                  <th className="p-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="text-gray-200 text-sm">
                {data.satellite_alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 font-mono text-gray-400">
                      {alert.alert_date
                        ? new Date(alert.alert_date).toLocaleString()
                        : alert.timestamp
                          ? new Date(alert.timestamp).toLocaleString()
                          : "N/A"}
                    </td>
                    <td className="p-3 font-mono">
                      {alert.lat}, {alert.lon}
                    </td>
                    <td className="p-3">
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold uppercase">
                        {alert.confidence_level ??
                          alert.confidence ??
                          "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 2: IOT DATA */}
        {selectedCategory === "iot" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 text-sm uppercase tracking-wider">
                  <th className="p-3">Detected At</th>
                  <th className="p-3">Sensor ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Location</th>
                </tr>
              </thead>
              <tbody className="text-gray-200 text-sm">
                {data.iot_events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 font-mono text-gray-400">
                      {event.detected_at
                        ? new Date(event.detected_at).toLocaleTimeString()
                        : "N/A"}
                    </td>
                    <td className="p-3 font-mono text-yellow-200">
                      {event.sensor_id}
                    </td>
                    <td className="p-3 uppercase font-bold text-yellow-400">
                      {event.sound_type}
                    </td>
                    <td className="p-3 font-mono">
                      {event.lat}, {event.lon}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE 3: USSD DATA */}
        {selectedCategory === "ussd" && (
          <div className="overflow-x-auto">
            {console.log("Rendering USSD table with data:", data.ussd_reports)}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 text-sm uppercase tracking-wider">
                  <th className="p-3">Time</th>
                  <th className="p-3">Reporter</th>
                  <th className="p-3">Report Details</th>
                  <th className="p-3">Blockchain Verification</th>
                </tr>
              </thead>
              <tbody className="text-gray-200 text-sm">
                {data.ussd_reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 font-mono text-gray-400">
                      {report.received_at
                        ? new Date(report.received_at).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="p-3 font-mono text-blue-300">
                      {report.phone_number}
                    </td>
                    <td className="p-3">
                      <div>{report.report_details}</div>
                      <div className="text-xs text-gray-500">
                        {report.location_text}
                      </div>
                    </td>
                    <td className="p-3">
                      {report.blockchain_proof ? (
                        <div
                          className="flex items-center gap-2 bg-green-900/20 border border-green-500/20 px-2 py-1 rounded cursor-help"
                          title={report.blockchain_proof}
                        >
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="font-mono text-xs text-green-400 truncate w-24">
                            {report.blockchain_proof}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">
                          Pending...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassModal>
      <LiveTerminal />
    </div>
  );
}

// Reusable StatCard Component
const StatCard = ({ icon, label, value, onClick }) => (
  <div
    onClick={onClick}
    className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-xl flex items-center gap-3 min-w-[120px] cursor-pointer hover:bg-white/10 hover:scale-105 transition-all active:scale-95 group"
  >
    <div className="bg-white/5 p-2 rounded-lg group-hover:bg-white/10 transition-colors">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase font-medium">{label}</p>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
    </div>
  </div>
);

export default App;
