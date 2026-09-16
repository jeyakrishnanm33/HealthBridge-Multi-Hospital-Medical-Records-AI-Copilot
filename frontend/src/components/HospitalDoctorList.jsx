import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Building2,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  Clock,
  Briefcase,
  FileBadge,
} from 'lucide-react';
import {
  fetchHospitals,
  fetchHospitalDoctors,
  updateDoctorAffiliationStatus,
} from '../services/api';

const STATUS_BADGES = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  SUSPENDED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export default function HospitalDoctorList({ currentUser }) {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [affiliations, setAffiliations] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingAffiliations, setLoadingAffiliations] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Load accessible hospitals
  useEffect(() => {
    const loadHospitalsList = async () => {
      setLoadingHospitals(true);
      setError('');
      try {
        const list = await fetchHospitals();
        setHospitals(list || []);

        if (list && list.length > 0) {
          // If current user is HOSPITAL_ADMIN, find their administered hospital or default to first
          const administeredHospital = list.find(
            (h) =>
              (h.admin && (h.admin === currentUser?.id || h.admin?.id === currentUser?.id)) ||
              (h.registeredBy && (h.registeredBy === currentUser?.id || h.registeredBy?.id === currentUser?.id))
          );
          setSelectedHospitalId(administeredHospital ? administeredHospital.id : list[0].id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load hospitals list');
      } finally {
        setLoadingHospitals(false);
      }
    };

    loadHospitalsList();
  }, [currentUser]);

  // 2. Load doctors for selected hospital
  const loadHospitalDoctors = async () => {
    if (!selectedHospitalId) return;

    setLoadingAffiliations(true);
    setError('');
    try {
      const data = await fetchHospitalDoctors(selectedHospitalId);
      setAffiliations(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load affiliated doctors');
    } finally {
      setLoadingAffiliations(false);
    }
  };

  useEffect(() => {
    loadHospitalDoctors();
  }, [selectedHospitalId]);

  // 3. Handle state machine transitions
  const handleStatusUpdate = async (affiliationId, newStatus) => {
    setActionLoadingId(affiliationId);
    setError('');
    setSuccessMessage('');

    try {
      const updatedAffiliation = await updateDoctorAffiliationStatus(
        selectedHospitalId,
        affiliationId,
        newStatus
      );

      setAffiliations((prev) =>
        prev.map((aff) => (aff.id === affiliationId ? updatedAffiliation : aff))
      );

      setSuccessMessage(`Doctor affiliation status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || `Failed to update status to ${newStatus}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <span>Hospital Doctor Affiliations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage clinical credentialing, affiliations, and status transitions for practicing doctors.
          </p>
        </div>

        {/* Hospital Selector for Admins */}
        <div className="flex items-center space-x-3">
          {loadingHospitals ? (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>Loading facilities...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.hospitalCode}) — {h.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadHospitalDoctors}
            disabled={loadingAffiliations || !selectedHospitalId}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700/60 disabled:opacity-50"
            title="Refresh doctor list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAffiliations ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hospital Warning if unapproved */}
      {selectedHospital && selectedHospital.status !== 'APPROVED' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center space-x-3 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            This hospital is currently in <strong>{selectedHospital.status}</strong> status. Only APPROVED hospitals can admit active clinical affiliations.
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Affiliated Doctors Table / Cards */}
      {loadingAffiliations ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
          <span className="text-sm">Loading affiliated clinicians...</span>
        </div>
      ) : affiliations.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Doctor Affiliations Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No doctors have requested affiliation with {selectedHospital?.name || 'this hospital'} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {affiliations.map((aff) => {
            const doc = aff.doctor || {};
            const user = doc.user || {};
            const isProcessing = actionLoadingId === aff.id;

            return (
              <div
                key={aff.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4 hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Doctor Info */}
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-base shrink-0">
                      {doc.fullName ? doc.fullName.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{doc.fullName || 'Doctor'}</h4>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            STATUS_BADGES[aff.status] || STATUS_BADGES.PENDING
                          }`}
                        >
                          Affiliation: {aff.status}
                        </span>
                        {doc.status && (
                          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                            Profile: {doc.status}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="text-teal-400 font-medium">
                          {doc.specialization || 'General Practice'}
                        </span>
                        {aff.department && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">Dept: {aff.department}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-slate-300 flex items-center space-x-1">
                          <FileBadge className="w-3 h-3 text-slate-500" />
                          <span>{doc.medicalLicenseNumber || '—'}</span>
                        </span>
                        <span>•</span>
                        <span>{doc.yearsOfExperience || 0} yrs exp</span>
                      </div>

                      {/* Qualifications Tags */}
                      {Array.isArray(doc.qualifications) && doc.qualifications.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {doc.qualifications.map((q, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / State Machine Transitions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                    {aff.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(aff.id, 'ACTIVE')}
                          disabled={isProcessing || (selectedHospital && selectedHospital.status !== 'APPROVED')}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleStatusUpdate(aff.id, 'REJECTED')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {aff.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleStatusUpdate(aff.id, 'SUSPENDED')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertOctagon className="w-3.5 h-3.5" />
                        )}
                        <span>Suspend</span>
                      </button>
                    )}

                    {(aff.status === 'REJECTED' || aff.status === 'SUSPENDED') && (
                      <span className="text-[11px] text-slate-500 italic bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/60">
                        Terminal Status ({aff.status})
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-4">
                    <span>
                      User: <strong className="text-slate-300 font-normal">{user.name || user.email || '—'}</strong>
                    </span>
                    <span>
                      Phone: <strong className="text-slate-300 font-normal">{doc.phone || '—'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span>
                      Requested: {aff.requestedAt ? new Date(aff.requestedAt).toLocaleDateString() : '—'}
                    </span>
                    {aff.approvedAt && (
                      <span>
                        Decided: {new Date(aff.approvedAt).toLocaleDateString()}
                        {aff.approvedBy?.name ? ` by ${aff.approvedBy.name}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
