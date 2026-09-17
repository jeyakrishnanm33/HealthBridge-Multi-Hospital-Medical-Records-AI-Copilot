import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Eye,
  ChevronRight,
  Info,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { clinicalAssistantAPI, fetchAssignments, fetchMedicalRecordById } from '../services/api';
import MedicalRecordDetail from './MedicalRecordDetail';

const RECORD_TYPE_ICONS = {
  VISIT: Stethoscope,
  DIAGNOSIS: Activity,
  MEDICATION: Pill,
  LAB_RESULT: FlaskConical,
  PRESCRIPTION: FileText,
  DOCUMENT: FileText,
};

const RECORD_TYPE_BADGES = {
  VISIT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DIAGNOSIS: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MEDICATION: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LAB_RESULT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PRESCRIPTION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DOCUMENT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const PATIENT_PROMPT_SUGGESTIONS = [
  'What confirmed diagnoses are in my medical records?',
  'What medications and dosages were prescribed to me?',
  'Summarize my recent clinical visits and symptoms.',
  'What abnormal laboratory test results were found?',
  'What was the outcome of my last clinical consultation?',
];

const DOCTOR_PROMPT_SUGGESTIONS = [
  'Summarize this patient longitudinal clinical history.',
  'What active cardiovascular or chronic diagnoses are recorded?',
  'List all currently prescribed medications and intake instructions.',
  'Show recent abnormal diagnostic and laboratory findings.',
  'Summarize documented vital signs from the latest clinical encounters.',
];

export default function ClinicalAssistant({ currentUser }) {
  const isDoctor = currentUser?.role === 'DOCTOR';
  const isPatient = currentUser?.role === 'PATIENT';

  const [question, setQuestion] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedRecordTypes, setSelectedRecordTypes] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topK, setTopK] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(isDoctor);
  const [asking, setAsking] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  // Click-to-inspect modal state
  const [inspectingRecord, setInspectingRecord] = useState(null);
  const [loadingRecordId, setLoadingRecordId] = useState(null);

  // Load doctor's active patient assignments
  useEffect(() => {
    if (!isDoctor) return;

    const loadAssignments = async () => {
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

    loadAssignments();
  }, [isDoctor]);

  const handleAsk = async (e, customQuestion) => {
    if (e) e.preventDefault();
    const queryText = customQuestion || question;

    if (!queryText.trim()) {
      setError('Please enter a clinical question');
      return;
    }

    if (isDoctor && !selectedPatientId) {
      setError('Please select an authorized patient to query');
      return;
    }

    try {
      setAsking(true);
      setError('');
      setResponse(null);

      const payload = {
        question: queryText.trim(),
        patientId: isDoctor ? selectedPatientId : undefined,
        recordTypes: selectedRecordTypes.length > 0 ? selectedRecordTypes : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        topK: Number(topK) || 5,
      };

      const result = await clinicalAssistantAPI.askAssistant(payload);
      setResponse(result);
    } catch (err) {
      setError(err.message || 'Clinical AI Assistant failed to process request');
    } finally {
      setAsking(false);
    }
  };

  const handleInspectSourceRecord = async (recordId) => {
    try {
      setLoadingRecordId(recordId);
      const fullRecord = await fetchMedicalRecordById(recordId);
      setInspectingRecord(fullRecord);
    } catch (err) {
      alert(`Could not open record: ${err.message}`);
    } finally {
      setLoadingRecordId(null);
    }
  };

  const toggleRecordType = (type) => {
    if (selectedRecordTypes.includes(type)) {
      setSelectedRecordTypes(selectedRecordTypes.filter((t) => t !== type));
    } else {
      setSelectedRecordTypes([...selectedRecordTypes, type]);
    }
  };

  const suggestions = isDoctor ? DOCTOR_PROMPT_SUGGESTIONS : PATIENT_PROMPT_SUGGESTIONS;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/20 p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Clinical AI Assistant
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  RAG Grounded
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                {isPatient
                  ? 'Ask natural-language questions about your verified HealthBridge medical records, prescriptions, and test results.'
                  : 'Synthesize longitudinal clinical insights, diagnoses, and lab trends for authorized assigned patients.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Zero-PHI Audit Gate</span>
          </div>
        </div>
      </div>

      {/* Doctor Patient Selection Bar */}
      {isDoctor && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <User className="w-4 h-4 text-teal-400" />
              <span>Target Patient Scope:</span>
            </div>

            {loadingAssignments ? (
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span>Loading active assignments...</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-xs text-amber-400 font-medium">
                No active patient assignments found. Querying requires an assigned or consented patient.
              </div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500 max-w-md w-full"
              >
                {assignments.map((asg) => {
                  const pId = asg.patient?._id || asg.patient?.id || asg.patient;
                  const pName = asg.patient?.user?.name || asg.patient?.patientId || `Patient #${pId.substring(0, 8)}`;
                  const hospName = asg.hospital?.name || 'Hospital Facility';
                  return (
                    <option key={asg._id || asg.id} value={pId}>
                      {pName} ({asg.patient?.patientId || 'ID'}) — {hospName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Query Form & Input */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-lg space-y-4">
        <form onSubmit={handleAsk} className="space-y-4">
          <div className="relative">
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                isPatient
                  ? "e.g., 'What were my recent abnormal lab test results and blood pressure readings?'"
                  : "e.g., 'Summarize diagnosed conditions, prescribed medications, and recent vital signs.'"
              }
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition-all resize-none font-sans"
              maxLength={500}
            />
            <div className="absolute right-3 bottom-3 flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
              <span>{question.length}/500</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showFilters || selectedRecordTypes.length > 0 || startDate || endDate
                  ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Filters{' '}
                {selectedRecordTypes.length > 0 && `(${selectedRecordTypes.length})`}
              </span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                disabled={asking || (isDoctor && !selectedPatientId)}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {asking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Synthesizing Records...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Ask Assistant</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filters Drawer */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-800/80 space-y-4 bg-slate-950/40 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Filter by Clinical Record Types:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['VISIT', 'DIAGNOSIS', 'MEDICATION', 'LAB_RESULT', 'PRESCRIPTION', 'DOCUMENT'].map(
                    (type) => {
                      const Icon = RECORD_TYPE_ICONS[type] || FileText;
                      const isSelected = selectedRecordTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleRecordType(type)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-teal-500/20 border-teal-500/50 text-teal-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{type.replace('_', ' ')}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Max Evidence Sources ({topK})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full accent-teal-400 mt-2"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Quick Suggestion Pills */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Suggested Inquiries:
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuestion(sug);
                  handleAsk(null, sug);
                }}
                disabled={asking}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-teal-950/40 text-slate-400 hover:text-teal-200 border border-slate-800/80 hover:border-teal-500/30 transition-all text-left"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Assistant Processing Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {asking && (
        <div className="bg-slate-900/60 border border-teal-500/30 rounded-2xl p-6 backdrop-blur-md space-y-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
            <div className="text-xs font-semibold text-teal-300">
              Retrieving authorized vectors & synthesizing grounded clinical evidence...
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-800 rounded w-4/6"></div>
          </div>
        </div>
      )}

      {/* Assistant Response Box */}
      {response && !asking && (
        <div className="space-y-6">
          {/* Main Answer Container */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-semibold text-white">Grounded Clinical Summary</span>
              </div>

              {response.grounded ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified from Records</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>Insufficient Evidence</span>
                </span>
              )}
            </div>

            {/* Answer Content */}
            <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
              {response.answer}
            </div>

            {/* Disclaimer Footer */}
            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                AI-assisted retrieval and summarization of authorized synthetic clinical records. Not for diagnostic or emergency treatment use.
              </span>
            </div>
          </div>

          {/* Grounded Citation Sources */}
          {response.sources && response.sources.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Documented Evidence Sources ({response.sources.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Click to inspect full clinical record
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {response.sources.map((source, idx) => {
                  const Icon = RECORD_TYPE_ICONS[source.recordType] || FileText;
                  const badgeClass = RECORD_TYPE_BADGES[source.recordType] || 'bg-slate-800 text-slate-300';
                  const scorePct = source.relevanceScore
                    ? Math.round(source.relevanceScore * 100)
                    : null;
                  const formattedDate = source.recordDate
                    ? new Date(source.recordDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Undated';

                  return (
                    <div
                      key={source.recordId || idx}
                      className="bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 rounded-xl p-4 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{source.recordType?.replace('_', ' ')}</span>
                          </span>

                          {scorePct && (
                            <span className="text-[10px] font-mono text-teal-400 font-semibold">
                              {scorePct}% Match
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-slate-200">
                          {source.hospitalName || 'HealthBridge Facility'}
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInspectSourceRecord(source.recordId)}
                        disabled={loadingRecordId === source.recordId}
                        className="mt-3 w-full inline-flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-teal-500/10 text-teal-300 hover:text-teal-200 border border-slate-800 hover:border-teal-500/30 transition-colors"
                      >
                        {loadingRecordId === source.recordId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Record</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medical Record Inspection Modal */}
      {inspectingRecord && (
        <MedicalRecordDetail
          record={inspectingRecord}
          currentUser={currentUser}
          onClose={() => setInspectingRecord(null)}
        />
      )}
    </div>
  );
}
