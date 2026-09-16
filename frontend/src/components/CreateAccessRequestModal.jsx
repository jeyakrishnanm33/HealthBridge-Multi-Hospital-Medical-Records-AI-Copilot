import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Building2,
  ShieldCheck,
  FileText,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import {
  fetchHospitals,
  fetchAssignments,
  createAccessRequest,
} from '../services/api';

const AVAILABLE_SCOPES = [
  { id: 'VISITS', label: 'Clinical Visits & Encounters', desc: 'Outpatient, emergency, and consultation records' },
  { id: 'DIAGNOSES', label: 'Diagnostic Assessments', desc: 'Confirmed diagnoses, conditions, and clinical impressions' },
  { id: 'MEDICATIONS', label: 'Medication Regimens', desc: 'Active and past medications, dosages, and administration' },
  { id: 'LAB_RESULTS', label: 'Laboratory Diagnostics', desc: 'Blood panels, biochemistry, pathology, and test readings' },
  { id: 'PRESCRIPTIONS', label: 'Doctor Prescriptions', desc: 'Prescription orders, instructions, and durations' },
  { id: 'DOCUMENTS', label: 'Clinical Documents & Reports', desc: 'Discharge summaries, radiology notes, and scan reports' },
];

const PURPOSES = [
  { id: 'TREATMENT', label: 'Active Treatment & Care' },
  { id: 'EMERGENCY', label: 'Emergency Evaluation' },
  { id: 'REFERRAL', label: 'Specialist Referral / Consultation' },
  { id: 'RESEARCH', label: 'Clinical Review / Research' },
];

export default function CreateAccessRequestModal({
  isOpen,
  onClose,
  onSuccess,
  doctorProfile,
}) {
  const [hospitals, setHospitals] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedRequestingHospitalId, setSelectedRequestingHospitalId] = useState('');
  const [selectedSourceHospitalId, setSelectedSourceHospitalId] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['LAB_RESULTS', 'MEDICATIONS']);
  const [purpose, setPurpose] = useState('TREATMENT');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [allHospitals, assignmentsData] = await Promise.all([
          fetchHospitals({ status: 'APPROVED' }),
          fetchAssignments({ status: 'ACTIVE' }),
        ]);

        setHospitals(allHospitals || []);

        const rawAssignments = Array.isArray(assignmentsData)
          ? assignmentsData
          : assignmentsData?.assignments || [];

        const validAssignments = rawAssignments.filter(
          (a) => a.status === 'ACTIVE' && a.patient
        );
        setAssignedPatients(validAssignments);

        if (validAssignments.length > 0) {
          const first = validAssignments[0];
          setSelectedPatientId(first.patient.id || first.patient._id);
          setSelectedRequestingHospitalId(first.hospital?.id || first.hospital?._id || '');
        }

        // Default source hospital to a different hospital
        const differentHosp = (allHospitals || []).find(
          (h) => (h.id || h._id) !== (validAssignments[0]?.hospital?.id || validAssignments[0]?.hospital?._id)
        );
        if (differentHosp) {
          setSelectedSourceHospitalId(differentHosp.id || differentHosp._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize request data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setSelectedScopes(['LAB_RESULTS', 'MEDICATIONS']);
    setPurpose('TREATMENT');
    setNotes('');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleScope = (scopeId) => {
    if (selectedScopes.includes(scopeId)) {
      if (selectedScopes.length > 1) {
        setSelectedScopes(selectedScopes.filter((s) => s !== scopeId));
      }
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const handlePatientChange = (pId) => {
    setSelectedPatientId(pId);
    const match = assignedPatients.find(
      (a) => (a.patient.id || a.patient._id) === pId
    );
    if (match && match.hospital) {
      setSelectedRequestingHospitalId(match.hospital.id || match.hospital._id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPatientId) {
      setError('Please select an assigned patient.');
      return;
    }
    if (!selectedRequestingHospitalId) {
      setError('Requesting hospital is required.');
      return;
    }
    if (!selectedSourceHospitalId) {
      setError('Source hospital is required.');
      return;
    }
    if (selectedRequestingHospitalId === selectedSourceHospitalId) {
      setError('Source hospital must be distinct from your requesting hospital.');
      return;
    }
    if (selectedScopes.length === 0) {
      setError('Select at least one clinical scope to request access for.');
      return;
    }

    setSubmitting(true);
    try {
      await createAccessRequest({
        patientId: selectedPatientId,
        requestingHospitalId: selectedRequestingHospitalId,
        sourceHospitalId: selectedSourceHospitalId,
        requestedScopes: selectedScopes,
        purpose,
        notes,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create access request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Request Cross-Hospital Clinical Access</h2>
              <p className="text-xs text-slate-400">
                Initiate a formal access request for external medical records under patient consent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <span className="text-sm">Loading authorized facilities and patient assignments...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Patient Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Assigned Patient <span className="text-rose-400">*</span>
              </label>
              {assignedPatients.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                  You currently have no active patient assignments. Cross-hospital access requires an active clinical assignment at your hospital.
                </div>
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {assignedPatients.map((a) => (
                    <option key={a.patient.id || a.patient._id} value={a.patient.id || a.patient._id}>
                      {a.patient.user?.name || a.patient.patientId} (ID: {a.patient.patientId}) — Facility: {a.hospital?.name || 'Local'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Hospital Pair */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Requesting Hospital (Your Facility) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedRequestingHospitalId}
                  onChange={(e) => setSelectedRequestingHospitalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {hospitals.map((h) => (
                    <option key={h.id || h._id} value={h.id || h._id}>
                      {h.name} ({h.hospitalCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Source Hospital (Target Facility) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedSourceHospitalId}
                  onChange={(e) => setSelectedSourceHospitalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {hospitals.map((h) => (
                    <option key={h.id || h._id} value={h.id || h._id}>
                      {h.name} ({h.hospitalCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clinical Scopes Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Requested Clinical Scopes <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {selectedScopes.length} of {AVAILABLE_SCOPES.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_SCOPES.map((sc) => {
                  const isChecked = selectedScopes.includes(sc.id);
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => toggleScope(sc.id)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        isChecked
                          ? 'bg-teal-500/10 border-teal-500/40 text-teal-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-teal-400">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-teal-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                          {sc.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{sc.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Clinical Purpose <span className="text-rose-400">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
              >
                {PURPOSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Clinical Rationale & Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Brief justification for requested external clinical records..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || assignedPatients.length === 0}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Access Request</span>
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
