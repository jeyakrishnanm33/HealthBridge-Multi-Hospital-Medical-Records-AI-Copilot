import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Stethoscope,
  User,
  Calendar,
  KeyRound,
  FileText,
} from 'lucide-react';

const SCOPE_DESCRIPTIONS = {
  VISITS: 'Clinical encounters, consultation notes, and outpatient visit summaries',
  DIAGNOSES: 'Medical diagnoses, pathology interpretations, and chronic conditions',
  MEDICATIONS: 'Prescription history, active medications, and dosage schedules',
  LAB_RESULTS: 'Diagnostic bloodwork, biochemistry, and lab report panels',
  PRESCRIPTIONS: 'Signed prescription orders, administration instructions, and durations',
  DOCUMENTS: 'Discharge summaries, radiology reports, and medical imaging documents',
};

export default function ConsentDetailModal({ consent, isOpen, onClose, onRevokeClick, isPatient }) {
  if (!isOpen || !consent) return null;

  const effectiveStatus = consent.effectiveStatus || 'ACTIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                effectiveStatus === 'ACTIVE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : effectiveStatus === 'REVOKED'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {effectiveStatus === 'ACTIVE' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : effectiveStatus === 'REVOKED' ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Clinical Consent Artifact</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    effectiveStatus === 'ACTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : effectiveStatus === 'REVOKED'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {effectiveStatus}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Record ID: {(consent.id || consent._id || '').toUpperCase()}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Parties involved */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Requesting Physician
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {consent.requestingDoctor?.fullName || 'Doctor'}
              </div>
              <div className="text-[11px] text-slate-400">
                {consent.requestingHospital?.name || 'Requesting Facility'}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Source Facility
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {consent.sourceHospital?.name || 'Source Facility'}
              </div>
              <div className="text-[11px] text-slate-400">
                Records Custodian ({consent.sourceHospital?.hospitalCode || 'HOSP'})
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Patient Owner
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {consent.patient?.user?.name || consent.patient?.patientId || 'Patient'}
              </div>
              <div className="text-[11px] text-slate-400">
                ID: {consent.patient?.patientId || 'N/A'}
              </div>
            </div>
          </div>

          {/* Scopes permitted */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Permitted Clinical Scopes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {consent.scopes?.map((sc) => (
                <div
                  key={sc}
                  className="p-3 rounded-xl bg-slate-950 border border-teal-500/20 text-xs space-y-1"
                >
                  <div className="font-semibold text-teal-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {sc.replace('_', ' ')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {SCOPE_DESCRIPTIONS[sc] || 'Clinical records for this scope'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps & Lifecycle */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-500 block">Granted At</span>
              <span className="font-medium text-slate-300">
                {consent.grantedAt ? new Date(consent.grantedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Expires At</span>
              <span className="font-medium text-slate-300">
                {consent.expiresAt ? new Date(consent.expiresAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Revocation Status</span>
              <span className="font-medium text-slate-300">
                {consent.revokedAt ? (
                  <span className="text-rose-400">Revoked {new Date(consent.revokedAt).toLocaleDateString()}</span>
                ) : (
                  <span className="text-emerald-400">Unrevoked</span>
                )}
              </span>
            </div>
          </div>

          {/* Revocation reason if any */}
          {consent.revocationReason && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <span className="font-semibold">Revocation Reason:</span> {consent.revocationReason}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="text-xs text-slate-500">
            Protected by HealthBridge cryptographic RBAC & patient authorization policies
          </div>

          <div className="flex items-center gap-3">
            {isPatient && effectiveStatus === 'ACTIVE' && onRevokeClick && (
              <button
                onClick={() => {
                  onClose();
                  onRevokeClick(consent);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
              >
                Revoke Consent Now
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
