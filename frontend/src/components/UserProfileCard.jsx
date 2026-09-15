import React from 'react';
import { UserCheck, LogOut, Shield, Mail, Key } from 'lucide-react';

export default function UserProfileCard({ user, onLogout }) {
  if (!user) return null;

  const roleColors = {
    PATIENT: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    DOCTOR: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    HOSPITAL_ADMIN: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    SYSTEM_ADMIN: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* User Identity */}
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-md flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${roleColors[user.role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                {user.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
              <span className="flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{user.email}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>ID: {user.id.slice(-8)}</span>
              </span>
              <span className="text-emerald-400">● {user.status}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onLogout}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
