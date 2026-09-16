import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  User,
  FileText,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  createAppointment,
  fetchHospitals,
  fetchAssignments,
  fetchMyPatientProfile,
  fetchMyDoctorProfile,
} from '../services/api';

export default function CreateAppointmentModal({ isOpen, onClose, currentUser, onCreated }) {
  const [hospitals, setHospitals] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isPatient = currentUser?.role === 'PATIENT';
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isAdmin = currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'SYSTEM_ADMIN';

  // Get minimum date (today in local YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    const loadContext = async () => {
      setLoadingInitial(true);
      try {
        const [hospList, assignList] = await Promise.all([
          fetchHospitals().catch(() => []),
          fetchAssignments({ status: 'ACTIVE' }).catch(() => []),
        ]);

        const approvedHospitals = (hospList || []).filter((h) => h.status === 'APPROVED');
        setHospitals(approvedHospitals);
        setAssignments(assignList || []);

        if (isPatient) {
          const pProfile = await fetchMyPatientProfile().catch(() => null);
          setPatientProfile(pProfile);
          if (pProfile) setSelectedPatientId(pProfile._id || pProfile.id);

          // If there are active assignments for this patient, select the first hospital & doctor
          if (assignList && assignList.length > 0) {
            const firstAssign = assignList[0];
            const hId = firstAssign.hospital?._id || firstAssign.hospital?.id || firstAssign.hospital;
            const dId = firstAssign.doctor?._id || firstAssign.doctor?.id || firstAssign.doctor;
            if (hId) setSelectedHospitalId(hId);
            if (dId) setSelectedDoctorId(dId);
          } else if (approvedHospitals.length > 0) {
            setSelectedHospitalId(approvedHospitals[0].id || approvedHospitals[0]._id);
          }
        } else if (isDoctor) {
          const dProfile = await fetchMyDoctorProfile().catch(() => null);
          setDoctorProfile(dProfile);
          if (dProfile) setSelectedDoctorId(dProfile._id || dProfile.id);

          if (assignList && assignList.length > 0) {
            const firstAssign = assignList[0];
            const hId = firstAssign.hospital?._id || firstAssign.hospital?.id || firstAssign.hospital;
            const pId = firstAssign.patient?._id || firstAssign.patient?.id || firstAssign.patient;
            if (hId) setSelectedHospitalId(hId);
            if (pId) setSelectedPatientId(pId);
          } else if (approvedHospitals.length > 0) {
            setSelectedHospitalId(approvedHospitals[0].id || approvedHospitals[0]._id);
          }
        } else if (isAdmin) {
          if (approvedHospitals.length > 0) {
            const userHosp = approvedHospitals.find(
              (h) => (h.admin === currentUser?.id || h.admin?.id === currentUser?.id)
            );
            const targetHosp = userHosp || approvedHospitals[0];
            setSelectedHospitalId(targetHosp.id || targetHosp._id);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load scheduling data');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadContext();
  }, [isOpen, currentUser, isPatient, isDoctor, isAdmin]);

  // Compute available doctors for selected hospital
  const availableDoctors = React.useMemo(() => {
    if (!selectedHospitalId) return [];
    // From active assignments at this hospital
    const docsMap = new Map();
    assignments
      .filter((a) => {
        const hId = (a.hospital?._id || a.hospital?.id || a.hospital || '').toString();
        return hId === selectedHospitalId.toString();
      })
      .forEach((a) => {
        const d = a.doctor;
        if (d && (d._id || d.id)) {
          const id = d._id || d.id;
          if (!docsMap.has(id.toString())) {
            docsMap.set(id.toString(), d);
          }
        }
      });
    return Array.from(docsMap.values());
  }, [assignments, selectedHospitalId]);

  // Compute available patients for selected doctor & hospital
  const availablePatients = React.useMemo(() => {
    if (!selectedHospitalId) return [];
    const patsMap = new Map();
    assignments
      .filter((a) => {
        const hId = (a.hospital?._id || a.hospital?.id || a.hospital || '').toString();
        const dId = (a.doctor?._id || a.doctor?.id || a.doctor || '').toString();
        const matchHosp = hId === selectedHospitalId.toString();
        const matchDoc = !selectedDoctorId || dId === selectedDoctorId.toString();
        return matchHosp && matchDoc;
      })
      .forEach((a) => {
        const p = a.patient;
        if (p && (p._id || p.id)) {
          const id = p._id || p.id;
          if (!patsMap.has(id.toString())) {
            patsMap.set(id.toString(), p);
          }
        }
      });
    return Array.from(patsMap.values());
  }, [assignments, selectedHospitalId, selectedDoctorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedHospitalId) {
      setError('Please select an approved hospital');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please select an active physician');
      return;
    }
    if (!selectedPatientId) {
      setError('Please select an assigned patient');
      return;
    }
    if (!appointmentDate) {
      setError('Please select an appointment date');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please provide start and end times');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be strictly after start time');
      return;
    }

    setSubmitting(true);
    try {
      const newAppt = await createAppointment({
        hospitalId: selectedHospitalId,
        doctorId: selectedDoctorId,
        patientId: selectedPatientId,
        appointmentDate,
        startTime,
        endTime,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      if (onCreated) onCreated(newAppt);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isPatient ? 'Request Clinical Appointment' : 'Schedule Appointment'}
              </h2>
              <p className="text-xs text-slate-400">
                {isPatient
                  ? 'Book a visit with your assigned physician (requires doctor confirmation)'
                  : 'Directly schedule a confirmed clinical consultation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loadingInitial ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">Loading clinical directories & assignments...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            {assignments.length === 0 && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  Note: HealthBridge enforces active doctor-patient assignments. Make sure an active clinical assignment exists before scheduling.
                </p>
              </div>
            )}

            {/* Hospital Selection */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Hospital Facility
              </label>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="">Select Hospital</option>
                {hospitals.map((h) => (
                  <option key={h.id || h._id} value={h.id || h._id}>
                    {h.name} ({h.hospitalCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                Attending Doctor
              </label>
              {isDoctor ? (
                <div className="px-3.5 py-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-slate-200 text-sm">
                  {doctorProfile?.fullName || currentUser?.name} ({doctorProfile?.specialization || 'Attending Physician'})
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select Doctor</option>
                  {availableDoctors.length > 0 ? (
                    availableDoctors.map((doc) => (
                      <option key={doc._id || doc.id} value={doc._id || doc.id}>
                        {doc.fullName} — {doc.specialization}
                      </option>
                    ))
                  ) : (
                    assignments.map((a) => (
                      <option key={a.doctor?._id || a.doctor?.id} value={a.doctor?._id || a.doctor?.id}>
                        {a.doctor?.fullName || 'Assigned Doctor'} — {a.doctor?.specialization || a.department}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Patient Selection */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Patient
              </label>
              {isPatient ? (
                <div className="px-3.5 py-2.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-slate-200 text-sm">
                  {patientProfile?.patientId || 'Patient'} ({currentUser?.name || 'Self'})
                </div>
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select Patient</option>
                  {availablePatients.length > 0 ? (
                    availablePatients.map((pat) => (
                      <option key={pat._id || pat.id} value={pat._id || pat.id}>
                        {pat.patientId} {pat.user?.name ? `(${pat.user.name})` : ''}
                      </option>
                    ))
                  ) : (
                    assignments.map((a) => (
                      <option key={a.patient?._id || a.patient?.id} value={a.patient?._id || a.patient?.id}>
                        {a.patient?.patientId || 'Assigned Patient'} {a.patient?.user?.name ? `(${a.patient.user.name})` : ''}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Reason for Appointment
              </label>
              <input
                type="text"
                placeholder="e.g. Routine cardiology follow-up, lab test review"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Preparation Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Special instructions or clinical preparation notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {isPatient ? 'Submit Appointment Request' : 'Confirm & Schedule Appointment'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
