import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { fetchMyHospitalMemberships } from '../services/api';
import JoinHospitalModal from './JoinHospitalModal';

const MEMBERSHIP_STATUS_STYLES = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  INACTIVE: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export default function HospitalMembershipList({ currentUser, onNavigateToProfile }) {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const loadMemberships = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchMyHospitalMemberships();
      setMemberships(list || []);
    } catch (err) {
      if (err.code === 'PATIENT_PROFILE_NOT_FOUND') {
        setError('PROFILE_REQUIRED');
      } else {
        setError(err.message || 'Failed to load hospital memberships');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberships();
  }, []);

  const handleMembershipCreated = (newMembership) => {
    setMemberships((prev) => [newMembership, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
        <span className="text-sm">Loading hospital memberships...</span>
      </div>
    );
  }

  if (error === 'PROFILE_REQUIRED') {
    return (
      <div className="p-8 border border-dashed border-slate-700 rounded-2xl bg-slate-900/50 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-white">Patient Profile Required</h3>
          <p className="text-xs text-slate-400">
            You must create your Patient Profile before requesting membership to participating hospitals.
          </p>
        </div>
        {onNavigateToProfile && (
          <button
            onClick={onNavigateToProfile}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            Go to Patient Profile
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <span>My Hospital Memberships</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Healthcare organizations linked to your verified patient identity.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadMemberships}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh memberships"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Join Another Hospital</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {memberships.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-700 rounded-2xl bg-slate-900/40 text-center space-y-4">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Hospital Memberships</h3>
            <p className="text-xs text-slate-400">
              You haven't requested membership at any hospital yet. Connect with approved hospitals in the network to enable coordinated care.
            </p>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Join a Hospital</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((membership) => {
            const hospital = membership.hospital;
            const statusStyle =
              MEMBERSHIP_STATUS_STYLES[membership.status] || MEMBERSHIP_STATUS_STYLES.PENDING;

            return (
              <div
                key={membership.id}
                className="p-5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white leading-tight">
                      {hospital?.name || 'Hospital'}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 text-teal-300 rounded border border-slate-800">
                        {hospital?.hospitalCode || 'HOSP-CODE'}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                        Hospital: {hospital?.status}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                    {membership.status}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-400/80 shrink-0" />
                  <span>
                    {[hospital?.address?.city, hospital?.address?.state, hospital?.address?.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      Requested:{' '}
                      {membership.createdAt
                        ? new Date(membership.createdAt).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>

                  {membership.joinedAt && (
                    <div className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Joined: {new Date(membership.joinedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <JoinHospitalModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        existingMemberships={memberships}
        onMembershipCreated={handleMembershipCreated}
      />
    </div>
  );
}
