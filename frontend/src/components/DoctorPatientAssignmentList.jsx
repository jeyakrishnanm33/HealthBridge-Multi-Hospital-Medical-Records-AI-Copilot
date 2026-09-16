import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  Stethoscope,
  User,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  StopCircle,
} from 'lucide-react';
import {
  fetchHospitals,
  fetchAssignments,
  endDoctorPatientAssignment,
} from '../services/api';
import CreateAssignmentModal from './CreateAssignmentModal';

const STATUS_BADGES = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  ENDED: 'bg-slate-500/10 text-slate-400 border-slate-700/50',
};

export default function DoctorPatientAssignmentList({ currentUser }) {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ENDED'
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isPatient = currentUser?.role === 'PATIENT';

  // 1. Load accessible hospitals for admin
  useEffect(() => {
    if (!isAdmin) return;

    const loadHospitals = async () => {
      try {
        const list = await fetchHospitals();
        setHospitals(list || []);

        if (list && list.length > 0) {
          const userHosp = list.find(
            (h) =>
              (h.admin && (h.admin === currentUser?.id || h.admin?.id === currentUser?.id)) ||
              (h.registeredBy &&
                (h.registeredBy === currentUser?.id || h.registeredBy?.id === currentUser?.id))
          );
          setSelectedHospitalId(userHosp ? userHosp.id : list[0].id);
        }
      } catch (err) {
        console.warn('Failed to load facilities:', err.message);
      }
    };

    loadHospitals();
  }, [currentUser, isAdmin]);

  // 2. Load assignments based on role and filters
  const loadAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (isAdmin && selectedHospitalId) {
        filters.hospitalId = selectedHospitalId;
      }
      if (statusFilter !== 'ALL') {
        filters.status = statusFilter;
      }

      const data = await fetchAssignments(filters);
      setAssignments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !selectedHospitalId) return;
    loadAssignments();
  }, [selectedHospitalId, statusFilter, currentUser]);

  // 3. Handle End Assignment action
  const handleEndAssignment = async (assignmentId) => {
    setActionLoadingId(assignmentId);
    setError('');
    setSuccessMessage('');

    try {
      const updated = await endDoctorPatientAssignment(assignmentId);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? updated : a))
      );
      setSuccessMessage('Doctor-patient assignment ended successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to end assignment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignmentCreated = (newAssignment) => {
    setAssignments((prev) => [newAssignment, ...prev]);
    setSuccessMessage('Doctor-patient assignment established successfully.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-teal-400" />
            <span>
              {isAdmin
                ? 'Doctor–Patient Assignments'
                : isDoctor
                ? 'My Assigned Patients'
                : 'My Attending Doctors'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin
              ? 'Facility-governed clinical relationships between active medical practitioners and enrolled patients.'
              : isDoctor
              ? 'Patients clinically assigned to your care within affiliated healthcare networks.'
              : 'Verified healthcare practitioners assigned to your medical care across facilities.'}
          </p>
        </div>

        {/* Action / Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && hospitals.length > 0 && (
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.hospitalCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="ENDED">Ended Only</option>
          </select>

          <button
            onClick={loadAssignments}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700/60"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Assignment</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Main Assignment Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
          <span className="text-sm">Loading clinical assignments...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Assignments Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            {isAdmin
              ? 'No doctor-patient assignments have been established for this facility.'
              : isDoctor
              ? 'You have not been assigned to any patients at your affiliated facilities yet.'
              : 'You have no assigned attending doctors at this time.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Doctor to Patient</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => {
            const doc = assignment.doctor || {};
            const pat = assignment.patient || {};
            const hosp = assignment.hospital || {};
            const isEnding = actionLoadingId === assignment.id;
            const statusStyle = STATUS_BADGES[assignment.status] || STATUS_BADGES.ACTIVE;

            return (
              <div
                key={assignment.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-all shadow-sm"
              >
                {/* Upper Metadata */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono bg-slate-950 text-teal-300 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                        {hosp.hospitalCode || 'HOSP'}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[200px]">
                        {hosp.name}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${statusStyle} shrink-0`}
                    >
                      {assignment.status}
                    </span>
                  </div>

                  {/* Doctor & Patient Split Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-3">
                    {/* Doctor Section */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] text-teal-400 font-semibold">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Attending Doctor</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">
                        {doc.fullName || 'Doctor'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {doc.specialization || 'Clinical Specialist'}
                      </p>
                    </div>

                    {/* Patient Section */}
                    <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-3">
                      <div className="flex items-center space-x-1.5 text-[11px] text-cyan-400 font-semibold">
                        <User className="w-3.5 h-3.5" />
                        <span>Enrolled Patient</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-white truncate">
                        {pat.patientId || 'PAT-XXXXXX'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {pat.user?.name || pat.gender || 'Patient'}
                      </p>
                    </div>
                  </div>

                  {/* Notes if present */}
                  {assignment.notes && (
                    <div className="flex items-start space-x-2 text-xs text-slate-400 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{assignment.notes}</span>
                    </div>
                  )}
                </div>

                {/* Footer Metadata & Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>
                        Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {assignment.endedAt && (
                      <div className="flex items-center space-x-1 text-slate-500">
                        <StopCircle className="w-3 h-3" />
                        <span>
                          Ended: {new Date(assignment.endedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* End Action (Hospital Admin only for ACTIVE assignments) */}
                  {isAdmin && assignment.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleEndAssignment(assignment.id)}
                      disabled={isEnding}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isEnding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <StopCircle className="w-3.5 h-3.5" />
                      )}
                      <span>End Assignment</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isAdmin && (
        <CreateAssignmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          hospital={selectedHospital}
          onAssignmentCreated={handleAssignmentCreated}
        />
      )}
    </div>
  );
}
