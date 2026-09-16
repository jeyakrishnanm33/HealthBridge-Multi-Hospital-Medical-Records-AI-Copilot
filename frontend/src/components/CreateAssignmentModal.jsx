import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Stethoscope,
  User,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  fetchHospitalDoctors,
  fetchHospitalMemberships,
  createDoctorPatientAssignment,
} from '../services/api';

export default function CreateAssignmentModal({
  isOpen,
  onClose,
  hospital,
  onAssignmentCreated,
}) {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingPrereqs, setLoadingPrereqs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !hospital?.id) return;

    const loadPrerequisites = async () => {
      setLoadingPrereqs(true);
      setError('');
      try {
        const [docAffiliations, patientMemberships] = await Promise.all([
          fetchHospitalDoctors(hospital.id),
          fetchHospitalMemberships(hospital.id),
        ]);

        // Filter active affiliated doctors
        const activeDocs = (docAffiliations || [])
          .filter(
            (a) =>
              a.status === 'ACTIVE' &&
              a.doctor &&
              (a.doctor.status === 'ACTIVE' || !a.doctor.status)
          )
          .map((a) => a.doctor);

        // Filter active member patients
        const activePatients = (patientMemberships || [])
          .filter((m) => m.status === 'ACTIVE' && m.patient)
          .map((m) => m.patient);

        setDoctors(activeDocs);
        setPatients(activePatients);

        if (activeDocs.length > 0) setSelectedDoctorId(activeDocs[0].id || activeDocs[0]._id);
        if (activePatients.length > 0) setSelectedPatientId(activePatients[0].id || activePatients[0]._id);
      } catch (err) {
        setError(err.message || 'Failed to load facility practitioners or patients');
      } finally {
        setLoadingPrereqs(false);
      }
    };

    loadPrerequisites();
    setNotes('');
  }, [isOpen, hospital]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedPatientId) {
      setError('Please select both an affiliated doctor and an enrolled patient');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const newAssignment = await createDoctorPatientAssignment({
        hospitalId: hospital.id,
        doctorId: selectedDoctorId,
        patientId: selectedPatientId,
        notes: notes.trim(),
      });

      if (onAssignmentCreated) {
        onAssignmentCreated(newAssignment);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create doctor-patient assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Assign Doctor to Patient</h3>
            <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
              <span>Facility:</span>
              <strong className="text-teal-400 font-medium">{hospital?.name}</strong>
              <span className="font-mono text-slate-500">({hospital?.hospitalCode})</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2.5 text-rose-300 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loadingPrereqs ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            <span>Checking active affiliations & enrollments...</span>
          </div>
        ) : doctors.length === 0 || patients.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <div className="text-xs text-slate-300 space-y-1">
              {doctors.length === 0 && (
                <p>• No doctors currently hold an <strong>ACTIVE</strong> affiliation with this facility.</p>
              )}
              {patients.length === 0 && (
                <p>• No patients currently hold an <strong>ACTIVE</strong> membership with this facility.</p>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Prerequisites must be approved before clinical assignments can be established.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Doctor Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                <span>Select Attending Doctor</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                {doctors.map((doc) => (
                  <option key={doc.id || doc._id} value={doc.id || doc._id}>
                    {doc.fullName} — {doc.specialization} ({doc.medicalLicenseNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Patient Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Select Enrolled Patient</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              >
                {patients.map((pat) => (
                  <option key={pat.id || pat._id} value={pat.id || pat._id}>
                    {pat.patientId} — {pat.user?.name || pat.gender || 'Patient'}
                  </option>
                ))}
              </select>
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Assignment Context / Notes <span className="text-slate-500 font-normal">(optional)</span></span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Primary attending physician for diagnosis workup and routine follow-up"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Assignment</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
