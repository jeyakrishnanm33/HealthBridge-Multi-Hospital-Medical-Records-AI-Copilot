import React from 'react';
import { HeartPulse, Lock, Activity, Menu, X } from 'lucide-react';
import NotificationCenter from '../NotificationCenter';

export default function Navbar({
  user,
  authLoading,
  onOpenAuth,
  onLogout,
  health,
  healthLoading,
  onOpenHealthDrawer,
  isSidebarOpen,
  onToggleSidebar,
}) {
  const isBackendUp = health?.connected;
  const isDbUp = health?.data?.database?.connected;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">
                  HealthBridge
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Portfolio Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multi-Hospital Medical Records & Clinical AI Copilot
              </p>
            </div>
          </div>
        </div>

        {/* Right: Telemetry pill, Notifications, Profile & Sign in/out */}
        <div className="flex items-center space-x-3">
          
          {/* System Health Drawer Trigger */}
          <button
            onClick={onOpenHealthDrawer}
            className="hidden md:inline-flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/80 transition-colors"
            title="Open System Health Diagnostics"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendUp && isDbUp
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-medium">
              {isBackendUp ? 'API Operational' : 'Awaiting Connection'}
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {authLoading ? (
            <div className="text-xs text-slate-500 font-mono">Verifying...</div>
          ) : user ? (
            <div className="flex items-center space-x-3">
              <NotificationCenter user={user} />

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
