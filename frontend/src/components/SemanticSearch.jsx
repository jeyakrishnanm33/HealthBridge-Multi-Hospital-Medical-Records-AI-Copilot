import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  Calendar,
  AlertCircle,
  Loader2,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  User,
  Building2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { searchAPI, fetchAssignments } from '../services/api';
import MedicalRecordDetail from './MedicalRecordDetail';

const RECORD_TYPE_ICONS = {
  VISIT: Stethoscope,
  DIAGNOSIS: Activity,
  MEDICATION: Pill,
  LAB_RESULT: FlaskConical,
  PRESCRIPTION: FileText,
  DOCUMENT: FileText,
};

const RECORD_TYPE_COLORS = {
  VISIT: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
  DIAGNOSIS: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
  MEDICATION: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
  LAB_RESULT: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  PRESCRIPTION: 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30',
  DOCUMENT: 'from-slate-500/20 to-zinc-500/20 text-slate-400 border-slate-500/30',
};

const SAMPLE_QUERIES = [
  'Hypertension and cardiovascular treatment',
  'Shortness of breath and respiratory symptoms',
  'High cholesterol and lipid blood test results',
  'Allergic reaction and antibiotic prescriptions',
  'Annual physical consultation notes',
];

export default function SemanticSearch({ currentUser }) {
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isPatient = currentUser?.role === 'PATIENT';

  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedRecordType, setSelectedRecordType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(isDoctor);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState('');

  const [detailRecord, setDetailRecord] = useState(null);

  // Load doctor's assignments if doctor
  useEffect(() => {
    if (!isDoctor) return;

    const loadDoctorAssignments = async () => {
      try {
        setLoadingAssignments(true);
        const list = await fetchAssignments({ status: 'ACTIVE' });
        setAssignments(list || []);
        if (list && list.length > 0) {
          const firstPatientId = list[0].patient?._id || list[0].patient?.id;
          setSelectedPatientId(firstPatientId || '');
        }
      } catch (err) {
        setError(err.message || 'Failed to load assigned patients');
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadDoctorAssignments();
  }, [isDoctor]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a clinical search query');
      return;
    }

    if (isDoctor && !selectedPatientId) {
      setError('Please select an authorized patient to search');
      return;
    }

    try {
      setSearching(true);
      setError('');

      const searchParams = {
        query: query.trim(),
        limit: 15,
      };

      if (isDoctor && selectedPatientId) {
        searchParams.patientId = selectedPatientId;
      }

      if (selectedRecordType !== 'ALL') {
        searchParams.recordTypes = [selectedRecordType];
      }

      if (fromDate) searchParams.fromDate = fromDate;
      if (toDate) searchParams.toDate = toDate;

      const data = await searchAPI.semanticSearch(searchParams);
      setSearchResults(data);
    } catch (err) {
      setError(err.message || 'Semantic clinical search failed');
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const getRecordSummary = (rec) => {
    switch (rec.recordType) {
      case 'VISIT':
        return rec.diagnosis || rec.reasonForVisit || 'Visit Record';
      case 'DIAGNOSIS':
        return `${rec.diagnosis || rec.condition || 'Diagnosis'} (ICD: ${rec.icdCode || 'N/A'})`;
      case 'MEDICATION':
        return `${rec.medicineName || rec.drugName || 'Medication'} ${rec.dosage || ''} - ${rec.frequency || ''}`;
      case 'LAB_RESULT':
        return `${rec.testName || 'Lab Test'} (${rec.testCategory || 'General'})`;
      case 'PRESCRIPTION':
        return rec.notes || (rec.medications ? `${rec.medications.length} Prescribed Medications` : 'Prescription Order');
      case 'DOCUMENT':
        return rec.title || rec.summary || 'Clinical Attachment';
      default:
        return 'Medical Record';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/80 border border-indigo-500/20 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>AI-Powered Semantic Retrieval Layer</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Semantic Clinical Search</h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Search authorized medical records using natural clinical queries and symptoms. Results are ranked by cosine similarity embeddings while strictly preserving RBAC, tenant boundaries, and patient consent.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400">
            <span className="text-slate-500 block uppercase font-bold text-[10px]">Authoritative Scope</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isDoctor ? 'Assigned Clinical Patient' : 'Patient Self-Records'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Filter Controls Form */}
      <form onSubmit={handleSearch} className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
        {/* Top Query Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, diagnoses, medications, lab findings, or clinical notes..."
            className="w-full pl-12 pr-32 py-3.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
          >
            {searching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Doctor Patient Selector */}
          {isDoctor && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-400" />
                <span>Target Patient</span>
              </label>
              {loadingAssignments ? (
                <div className="h-9 bg-slate-800/60 animate-pulse rounded-lg" />
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {assignments.map((a) => {
                    const pId = a.patient?._id || a.patient?.id;
                    const pName = a.patient?.user?.name || a.patient?.patientId || 'Patient';
                    const hName = a.hospital?.name || 'Hospital';
                    return (
                      <option key={pId} value={pId}>
                        {pName} ({a.patient?.patientId || 'ID'}) — {hName}
                      </option>
                    );
                  })}
                  {assignments.length === 0 && (
                    <option value="">No active assigned patients</option>
                  )}
                </select>
              )}
            </div>
          )}

          {/* Record Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-indigo-400" />
              <span>Record Type</span>
            </label>
            <select
              value={selectedRecordType}
              onChange={(e) => setSelectedRecordType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Discriminators</option>
              <option value="VISIT">Consultation / Visit</option>
              <option value="DIAGNOSIS">Clinical Diagnosis</option>
              <option value="MEDICATION">Medication</option>
              <option value="LAB_RESULT">Laboratory Result</option>
              <option value="PRESCRIPTION">Prescription Order</option>
              <option value="DOCUMENT">Document Attachment</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Sample Queries Quick Chips */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Suggested:</span>
          </span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
              }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Retrieved Clinical Records</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                {searchResults.totalResults} Matches
              </span>
            </h3>
            <span className="text-xs text-slate-400 italic">
              Ranked by semantic vector similarity score
            </span>
          </div>

          {searchResults.results.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Matching Clinical Records Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                No medical records within your authorized scope matched this query with sufficient similarity. Try adjusting your search query or record type filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.results.map((item, idx) => {
                const IconComponent = RECORD_TYPE_ICONS[item.recordType] || FileText;
                const colorClass = RECORD_TYPE_COLORS[item.recordType] || 'from-slate-500/20 to-zinc-500/20 text-slate-400 border-slate-500/30';
                const scorePercent = Math.round((item.score || 0) * 100);

                return (
                  <div
                    key={item.id || item._id || idx}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${colorClass} border flex items-center justify-center`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {item.recordType}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {item.recordDate ? new Date(item.recordDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Similarity Score Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>{scorePercent}% Match</span>
                        </div>
                      </div>

                      {/* Main Summary */}
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-200 font-medium">
                        {getRecordSummary(item)}
                      </div>

                      {/* Metadata Row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{item.hospital?.name || 'Hospital Facility'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{item.doctor?.fullName || 'Physician'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setDetailRecord(item)}
                        className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700/90 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Authorized Clinical Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {detailRecord && (
        <MedicalRecordDetail
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          currentUserRole={currentUser?.role}
        />
      )}
    </div>
  );
}
