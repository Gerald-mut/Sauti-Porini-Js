import { useState, useEffect, useRef } from 'react';
import { fetchAllAlerts, fetchZoneStates } from '../services/api';

export function useThreatEvents(onCriticalTriggered, onDispatchReady) {
  const [events, setEvents] = useState([]);
  const processedAlerts = useRef(new Set());
  const processedZones = useRef(new Set());
  const previousZoneStates = useRef({});

  const clearEvents = () => {
    setEvents([]);
    processedAlerts.current.clear();
    processedZones.current.clear();
    previousZoneStates.current = {};
  };

  useEffect(() => {
    const pollData = async () => {
      try {
        const [alerts, zones] = await Promise.all([
          fetchAllAlerts(),
          fetchZoneStates()
        ]);

        let newEvents = [];

        // 1. Process Alerts
        alerts.forEach(alert => {
          if (!processedAlerts.current.has(alert.id)) {
            processedAlerts.current.add(alert.id);
            if (onDispatchReady) onDispatchReady(alert.sectorId);
            newEvents.push({
              id: alert.id,
              timestamp: new Date(alert.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              zone_id: alert.sectorId,
              from_state: 'WATCH',
              to_state: 'CRITICAL',
              threat_label: alert.threat_label || alert.threatType || 'UNKNOWN',
              confidence: alert.confidence ? parseInt(alert.confidence, 10) : 0,
              dispatch: alert.dispatch || alert.dispatchMessage || 'No dispatch info',
              reasoning: Array.isArray(alert.reasoning) ? alert.reasoning : [alert.reasoning].filter(Boolean)
            });
          }
        });

        // 2. Process Zone States
        zones.forEach(zone => {
          const prevState = previousZoneStates.current[zone.sectorId] || 'NORMAL';
          const currentState = zone.currentState;

          if (prevState !== currentState && (currentState === 'WATCH' || currentState === 'CRITICAL' || currentState === 'ALERT')) {
            if (currentState === 'CRITICAL' || currentState === 'ALERT') {
              if (onCriticalTriggered) onCriticalTriggered(zone.sectorId);
            }
            const eventId = `${zone.sectorId}-${currentState}-${Date.now()}`;
            if (!processedZones.current.has(eventId)) {
              processedZones.current.add(eventId);
              newEvents.push({
                id: eventId,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                zone_id: zone.sectorId,
                from_state: prevState,
                to_state: currentState,
                threat_label: 'SYSTEM_STATE_CHANGE',
                confidence: null,
                dispatch: `Zone escalated from ${prevState} to ${currentState}`,
                reasoning: Array.isArray(zone.activeThreats) ? zone.activeThreats : []
              });
            }
          }
          previousZoneStates.current[zone.sectorId] = currentState;
        });

        if (newEvents.length > 0) {
          // Sort by newest first
          newEvents.sort((a, b) => new Date(`1970/01/01 ${b.timestamp}`) - new Date(`1970/01/01 ${a.timestamp}`));
          
          setEvents(prev => {
            // Deduplicate matching zone_id + to_state
            const filteredNew = newEvents.filter(ne => !prev.some(pe => pe.zone_id === ne.zone_id && pe.to_state === ne.to_state));
            const combined = [...filteredNew, ...prev];
            return combined.slice(0, 50); // Keep max 50
          });
        }
      } catch (err) {
        console.error("useThreatEvents polling error:", err);
      }
    };

    pollData();
    const interval = setInterval(pollData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { events, clearEvents };
}
