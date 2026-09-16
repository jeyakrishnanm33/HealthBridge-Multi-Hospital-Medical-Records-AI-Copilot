import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  User,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Paperclip,
  Plus,
  Loader2,
  Search,
  Filter,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { fetchPatientMedicalRecords } from '../services/api';
import MedicalRecordDetail from './MedicalRecordDetail';
import CreateMedicalRecordModal from './CreateMedicalRecordModal';

const TYPE_CONFIG = {
  ALL: { label: 'All Records', icon: FileText, color: 'text-slate-300' },
  VISIT: { label: 'Visits', icon: Stethoscope, color: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  DIAGNOSIS: { label: 'Diagnoses', icon: Activity, color: 'text-rose-400', badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
  MEDICATION: { label: 'Medications', icon: Pill, color: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  LAB_RESULT: { label: 'Lab Results', icon: FlaskConical, color: 'text-cyan-400', badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' },
  PRESCRIPTION: { label: 'Prescriptions', icon: FileText, color: 'text-indigo-400', badge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  DOCUMENT: { label: 'Documents', icon: Paperclip, color: 'text-purple-400', badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
};

export default function MedicalRecordList({
  patientId,
  patientName,
  hospitalId,
  hospitalName,
  currentUserRole,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchPatientMedicalRecords(patientId, {
        recordType: selectedType !== 'ALL' ? selectedType : undefined,
      });
      setRecords(data?.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load medical records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, selectedType]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleRecordCreated = (newRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = (r.diagnosis || r.medicineName || r.testName || r.fileName || '').toLowerCase();
    const notes = (r.notes || '').toLowerCase();
    const docName = (r.doctor?.fullName || '').toLowerCase();
    const hospName = (r.hospital?.name || '').toLowerCase();
    return title.includes(q) || notes.includes(q) || docName.includes(q) || hospName.includes(q);
  });

  const isDoctor = currentUserRole === 'DOCTOR';

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              Phase 7 Domain
            </span>
            <span className="text-xs text-slate-400">
              Patient ID: <span className="font-mono text-slate-300">{patientId}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Clinical Medical Records Timeline
          </h2>
          <p className="text-xs text-slate-400">
            Mongoose Discriminators in single collection <code className="text-indigo-300">medical_records</code>
          </p>
        </div>

        {isDoctor && hospitalId && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Medical Entry
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
            const Icon = cfg.icon;
            const isSelected = selectedType === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symptoms, tests, drugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading clinical records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border border-slate-800/80 text-center">
          <FileText className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Medical Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {selectedType !== 'ALL'
              ? `No ${selectedType} records exist for this patient.`
              : 'There are no documented clinical encounters or tests recorded yet.'}
          </p>
          {isDoctor && hospitalId && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Document First Encounter
            </button>
          )}
        </div>
      ) : (
        /* Record Cards Grid / Timeline */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((record) => {
            const cfg = TYPE_CONFIG[record.recordType] || TYPE_CONFIG.VISIT;
            const Icon = cfg.icon;

            const title =
              record.diagnosis ||
              record.medicineName ||
              record.testName ||
              record.fileName ||
              (record.medications?.[0]?.medicineName
                ? `Prescription: ${record.medications[0].medicineName}`
                : 'Medical Record');

            const dateStr = record.recordDate
              ? new Date(record.recordDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <div
                key={record.id || record._id}
                onClick={() => {
                  setSelectedRecord(record);
                  setIsDetailOpen(true);
                }}
                className="group p-5 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-2xl transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${cfg.badge}`}
                    >
                      <Icon className="w-3 h-3" />
                      {record.recordType}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Title & Preview */}
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                    {title}
                  </h3>

                  {/* Sub-fields preview depending on type */}
                  {record.recordType === 'VISIT' && record.symptoms?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {record.symptoms.slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700/50"
                        >
                          {s}
                        </span>
                      ))}
                      {record.symptoms.length > 3 && (
                        <span className="text-[11px] text-slate-500">
                          +{record.symptoms.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {record.recordType === 'MEDICATION' && (
                    <p className="text-xs text-slate-400 mt-1">
                      Dosage: <span className="text-slate-200">{record.dosage}</span> • {record.frequency}
                    </p>
                  )}

                  {record.recordType === 'LAB_RESULT' && (
                    <p className="text-xs text-slate-400 mt-1">
                      Result: <span className="text-white font-bold">{record.value} {record.unit}</span> ({record.interpretation})
                    </p>
                  )}

                  {record.recordType === 'PRESCRIPTION' && record.medications?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Includes {record.medications.length} prescribed medication(s)
                    </p>
                  )}

                  {record.recordType === 'DOCUMENT' && (
                    <p className="text-xs font-mono text-purple-300 mt-1 truncate">
                      {record.fileName}
                    </p>
                  )}

                  {record.notes && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {record.notes}
                    </p>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[160px] flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-slate-400" />
                    {record.doctor?.fullName || 'Attending Doctor'}
                  </span>
                  <span className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition">
                    View <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <MedicalRecordDetail
        record={selectedRecord}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRecord(null);
        }}
        canEdit={isDoctor}
        onEditClick={(rec) => {
          setIsDetailOpen(false);
          // Can open edit modal if needed
        }}
      />

      {/* Create Modal */}
      <CreateMedicalRecordModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        patientId={patientId}
        patientName={patientName}
        hospitalId={hospitalId}
        hospitalName={hospitalName}
        onRecordCreated={handleRecordCreated}
      />
    </div>
  );
}
