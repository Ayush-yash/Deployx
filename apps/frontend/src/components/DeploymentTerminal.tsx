import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, TerminalSquare, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM' | 'OUTPUT';
  message: string;
}

interface DeploymentTerminalProps {
  logs: LogEntry[];
}

export const DeploymentTerminal: React.FC<DeploymentTerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 10;
    setAutoScroll(isAtBottom);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'ERROR': return 'text-red-400';
      case 'WARNING': return 'text-amber-400';
      case 'SYSTEM': return 'text-blue-400 font-bold';
      case 'OUTPUT': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  const copyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const downloadLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-logs-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[400px] bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <TerminalSquare className="w-4 h-4" /> Build Logs
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLogs} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Copy Logs">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={downloadLogs} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Download Logs">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1.5"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Waiting for deployment to start...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 hover:bg-white/5 px-1 -mx-1 rounded">
              <span className="text-slate-600 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={clsx(getLogColor(log.level), "break-words whitespace-pre-wrap")}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
