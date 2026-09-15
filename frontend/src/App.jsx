import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  ArrowRight,
  Layers,
  HeartPulse
} from 'lucide-react';
import { checkBackendHealth } from './services/api';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const isBackendUp = health?.connected;
  const isDbUp = health?.data?.database?.connected;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation / Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent">
                HealthBridge
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Phase 1: Foundation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${isBackendUp && isDbUp ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isBackendUp ? 'System Operational' : 'Awaiting Connection'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-10">
        
        {/* Hero Section */}
        <section className="text-center sm:text-left space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Layers className="w-3.5 h-3.5" />
            <span>Monorepo Architecture Foundation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Centralized Multi-Hospital Platform <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              & Authorization-Aware AI Copilot
            </span>
          </h1>
          <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
            HealthBridge provides consent-governed longitudinal patient record access across healthcare institutions, with fine-grained authorization and auditable AI assistance.
          </p>
        </section>

        {/* Live Stack Health Check Card */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-teal-400" />
                  <span>Full-Stack Health Status</span>
                </h2>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  GET /api/health
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time end-to-end communication test between React frontend, Express API, and MongoDB.
              </p>
            </div>

            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white transition-all shadow-md shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Pinging...' : 'Refresh Status'}</span>
            </button>
          </div>

          {/* Status Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Express Backend Card */}
            <div className={`p-5 rounded-xl border transition-all ${
              isBackendUp 
                ? 'bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Backend API</span>
                </div>
                {isBackendUp ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
              <div className="text-lg font-bold text-white">
                {isBackendUp ? 'Connected' : 'Unavailable'}
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                <div>Service: {health?.data?.service || 'healthbridge-api'}</div>
                <div>Latency: {health?.latency !== undefined ? `${health.latency}ms` : '--'}</div>
                {health?.error && (
                  <div className="text-rose-400 truncate" title={health.error}>Error: {health.error}</div>
                )}
              </div>
            </div>

            {/* MongoDB Card */}
            <div className={`p-5 rounded-xl border transition-all ${
              isDbUp 
                ? 'bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Database</span>
                </div>
                {isDbUp ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="text-lg font-bold text-white">
                {isDbUp ? 'MongoDB Connected' : 'Disconnected'}
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                <div>Engine: Mongoose ODM</div>
                <div>Status: {health?.data?.database?.status || (isBackendUp ? 'idle' : 'offline')}</div>
              </div>
            </div>

            {/* Application Runtime Card */}
            <div className="p-5 rounded-xl border bg-slate-800/40 border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Environment</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-teal-300 font-mono">
                  v{health?.data?.version || '0.1.0'}
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                Node.js + Vite
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                <div>Uptime: {health?.data?.uptime !== undefined ? `${health.data.uptime}s` : '--'}</div>
                <div>Updated: {lastUpdated || 'Checking...'}</div>
              </div>
            </div>

          </div>

          {/* Raw JSON inspection toggle */}
          {health?.data && (
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <details className="text-xs text-slate-400 cursor-pointer group">
                <summary className="font-mono text-slate-400 hover:text-teal-300 transition-colors list-none flex items-center space-x-1.5">
                  <span className="text-teal-400 font-bold">›</span>
                  <span>View Raw Endpoint Response Payload</span>
                </summary>
                <pre className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-teal-300 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(health.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>

        {/* Architecture Layers Overview */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span>Architecture Roadmap & Phase Breakdown</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Phase 1 (Active) */}
            <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/20 relative">
              <div className="text-xs font-bold text-teal-400 mb-1 flex items-center justify-between">
                <span>PHASE 1</span>
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-[10px] text-teal-300">ACTIVE</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Foundation</h4>
              <p className="text-xs text-slate-400 mt-1.5">
                Monorepo structure, Express API, MongoDB connection, Tailwind CSS, error handling & health checks.
              </p>
            </div>

            {/* Phase 2 */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-xs font-bold text-slate-500 mb-1">PHASE 2</div>
              <h4 className="font-semibold text-slate-300 text-sm">Auth & Identities</h4>
              <p className="text-xs text-slate-500 mt-1.5">
                JWT authentication, User & Hospital models, role boundaries (System Admin, Doctor, Patient).
              </p>
            </div>

            {/* Phase 3 */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-xs font-bold text-slate-500 mb-1">PHASE 3</div>
              <h4 className="font-semibold text-slate-300 text-sm">Consent & Sharing</h4>
              <p className="text-xs text-slate-500 mt-1.5">
                Time-limited patient consent, access requests, cross-hospital record sharing, discriminator schemas.
              </p>
            </div>

            {/* Phase 4 */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-xs font-bold text-slate-500 mb-1">PHASE 4+</div>
              <h4 className="font-semibold text-slate-300 text-sm">AI Copilot & RAG</h4>
              <p className="text-xs text-slate-500 mt-1.5">
                Authorization-aware retrieval, grounded clinical summaries, citation guardrails, and audit logging.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            HealthBridge Engineering Portfolio Project • <span className="text-slate-400">Phase 1 Foundation</span>
          </div>
          <div className="text-slate-500">
            Source of Truth: AI HealthConnect Requirements Document
          </div>
        </div>
      </footer>
    </div>
  );
}
