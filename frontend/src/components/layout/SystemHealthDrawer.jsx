import React from 'react';
import { 
  X, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck,
  Bot
} from 'lucide-react';

export default function SystemHealthDrawer({
  isOpen,
  onClose,
  health,
  healthLoading,
  lastUpdated,
  onRefresh,
}) {
  if (!isOpen) return null;

  const isBackendUp = health?.connected;
  const isDbUp = health?.data?.database?.connected;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">System Diagnostics</h3>
                <p className="text-xs text-slate-400">Continuous telemetry monitoring</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-slate-400">
                Last checked: <span className="text-slate-300 font-mono">{lastUpdated || 'Checking...'}</span>
              </span>
              <button
                onClick={onRefresh}
                disabled={healthLoading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>{healthLoading ? 'Pinging...' : 'Refresh'}</span>
              </button>
            </div>

            {/* Backend API */}
            <div className={`p-4 rounded-xl border ${
              isBackendUp 
                ? 'bg-slate-950/60 border-emerald-500/30' 
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Express REST API</span>
                </div>
                {isBackendUp ? (
                  <span className="inline-flex items-center space-x-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Operational</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>Unavailable</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>Port: 5000 (HTTP)</div>
                <div>Service: {health?.data?.service || 'healthbridge-api'}</div>
                <div>Latency: {health?.latency !== undefined ? `${health.latency}ms` : '--'}</div>
                <div>Uptime: {health?.data?.uptime !== undefined ? `${health.data.uptime}s` : '--'}</div>
              </div>
            </div>

            {/* Database */}
            <div className={`p-4 rounded-xl border ${
              isDbUp 
                ? 'bg-slate-950/60 border-emerald-500/30' 
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">MongoDB Database</span>
                </div>
                {isDbUp ? (
                  <span className="inline-flex items-center space-x-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs text-amber-400">
                    <XCircle className="w-4 h-4" />
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>Host: localhost:27017</div>
                <div>Database: healthbridge</div>
                <div>Status: {health?.data?.database?.status || (isBackendUp ? 'idle' : 'offline')}</div>
              </div>
            </div>

            {/* AI Microservice Status */}
            <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">AI Microservice</span>
                </div>
                <span className="inline-flex items-center space-x-1 text-xs text-teal-400 font-mono">
                  <span>FastAPI :8000</span>
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 font-mono">
                <div>Mode: Local Mock / Deterministic Provider</div>
                <div>Embedding Dimension: 1536</div>
                <div>Vector Store: In-Memory Cosine Index</div>
                <div>Tool Boundary: Express Authoritative Gateway</div>
              </div>
            </div>

            {/* Platform Governance Summary */}
            <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Security Invariants</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Zero-PHI audit log sanitization active</li>
                <li>Dynamic real-time consent enforcement</li>
                <li>Administrative clinical exclusion enforced</li>
                <li>Bounded multi-step agent timeouts active</li>
              </ul>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            HealthBridge Portfolio Verification Panel
          </div>

        </div>
      </div>
    </div>
  );
}
