import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function DispatchLoader({ isLoading, elapsedSeconds, zoneId }) {
  const shouldReduceMotion = useReducedMotion();

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { y: 50, opacity: 0 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { y: 50, opacity: 0 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)] p-4 w-72 flex items-center gap-4 overflow-hidden relative">
          
          {/* Pulsing Ring */}
          <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
            <div className="w-8 h-8 rounded-full border-2 border-red-500/30 absolute"></div>
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin absolute"></div>
            <div className="w-6 h-6 rounded-full bg-red-500/20 animate-ping absolute"></div>
          </div>

          <div className="flex-1">
            <h3 className="text-white font-medium text-sm tracking-wide">AI Dispatch Generating...</h3>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">
              Zone {zoneId} &middot; {elapsedSeconds}s elapsed
            </p>
          </div>

          {/* Progress Bar (0 to 90% over 8 seconds) */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <motion.div 
              className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              initial={{ width: "0%" }}
              animate={{ width: "90%" }}
              transition={{ duration: 8, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
