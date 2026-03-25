import React, { useState, useEffect, useRef } from "react";
import { Terminal, X } from "lucide-react";

const LiveTerminal = () => {
  const [logs, setLogs] = useState([
    "[SYSTEM] Sauti Porini Agent Initialized...",
    "[SYSTEM] Listening for field anomalies...",
  ]);
  const [isOpen, setIsOpen] = useState(true);
  const endOfLogsRef = useRef(null);

  // Auto-scroll to the newest log
  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const triggerSimulation = async () => {
    setLogs((prev) => [
      ...prev,
      "> Triggering IoT Chainsaw Simulation in SECTOR-7...",
    ]);
    try {
      // Call your backend analyze route
      const response = await fetch("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: "SECTOR-7-KAKAMEGA" }),
      });

      // Catch the SSE Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        lines.forEach((line) => {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));
            const colorClass =
              data.type === "error"
                ? "text-red-400"
                : data.type === "tool_result"
                  ? "text-blue-400"
                  : data.type === "complete"
                    ? "text-green-400 font-bold"
                    : "text-green-500";

            setLogs((prev) => [
              ...prev,
              <span className={colorClass} key={Date.now() + Math.random()}>
                [{data.type.toUpperCase()}] {data.message}
              </span>,
            ]);
          }
        });
      }
    } catch (error) {
      console.error(error);
      setLogs((prev) => [
        ...prev,
        <span className="text-red-500">
          [ERROR] Connection to Azure Foundry lost.
        </span>,
      ]);
    }
  };

  if (!isOpen)
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 bg-black/80 border border-green-500/30 p-3 rounded-full text-green-400 hover:bg-green-900/30 hover:scale-110 transition-all z-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
      >
        <Terminal size={24} />
      </button>
    );

  return (
    <div className="absolute bottom-6 right-6 w-96 bg-black/80 backdrop-blur-md border border-green-500/30 rounded-lg shadow-2xl z-50 font-mono text-xs overflow-hidden flex flex-col transition-all">
      {/* Terminal Header */}
      <div className="bg-green-900/20 px-3 py-2 flex justify-between items-center border-b border-green-500/30">
        <div className="flex items-center gap-2 text-green-400 font-bold tracking-widest uppercase">
          <Terminal size={14} /> Azure Agent Stream
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-green-600 hover:text-green-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Log Output */}
      <div className="h-64 p-3 overflow-y-auto flex flex-col gap-1">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        <div ref={endOfLogsRef} />
      </div>

      {/* Terminal Input/Actions */}
      <div className="p-2 bg-black border-t border-green-900/50">
        <button
          onClick={triggerSimulation}
          className="w-full bg-green-900/20 hover:bg-green-800/40 text-green-400 border border-green-700/50 py-1.5 rounded uppercase tracking-wider font-bold transition-colors active:scale-95"
        >
          &gt; Execute Test Sim
        </button>
      </div>
    </div>
  );
};

export default LiveTerminal;
