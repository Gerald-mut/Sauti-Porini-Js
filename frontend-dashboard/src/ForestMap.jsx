import React, { useState } from "react";
import { motion } from "framer-motion";
import Map, { Marker, Popup, Source, NavigationControl } from "react-map-gl";
import { AlertTriangle, MapPin, X, Wind, Thermometer, Radio } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ForestMap = ({ zoneData = [] }) => {
  const [popupInfo, setPopupInfo] = useState(null);

  const [viewState, setViewState] = useState({
    longitude: 34.85,
    latitude: 0.23,
    zoom: 12,
    pitch: 60,
    bearing: -10,
  });

  return (
    <div className="w-full h-full relative bg-black">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
        maxPitch={85}
      >
        <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
        <NavigationControl position="top-right" showCompass={true} />

        {/* --- DYNAMIC STATE LAYER --- */}
        {zoneData.map((zone) => {
          if (zone.currentState === "NORMAL") return null;

          const isAlert = zone.currentState === "ALERT";
          
          // Explicit Tailwind classes so they don't get purged
          const glowColor = isAlert ? "bg-red-500" : "bg-yellow-500";
          const innerColor = isAlert ? "bg-red-900/90 border-red-500 text-red-100" : "bg-yellow-900/90 border-yellow-500 text-yellow-100";

          return (
            <Marker
              key={zone.sectorId}
              longitude={zone.lon}
              latitude={zone.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(zone);
              }}
            >
              <motion.div
                className="relative cursor-pointer group"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: isAlert ? 0.8 : 2 }} 
              >
                {/* Glowing Aura */}
                <div className={`absolute inset-0 ${glowColor} rounded-full blur-md opacity-50`} />
                
                {/* Inner Pin */}
                <div className={`relative w-10 h-10 ${innerColor} border-2 rounded-full flex items-center justify-center shadow-2xl`}>
                  {isAlert ? <AlertTriangle size={20} /> : <Radio size={20} />}
                </div>
              </motion.div>
            </Marker>
          );
        })}

        {/* --- DYNAMIC POPUP --- */}
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.lon}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            className="forest-popup"
            maxWidth="320px"
            offset={20}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-xl overflow-hidden shadow-2xl min-w-[280px]">
              
              {/* Header */}
              <div className={"px-4 py-3 border-b border-slate-700 flex justify-between items-center " + (popupInfo.currentState === 'ALERT' ? 'bg-red-900/40' : 'bg-yellow-900/40')}>
                <div className="font-bold tracking-wider text-sm flex items-center gap-2">
                  {popupInfo.currentState === 'ALERT' ? (
                    <><AlertTriangle size={16} className="text-red-500" /> <span className="text-red-400">CRITICAL ALERT</span></>
                  ) : (
                    <><Radio size={16} className="text-yellow-500" /> <span className="text-yellow-400">ESCALATED WATCH</span></>
                  )}
                </div>
                <button onClick={() => setPopupInfo(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              </div>

              <div className="p-4 space-y-4">
                {/* Sector ID */}
                <div className="font-mono text-xs text-slate-400 bg-black/50 p-2 rounded">
                  TARGET: {popupInfo.sectorId}
                </div>

                {/* Threat History (The Brain) */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Active Threats</h4>
                  <ul className="space-y-2">
                    {popupInfo.activeThreats?.map((threat, idx) => (
                      <li key={idx} className="text-sm text-slate-200 border-l-2 border-slate-600 pl-2">
                        {threat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weather Context */}
                {popupInfo.weatherContext && (
                  <div className="flex gap-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Wind size={14} className="text-blue-400" /> 
                      {popupInfo.weatherContext.windSpeed} km/h
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Thermometer size={14} className="text-red-400" /> 
                      {popupInfo.weatherContext.temperature}°C
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default ForestMap;