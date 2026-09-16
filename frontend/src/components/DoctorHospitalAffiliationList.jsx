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
  Stethoscope,
} from 'lucide-react';
import { fetchMyDoctorAffiliations } from '../services/api';
import JoinHospitalAffiliationModal from './JoinHospitalAffiliationModal';

const STATUS_BADGES = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  SUSPENDED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export default function DoctorHospitalAffiliationList({ currentUser, onNavigateToProfile }) {
  const [affiliations, setAffiliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const loadAffiliations = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchMyDoctorAffiliations();
      setAffiliations(list || []);
    } catch (err) {
      if (err.code === 'DOCTOR_PROFILE_NOT_FOUND') {
        setError('PROFILE_REQUIRED');
      } else {
        setError(err.message || 'Failed to load hospital affiliations');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliations();
  }, []);

  const handleAffiliationCreated = (newAffiliation) => {
    setAffiliations((prev) => [newAffiliation, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
        <span className="text-sm">Loading hospital affiliations...</span>
      </div>
    );
  }

  if (error === 'PROFILE_REQUIRED') {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Doctor Profile Required</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          You must set up your clinical credentials and medical license before requesting affiliations with hospitals.
        </p>
        <button
          onClick={onNavigateToProfile}
          className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20"
        >
          <Stethoscope className="w-4 h-4" />
          <span>Go to Doctor Profile</span>
        </button>
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
            <span>My Hospital Affiliations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hospitals and clinical institutions where you practice and maintain clinical privileges.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAffiliations}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700/60"
            title="Refresh affiliations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Affiliation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {affiliations.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Hospital Affiliations Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            You have not requested affiliation with any hospital in the HealthBridge network.
            Request affiliation with an approved hospital to begin clinical consultations.
          </p>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Request Hospital Affiliation</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {affiliations.map((aff) => {
            const hosp = aff.hospital || {};
            const statusStyle = STATUS_BADGES[aff.status] || STATUS_BADGES.PENDING;

            return (
              <div
                key={aff.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{hosp.name || 'Hospital'}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {hosp.hospitalCode || '—'}
                        </span>
                        {aff.department && (
                          <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                            {aff.department}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${statusStyle} shrink-0`}
                    >
                      {aff.status}
                    </span>
                  </div>

                  {hosp.address && (
                    <div className="flex items-center space-x-1 text-xs text-slate-400 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="line-clamp-1">
                        {hosp.address.city}, {hosp.address.state}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Requested:</span>
                    </span>
                    <span className="text-slate-300 font-medium">
                      {aff.requestedAt ? new Date(aff.requestedAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {aff.approvedAt && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Decision Date:</span>
                      </span>
                      <span className="text-slate-300 font-medium">
                        {new Date(aff.approvedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <JoinHospitalAffiliationModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        existingAffiliations={affiliations}
        onAffiliationCreated={handleAffiliationCreated}
      />
    </div>
  );
}
