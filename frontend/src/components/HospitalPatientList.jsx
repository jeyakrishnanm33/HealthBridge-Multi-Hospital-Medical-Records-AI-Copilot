import React, { useState, useEffect } from 'react';
import {
  Users,
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
} from 'lucide-react';
import { fetchHospitals, fetchHospitalMemberships, updateMembershipStatus } from '../services/api';

const STATUS_BADGES = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  INACTIVE: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export default function HospitalPatientList({ currentUser }) {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [memberships, setMemberships] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
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

  // 2. Load memberships when hospital selected
  const loadMemberships = async (hospitalId) => {
    if (!hospitalId) return;
    setLoadingMemberships(true);
    setError('');
    try {
      const data = await fetchHospitalMemberships(hospitalId);
      setMemberships(data || []);
    } catch (err) {
      if (err.code === 'HOSPITAL_ACCESS_FORBIDDEN' || err.code === 'FORBIDDEN') {
        setError('You are not authorized to view or manage memberships for this hospital.');
      } else {
        setError(err.message || 'Failed to load hospital memberships');
      }
      setMemberships([]);
    } finally {
      setLoadingMemberships(false);
    }
  };

  useEffect(() => {
    if (selectedHospitalId) {
      loadMemberships(selectedHospitalId);
    }
  }, [selectedHospitalId]);

  // 3. Handle state machine status transitions
  const handleStatusTransition = async (membershipId, newStatus) => {
    setActionLoadingId(`${membershipId}-${newStatus}`);
    setError('');
    setSuccessMessage('');

    try {
      const updated = await updateMembershipStatus(selectedHospitalId, membershipId, newStatus);
      setSuccessMessage(`Membership successfully updated to ${newStatus}.`);

      // Update in local state
      setMemberships((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, ...updated } : m))
      );
    } catch (err) {
      setError(err.message || `Failed to transition status to ${newStatus}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div className="space-y-6">
      {/* Top Header & Hospital Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Patient Memberships Administration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage patient admission, approvals, rejections, and membership lifecycles for your hospital.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {hospitals.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Hospital:</span>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.hospitalCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => loadMemberships(selectedHospitalId)}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMemberships ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Content Table / List */}
      {loadingMemberships || loadingHospitals ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400 mr-2" />
          <span className="text-xs">Loading patient memberships...</span>
        </div>
      ) : memberships.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Patient Memberships Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no patient membership requests or records associated with {selectedHospital?.name || 'this hospital'}.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">Demographics</th>
                  <th className="px-4 py-3">Requested / Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {memberships.map((membership) => {
                  const patient = membership.patient || {};
                  const user = patient.user || {};
                  const status = membership.status;
                  const statusClass = STATUS_BADGES[status] || STATUS_BADGES.PENDING;

                  const isPending = status === 'PENDING';
                  const isActive = status === 'ACTIVE';

                  return (
                    <tr key={membership.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Patient ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-teal-400 bg-slate-950 px-2 py-0.5 rounded border border-teal-500/20">
                          {patient.patientId || 'N/A'}
                        </span>
                      </td>

                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{user.name || 'Unnamed Patient'}</div>
                        <div className="text-[11px] text-slate-400">{user.email || '—'}</div>
                      </td>

                      {/* Demographics */}
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        <div>
                          <span className="text-slate-400">Gender: </span>
                          <span className="font-medium">{patient.gender || '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          DOB:{' '}
                          {patient.dateOfBirth
                            ? new Date(patient.dateOfBirth).toLocaleDateString()
                            : '—'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-400">
                        <div>
                          Req:{' '}
                          {membership.createdAt
                            ? new Date(membership.createdAt).toLocaleDateString()
                            : '—'}
                        </div>
                        {membership.joinedAt && (
                          <div className="text-emerald-400 font-medium">
                            Joined: {new Date(membership.joinedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                          {status}
                        </span>
                      </td>

                      {/* Actions according to authoritative state machine */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isPending && (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleStatusTransition(membership.id, 'ACTIVE')}
                              disabled={actionLoadingId !== null}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1 disabled:opacity-50"
                            >
                              {actionLoadingId === `${membership.id}-ACTIVE` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleStatusTransition(membership.id, 'REJECTED')}
                              disabled={actionLoadingId !== null}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1 disabled:opacity-50"
                            >
                              {actionLoadingId === `${membership.id}-REJECTED` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {isActive && (
                          <button
                            onClick={() => handleStatusTransition(membership.id, 'INACTIVE')}
                            disabled={actionLoadingId !== null}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-all inline-flex items-center space-x-1 disabled:opacity-50"
                          >
                            {actionLoadingId === `${membership.id}-INACTIVE` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <AlertOctagon className="w-3 h-3 text-amber-400" />
                            )}
                            <span>Deactivate</span>
                          </button>
                        )}

                        {!isPending && !isActive && (
                          <span className="text-[11px] text-slate-500 italic">Terminal State</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
