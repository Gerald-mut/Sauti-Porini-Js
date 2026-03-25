import React, { useState } from "react";
import Map, { Marker, Popup, Source, NavigationControl } from "react-map-gl";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import {
  AlertTriangle,
  Radio,
  MapPin,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ForestMap = ({ satelliteData = [], ussdData = [], iotData = [] }) => {
  const [popupInfo, setPopupInfo] = useState(null);

  const [viewState, setViewState] = useState({
    longitude: 34.85,
    latitude: 0.23,
    zoom: 12,
    pitch: 60,
    bearing: -10,
  });

  const handlePetition = (coords) => {
    const subject = "URGENT: Illegal Logging Detected in Kakamega Forest";
    const body = `Dear Governor,\n\nSatellite intelligence has detected high-confidence deforestation activity at Coordinates: ${coords.lat}, ${coords.lon}.\n\nAs a concerned citizen monitoring via ForestGuard, I urge you to deploy the KFS enforcement team immediately.\n\nSigned,\nForestGuard Monitor`;
    window.open(
      `mailto:governor@kakamega.go.ke?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

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
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        <NavigationControl position="top-right" showCompass={true} />

        {/* --- LAYER 1: SATELLITE ALERTS (Filtered) --- */}
        {satelliteData
          .filter((alert) => alert.lat != null && alert.lon != null)
          .map((alert) => (
            <Marker
              key={`sat-${alert.id}`}
              longitude={alert.lon}
              latitude={alert.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ ...alert, type: "satellite" });
              }}
            >
              <motion.div
                className="relative cursor-pointer group"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="absolute inset-0 bg-red-500 rounded-full blur-md opacity-50" />
                <div className="relative w-8 h-8 bg-red-900/90 border border-red-500 rounded-full flex items-center justify-center text-red-100 shadow-lg">
                  <AlertTriangle size={16} />
                </div>
              </motion.div>
            </Marker>
          ))}

        {/* --- LAYER 2: IoT SENSORS (Filtered) --- */}
        {iotData
          .filter((iot) => iot.lat != null && iot.lon != null)
          .map((iot) => (
            <Marker
              key={`iot-${iot.id}`}
              longitude={iot.lon}
              latitude={iot.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ ...iot, type: "iot" });
              }}
            >
              <div className="relative flex items-center justify-center w-10 h-10 cursor-pointer">
                <motion.div
                  className="absolute inset-0 border-2 border-yellow-400 rounded-full"
                  animate={{ scale: [1, 2], opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <div className="relative z-10 w-8 h-8 bg-yellow-500/20 border border-yellow-400 backdrop-blur-sm rounded-full flex items-center justify-center text-yellow-300">
                  <Radio size={16} />
                </div>
              </div>
            </Marker>
          ))}

        {/* --- LAYER 3: USSD REPORTS (Filtered) --- */}
        {ussdData
          .filter((report) => report.lat != null && report.lon != null)
          .map((report) => (
            <Marker
              key={`ussd-${report.id}`}
              longitude={report.lon}
              latitude={report.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ ...report, type: "ussd" });
              }}
            >
              <div className="group relative cursor-pointer transition-transform hover:scale-110">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg">
                  <MapPin size={18} />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600" />
              </div>
            </Marker>
          ))}

        {/* --- POPUP --- */}
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.lon}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            className="forest-popup"
            maxWidth="320px"
            offset={15}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-xl overflow-hidden shadow-2xl min-w-[260px]">
              <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                  {popupInfo.type === "satellite" && (
                    <>
                      <AlertTriangle size={14} className="text-red-500" />{" "}
                      <span className="text-red-400">Sat Alert</span>
                    </>
                  )}
                  {popupInfo.type === "ussd" && (
                    <>
                      <MapPin size={14} className="text-blue-500" />{" "}
                      <span className="text-blue-400">Citizen Report</span>
                    </>
                  )}
                  {popupInfo.type === "iot" && (
                    <>
                      <Radio size={14} className="text-yellow-500" />{" "}
                      <span className="text-yellow-400">Audio Detect</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setPopupInfo(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="text-sm text-slate-300">
                  {popupInfo.confidence && (
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-mono text-white">
                        {popupInfo.confidence}
                      </span>
                    </div>
                  )}
                  {popupInfo.report_details && (
                    <div className="bg-slate-800 p-2 rounded border border-slate-700 mt-1 italic">
                      "{popupInfo.report_details}"
                    </div>
                  )}
                  {popupInfo.sound_type && (
                    <div className="flex items-center gap-2 text-yellow-200">
                      <span>🔊 Sound:</span>
                      <span className="uppercase font-bold">
                        {popupInfo.sound_type}
                      </span>
                    </div>
                  )}
                </div>

                {popupInfo.blockchain_proof && (
                  <div className="bg-green-900/20 border border-green-500/30 p-2.5 rounded-lg flex items-start gap-3 mt-2">
                    <ShieldCheck
                      size={18}
                      className="text-green-400 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-green-400 uppercase">
                        Blockchain Verified
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 break-all leading-tight mt-1">
                        {popupInfo.blockchain_proof.substring(0, 20)}...
                      </p>
                    </div>
                  </div>
                )}

                {popupInfo.type === "satellite" && (
                  <button
                    onClick={() =>
                      handlePetition({ lat: popupInfo.lat, lon: popupInfo.lon })
                    }
                    className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
                  >
                    <Send size={14} /> Deforestation Detected
                  </button>
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
