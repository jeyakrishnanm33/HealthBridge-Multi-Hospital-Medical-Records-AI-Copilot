import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  User,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  CalendarCheck,
  CalendarX,
  Filter,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchAppointments,
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  completeAppointment,
  markAppointmentNoShow,
  fetchHospitals,
} from '../services/api';
import CreateAppointmentModal from './CreateAppointmentModal';
import RescheduleAppointmentModal from './RescheduleAppointmentModal';
import AppointmentDetailModal from './AppointmentDetailModal';

const STATUS_BADGES = {
  REQUESTED: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  CONFIRMED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  COMPLETED: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-700/50',
  REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  NO_SHOW: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
};

export default function AppointmentList({ currentUser }) {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitals, setHospitals] = useState([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [rescheduleAppointmentData, setRescheduleAppointmentData] = useState(null);

  const isPatient = currentUser?.role === 'PATIENT';
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isAdmin = currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  // 1. Load hospitals for admins
  useEffect(() => {
    if (!isAdmin) return;
    const loadHospitals = async () => {
      try {
        const list = await fetchHospitals();
        setHospitals(list || []);
      } catch (err) {
        console.warn('Failed to load facilities:', err.message);
      }
    };
    loadHospitals();
  }, [isAdmin]);

  // 2. Load appointments
  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (upcomingOnly) filters.upcoming = 'true';
      if (isAdmin && selectedHospitalId) filters.hospitalId = selectedHospitalId;

      const result = await fetchAppointments(filters);
      setAppointments(result.appointments || []);
      setPagination(result.pagination || { total: 0, page: 1, limit: 20 });
    } catch (err) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, upcomingOnly, selectedHospitalId, currentUser]);

  // Actions
  const handleConfirm = async (id) => {
    setActionLoadingId(id);
    setError('');
    try {
      await confirmAppointment(id);
      setSuccessMessage('Appointment confirmed successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to confirm appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter reason for rejecting this appointment request:');
    if (reason === null) return;

    setActionLoadingId(id);
    setError('');
    try {
      await rejectAppointment(id, reason);
      setSuccessMessage('Appointment request rejected');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to reject appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Enter reason for cancelling this appointment:');
    if (reason === null) return;

    setActionLoadingId(id);
    setError('');
    try {
      await cancelAppointment(id, reason);
      setSuccessMessage('Appointment cancelled');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoadingId(id);
    setError('');
    try {
      await completeAppointment(id);
      setSuccessMessage('Appointment marked as completed');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to complete appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNoShow = async (id) => {
    if (!window.confirm('Mark this appointment as no-show?')) return;

    setActionLoadingId(id);
    setError('');
    try {
      await markAppointmentNoShow(id);
      setSuccessMessage('Appointment marked as no-show');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats computation
  const requestedCount = appointments.filter((a) => a.status === 'REQUESTED').length;
  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Clinical Appointments</h1>
            <p className="text-xs text-slate-400">
              {isPatient
                ? 'Manage your scheduled consultations with attending physicians'
                : isDoctor
                ? 'Manage your clinical appointment calendar and patient visits'
                : 'Facility-wide appointment monitoring and scheduling management'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAppointments}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            {isPatient ? 'Request Appointment' : 'Schedule Appointment'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Pending Requests
          </div>
          <div className="text-2xl font-bold text-white">{requestedCount}</div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4" />
            Confirmed Visits
          </div>
          <div className="text-2xl font-bold text-white">{confirmedCount}</div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Completed
          </div>
          <div className="text-2xl font-bold text-white">{completedCount}</div>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            Total Listed
          </div>
          <div className="text-2xl font-bold text-white">{pagination.total || appointments.length}</div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
              className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
            />
            Upcoming Only
          </label>

          {isAdmin && hospitals.length > 0 && (
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Facilities</option>
              {hospitals.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm">Loading appointment records...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl text-center">
          <div className="p-3 bg-slate-800/60 rounded-2xl text-slate-400 mb-3">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white">No Appointments Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            {statusFilter !== 'ALL'
              ? `There are currently no appointments matching status '${statusFilter}'.`
              : 'No clinical appointments have been scheduled yet.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {isPatient ? 'Request New Appointment' : 'Schedule Appointment'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => {
            const apptId = appt.id || appt._id;
            const isActionLoading = actionLoadingId === apptId;
            const badgeClass = STATUS_BADGES[appt.status] || STATUS_BADGES.REQUESTED;
            const apptDateStr = appt.appointmentDate
              ? new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <div
                key={apptId}
                className="group relative flex flex-col justify-between p-5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all duration-200 shadow-sm"
              >
                <div>
                  {/* Top Bar: Date & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-800/80 rounded-xl text-cyan-400 border border-slate-700/60">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{apptDateStr}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {appt.startTime} – {appt.endTime}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-2 py-2 border-y border-slate-800/60 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        Hospital:
                      </span>
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {appt.hospital?.name || 'Hospital Facility'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                        Doctor:
                      </span>
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {appt.doctor?.fullName || 'Physician'}
                        {appt.doctor?.specialization ? ` (${appt.doctor.specialization})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        Patient:
                      </span>
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {appt.patient?.user?.name || appt.patient?.patientId || 'Patient'}
                      </span>
                    </div>

                    {appt.reason && (
                      <div className="pt-1 text-slate-400">
                        <span className="font-medium text-slate-300">Reason: </span>
                        <span className="italic">{appt.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-2">
                  <button
                    onClick={() => setDetailAppointment(appt)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  <div className="flex items-center gap-2">
                    {/* REQUESTED Actions */}
                    {appt.status === 'REQUESTED' && (
                      <>
                        {(isDoctor || isAdmin) && (
                          <>
                            <button
                              onClick={() => handleConfirm(apptId)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                            >
                              {isActionLoading ? '...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => handleReject(apptId)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isPatient && (
                          <button
                            onClick={() => handleCancel(apptId)}
                            disabled={isActionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel Request
                          </button>
                        )}
                      </>
                    )}

                    {/* CONFIRMED Actions */}
                    {appt.status === 'CONFIRMED' && (
                      <>
                        {(isDoctor || isAdmin) && (
                          <>
                            <button
                              onClick={() => handleComplete(apptId)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                            >
                              {isActionLoading ? '...' : 'Complete'}
                            </button>
                            <button
                              onClick={() => handleNoShow(apptId)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Mark as No-Show"
                            >
                              No-Show
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setRescheduleAppointmentData(appt)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(apptId)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        onCreated={() => {
          setSuccessMessage('Appointment created successfully');
          setTimeout(() => setSuccessMessage(''), 4000);
          loadAppointments();
        }}
      />

      <RescheduleAppointmentModal
        isOpen={Boolean(rescheduleAppointmentData)}
        onClose={() => setRescheduleAppointmentData(null)}
        appointment={rescheduleAppointmentData}
        onRescheduled={() => {
          setSuccessMessage('Appointment rescheduled successfully');
          setTimeout(() => setSuccessMessage(''), 4000);
          loadAppointments();
        }}
      />

      <AppointmentDetailModal
        isOpen={Boolean(detailAppointment)}
        onClose={() => setDetailAppointment(null)}
        appointment={detailAppointment}
      />
    </div>
  );
}
