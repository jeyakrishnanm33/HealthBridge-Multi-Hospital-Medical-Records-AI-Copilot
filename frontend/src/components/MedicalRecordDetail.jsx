import React from 'react';
import {
  X,
  Calendar,
  Building2,
  User,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Thermometer,
  Gauge,
  Edit3,
} from 'lucide-react';

export default function MedicalRecordDetail({
  record,
  isOpen,
  onClose,
  canEdit,
  onEditClick,
}) {
  if (!isOpen || !record) return null;

  const typeStyles = {
    VISIT: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: Stethoscope, label: 'Clinical Visit' },
    DIAGNOSIS: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: Activity, label: 'Diagnosis' },
    MEDICATION: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: Pill, label: 'Medication' },
    LAB_RESULT: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: FlaskConical, label: 'Lab Result' },
    PRESCRIPTION: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: FileText, label: 'Prescription' },
    DOCUMENT: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: Paperclip, label: 'Document / Scan' },
  };

  const style = typeStyles[record.recordType] || typeStyles.VISIT;
  const Icon = style.icon;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${style.bg} ${style.border}`}>
              <Icon className={`w-6 h-6 ${style.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-xs text-slate-500">ID: {record.id || record._id}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {record.diagnosis || record.medicineName || record.testName || record.fileName || 'Clinical Record'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEditClick(record)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-lg transition flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clinical Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" /> Encounter Date
            </span>
            <span className="text-xs font-medium text-slate-200 mt-0.5 block">
              {formatDate(record.recordDate)}
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-indigo-400" /> Attending Doctor
            </span>
            <span className="text-xs font-medium text-slate-200 mt-0.5 block truncate">
              {record.doctor?.fullName || 'Clinical Doctor'}
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-400" /> Hospital Facility
            </span>
            <span className="text-xs font-medium text-slate-200 mt-0.5 block truncate">
              {record.hospital?.name || 'Healthcare Facility'}
            </span>
          </div>
        </div>

        {/* Discriminator Body Content */}
        <div className="space-y-4">
          {/* VISIT DETAILS */}
          {record.recordType === 'VISIT' && (
            <>
              {record.symptoms && record.symptoms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Reported Symptoms
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {record.symptoms.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {record.vitalSigns && Object.values(record.vitalSigns).some(Boolean) && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vitals Recorded
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {record.vitalSigns.bloodPressure && (
                      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
                        <Gauge className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{record.vitalSigns.bloodPressure}</div>
                        <div className="text-[10px] text-slate-400">BP (mmHg)</div>
                      </div>
                    )}
                    {record.vitalSigns.heartRate && (
                      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
                        <Heart className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{record.vitalSigns.heartRate}</div>
                        <div className="text-[10px] text-slate-400">HR (bpm)</div>
                      </div>
                    )}
                    {record.vitalSigns.temperature && (
                      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
                        <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{record.vitalSigns.temperature}°F</div>
                        <div className="text-[10px] text-slate-400">Temp</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {record.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Clinical Notes & Plan
                  </h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                    {record.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* DIAGNOSIS DETAILS */}
          {record.recordType === 'DIAGNOSIS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className="text-xs font-bold text-indigo-400 mt-1 block">
                    {record.status}
                  </span>
                </div>
                {record.icdCode && (
                  <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">ICD Code</span>
                    <span className="text-xs font-bold text-slate-200 mt-1 block">
                      {record.icdCode}
                    </span>
                  </div>
                )}
              </div>
              {record.condition && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Condition Class</h4>
                  <p className="text-sm text-slate-300">{record.condition}</p>
                </div>
              )}
              {record.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Diagnostic Notes</h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MEDICATION DETAILS */}
          {record.recordType === 'MEDICATION' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase block">Dosage</span>
                  <span className="text-xs font-bold text-white mt-1 block">{record.dosage}</span>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase block">Frequency</span>
                  <span className="text-xs font-bold text-white mt-1 block">{record.frequency}</span>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase block">Duration</span>
                  <span className="text-xs font-bold text-white mt-1 block">{record.duration}</span>
                </div>
              </div>
              {record.instructions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Intake Instructions</h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                    {record.instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LAB RESULT DETAILS */}
          {record.recordType === 'LAB_RESULT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 block">Observed Value</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {record.value} <span className="text-sm font-normal text-slate-400">{record.unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Reference Interval</span>
                  <span className="text-xs font-medium text-slate-300 mt-1 block">
                    {record.referenceRange || 'Not specified'}
                  </span>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    record.interpretation === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300' :
                    record.interpretation === 'ABNORMAL' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-rose-500/20 text-rose-300'
                  }`}>
                    {record.interpretation}
                  </span>
                </div>
              </div>
              {record.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pathologist Remarks</h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PRESCRIPTION DETAILS */}
          {record.recordType === 'PRESCRIPTION' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Prescribed Drug Regimen
              </h4>
              <div className="space-y-2">
                {record.medications && record.medications.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5 text-indigo-400" />
                        {m.medicineName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {m.dosage} • {m.frequency} • {m.duration}
                      </div>
                    </div>
                    {m.instructions && (
                      <span className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {m.instructions}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {record.instructions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Instructions</h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                    {record.instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT DETAILS */}
          {record.recordType === 'DOCUMENT' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase">Category</span>
                  <span className="text-xs font-bold text-purple-400">{record.documentType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase">File Name</span>
                  <span className="text-xs font-medium text-white">{record.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase">MIME Type</span>
                  <span className="text-xs font-mono text-slate-300">{record.mimeType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase">Storage Ref</span>
                  <span className="text-xs font-mono text-indigo-300 truncate max-w-[280px]">
                    {record.storageReference}
                  </span>
                </div>
              </div>
              {record.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Document Notes</h4>
                  <p className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 mt-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
