import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Clock, List, ChevronRight, ShieldAlert, X } from 'lucide-react';

export default function ThreatTimeline({ events, onClear }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const getBadgeColor = (state) => {
    switch (state) {
      case 'NORMAL': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'WATCH': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CRITICAL': 
      case 'ALERT': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDotColor = (state) => {
    switch (state) {
      case 'NORMAL': return 'bg-green-500';
      case 'WATCH': return 'bg-amber-500';
      case 'CRITICAL': 
      case 'ALERT': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end">
      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl hover:bg-black/80 transition-colors relative z-30 mb-2 group"
      >
        {isExpanded ? (
          <X className="text-white" size={24} />
        ) : (
          <AlertTriangle className="text-red-400 group-hover:scale-110 transition-transform" size={24} />
        )}
        {!isExpanded && events.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-lg">
            {events.length}
          </span>
        )}
      </button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { width: 0, opacity: 0, x: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { width: 320, opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { width: 0, opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl origin-top-right"
            style={{ maxHeight: '70vh' }}
          >
            <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center shrink-0 w-[320px]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-red-400" size={20} />
                <h2 className="text-white font-bold tracking-wide">Threat Timeline</h2>
              </div>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full">{events.length} Events</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar w-[320px]">
              {events.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                  No critical events recorded.
                </div>
              ) : (
                <div className="relative border-l border-white/10 ml-3 space-y-6">
                  {events.map((event) => (
                    <TimelineEvent 
                      key={event.id} 
                      event={event} 
                      getBadgeColor={getBadgeColor} 
                      getDotColor={getDotColor} 
                      shouldReduceMotion={shouldReduceMotion} 
                    />
                  ))}
                </div>
              )}
            </div>

            {events.length > 0 && (
              <div className="p-3 border-t border-white/10 shrink-0 bg-black/40 w-[320px]">
                <button 
                  onClick={onClear}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Clear Timeline
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineEvent({ event, getBadgeColor, getDotColor, shouldReduceMotion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative pl-6">
      {/* Connector Dot */}
      <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full ${getDotColor(event.to_state)} ring-4 ring-black/80 shadow-[0_0_10px_rgba(255,0,0,0.5)]`}></div>
      
      <div 
        className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">{event.zone_id}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300 flex items-center gap-1"><Clock size={12}/> {event.timestamp}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(event.to_state)}`}>
            {event.from_state} → {event.to_state}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/20 uppercase max-w-[140px] truncate" title={event.threat_label}>
            {event.threat_label}
          </span>
        </div>

        {event.confidence !== null && event.confidence !== undefined && event.confidence > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Confidence</span>
              <span className="font-bold text-gray-200">{event.confidence}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getDotColor(event.to_state)}`} 
                style={{ width: `${event.confidence}%` }}
              ></div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                {event.reasoning && event.reasoning.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1"><List size={10}/> Reasoning</h4>
                    <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1 ml-1">
                      {event.reasoning.map((reason, idx) => (
                        <li key={idx} className="leading-relaxed">{reason}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {event.dispatch && (
                  <div>
                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-1">Dispatch Protocol</h4>
                    <div className="bg-black/50 p-2 rounded text-xs text-gray-300 border border-white/5 font-mono leading-relaxed whitespace-pre-wrap">
                      {event.dispatch}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex justify-center mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : 'rotate-0'}`} />
        </div>
      </div>
    </div>
  );
}
