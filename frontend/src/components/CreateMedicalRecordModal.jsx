import React, { useState } from 'react';
import {
  X,
  FileText,
  Activity,
  Stethoscope,
  Pill,
  FlaskConical,
  Paperclip,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { createMedicalRecord } from '../services/api';

const RECORD_TYPES = [
  { id: 'VISIT', label: 'Clinical Visit', icon: Stethoscope, desc: 'Outpatient consultation, symptoms & vitals' },
  { id: 'DIAGNOSIS', label: 'Diagnosis', icon: Activity, desc: 'Clinical diagnosis, ICD code & status' },
  { id: 'MEDICATION', label: 'Medication', icon: Pill, desc: 'Single administered or prescribed drug' },
  { id: 'LAB_RESULT', label: 'Lab Result', icon: FlaskConical, desc: 'Diagnostic laboratory test results' },
  { id: 'PRESCRIPTION', label: 'Prescription', icon: FileText, desc: 'Full prescription order with medications' },
  { id: 'DOCUMENT', label: 'Document / Scan', icon: Paperclip, desc: 'Referral note, scan report or discharge' },
];

export default function CreateMedicalRecordModal({
  isOpen,
  onClose,
  patientId,
  hospitalId,
  patientName,
  hospitalName,
  onRecordCreated,
}) {
  const [recordType, setRecordType] = useState('VISIT');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states for each discriminator
  // 1. Visit
  const [symptomsStr, setSymptomsStr] = useState('');
  const [visitDiagnosis, setVisitDiagnosis] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');

  // 2. Diagnosis
  const [diagCondition, setDiagCondition] = useState('');
  const [diagTitle, setDiagTitle] = useState('');
  const [diagIcdCode, setDiagIcdCode] = useState('');
  const [diagStatus, setDiagStatus] = useState('PROVISIONAL');
  const [diagNotes, setDiagNotes] = useState('');

  // 3. Medication
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  // 4. Lab Result
  const [labTestName, setLabTestName] = useState('');
  const [labValue, setLabValue] = useState('');
  const [labUnit, setLabUnit] = useState('');
  const [labRefRange, setLabRefRange] = useState('');
  const [labInterpretation, setLabInterpretation] = useState('NORMAL');
  const [labNotes, setLabNotes] = useState('');

  // 5. Prescription
  const [prescriptionMeds, setPrescriptionMeds] = useState([
    { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');

  // 6. Document
  const [docType, setDocType] = useState('CLINICAL_NOTE');
  const [docFileName, setDocFileName] = useState('');
  const [docMimeType, setDocMimeType] = useState('application/pdf');
  const [docStorageRef, setDocStorageRef] = useState('');
  const [docNotes, setDocNotes] = useState('');

  if (!isOpen) return null;

  const handleAddMedication = () => {
    setPrescriptionMeds([
      ...prescriptionMeds,
      { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleRemoveMedication = (index) => {
    if (prescriptionMeds.length <= 1) return;
    setPrescriptionMeds(prescriptionMeds.filter((_, i) => i !== index));
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...prescriptionMeds];
    updated[index][field] = value;
    setPrescriptionMeds(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let content = {};

    if (recordType === 'VISIT') {
      const symptoms = symptomsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      content = {
        symptoms,
        diagnosis: visitDiagnosis.trim(),
        notes: visitNotes.trim(),
        vitalSigns: {
          bloodPressure: bloodPressure.trim(),
          heartRate: heartRate ? Number(heartRate) : null,
          temperature: temperature ? Number(temperature) : null,
        },
      };
    } else if (recordType === 'DIAGNOSIS') {
      if (!diagTitle.trim()) {
        setError('Diagnosis name is required');
        return;
      }
      content = {
        diagnosis: diagTitle.trim(),
        condition: diagCondition.trim(),
        icdCode: diagIcdCode.trim(),
        status: diagStatus,
        notes: diagNotes.trim(),
      };
    } else if (recordType === 'MEDICATION') {
      if (!medName.trim() || !medDosage.trim() || !medFrequency.trim() || !medDuration.trim()) {
        setError('Medicine name, dosage, frequency, and duration are required');
        return;
      }
      content = {
        medicineName: medName.trim(),
        dosage: medDosage.trim(),
        frequency: medFrequency.trim(),
        duration: medDuration.trim(),
        instructions: medInstructions.trim(),
      };
    } else if (recordType === 'LAB_RESULT') {
      if (!labTestName.trim() || !labValue.trim()) {
        setError('Test name and value are required');
        return;
      }
      content = {
        testName: labTestName.trim(),
        value: labValue.trim(),
        unit: labUnit.trim(),
        referenceRange: labRefRange.trim(),
        interpretation: labInterpretation,
        notes: labNotes.trim(),
      };
    } else if (recordType === 'PRESCRIPTION') {
      const validMeds = prescriptionMeds.filter((m) => m.medicineName.trim());
      if (validMeds.length === 0) {
        setError('Prescription must contain at least one valid medication');
        return;
      }
      content = {
        medications: validMeds,
        instructions: prescriptionInstructions.trim(),
      };
    } else if (recordType === 'DOCUMENT') {
      if (!docFileName.trim() || !docStorageRef.trim()) {
        setError('File name and storage reference are required');
        return;
      }
      content = {
        documentType: docType,
        fileName: docFileName.trim(),
        mimeType: docMimeType.trim() || 'application/pdf',
        storageReference: docStorageRef.trim(),
        notes: docNotes.trim(),
      };
    }

    setSubmitting(true);
    try {
      const record = await createMedicalRecord({
        patientId,
        hospitalId,
        recordType,
        recordDate: new Date(recordDate).toISOString(),
        content,
      });

      if (onRecordCreated) onRecordCreated(record);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create medical record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Create Clinical Medical Record
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Patient: <span className="text-indigo-300 font-medium">{patientName || patientId}</span> • Facility: <span className="text-slate-300">{hospitalName || hospitalId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-sm text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Record Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Record Type (Mongoose Discriminator)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {RECORD_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = recordType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setRecordType(type.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-sm font-semibold">{type.label}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-tight">{type.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Record Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Clinical Encounter Date
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Type-Specific Dynamic Form Fields */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
              {recordType === 'VISIT' && <Stethoscope className="w-4 h-4" />}
              {recordType === 'DIAGNOSIS' && <Activity className="w-4 h-4" />}
              {recordType === 'MEDICATION' && <Pill className="w-4 h-4" />}
              {recordType === 'LAB_RESULT' && <FlaskConical className="w-4 h-4" />}
              {recordType === 'PRESCRIPTION' && <FileText className="w-4 h-4" />}
              {recordType === 'DOCUMENT' && <Paperclip className="w-4 h-4" />}
              {recordType} Record Details
            </h3>

            {/* 1. VISIT FORM */}
            {recordType === 'VISIT' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Symptoms (comma separated)</label>
                  <input
                    type="text"
                    value={symptomsStr}
                    onChange={(e) => setSymptomsStr(e.target.value)}
                    placeholder="e.g. Fever, Persistent cough, Headache"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Clinical Assessment / Diagnosis</label>
                  <input
                    type="text"
                    value={visitDiagnosis}
                    onChange={(e) => setVisitDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Viral Bronchitis"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">BP (mmHg)</label>
                    <input
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="120/80"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="72"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="98.6"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Consultation Notes</label>
                  <textarea
                    rows={3}
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Detailed observation, physical exam findings, and clinical advice..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 2. DIAGNOSIS FORM */}
            {recordType === 'DIAGNOSIS' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Diagnosis Name *</label>
                    <input
                      type="text"
                      value={diagTitle}
                      onChange={(e) => setDiagTitle(e.target.value)}
                      placeholder="e.g. Type 2 Diabetes Mellitus"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Condition Category</label>
                    <input
                      type="text"
                      value={diagCondition}
                      onChange={(e) => setDiagCondition(e.target.value)}
                      placeholder="e.g. Endocrine / Metabolic"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ICD-10 Code</label>
                    <input
                      type="text"
                      value={diagIcdCode}
                      onChange={(e) => setDiagIcdCode(e.target.value)}
                      placeholder="e.g. E11.9"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Diagnostic Status</label>
                    <select
                      value={diagStatus}
                      onChange={(e) => setDiagStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value="PROVISIONAL">PROVISIONAL</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Diagnostic Notes</label>
                  <textarea
                    rows={2}
                    value={diagNotes}
                    onChange={(e) => setDiagNotes(e.target.value)}
                    placeholder="Etiology, progression, or supporting findings..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 3. MEDICATION FORM */}
            {recordType === 'MEDICATION' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Medicine Name *</label>
                    <input
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="e.g. Metformin"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dosage *</label>
                    <input
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="e.g. 500mg"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Frequency *</label>
                    <input
                      type="text"
                      value={medFrequency}
                      onChange={(e) => setMedFrequency(e.target.value)}
                      placeholder="e.g. Twice Daily (BD)"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Duration *</label>
                    <input
                      type="text"
                      value={medDuration}
                      onChange={(e) => setMedDuration(e.target.value)}
                      placeholder="e.g. 30 days"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Instructions</label>
                  <input
                    type="text"
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    placeholder="e.g. Take with or immediately after meals"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 4. LAB RESULT FORM */}
            {recordType === 'LAB_RESULT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Test Name *</label>
                    <input
                      type="text"
                      value={labTestName}
                      onChange={(e) => setLabTestName(e.target.value)}
                      placeholder="e.g. HbA1c (Glycated Hemoglobin)"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Value *</label>
                    <input
                      type="text"
                      value={labValue}
                      onChange={(e) => setLabValue(e.target.value)}
                      placeholder="e.g. 6.8"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Unit</label>
                    <input
                      type="text"
                      value={labUnit}
                      onChange={(e) => setLabUnit(e.target.value)}
                      placeholder="e.g. %"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Reference Range</label>
                    <input
                      type="text"
                      value={labRefRange}
                      onChange={(e) => setLabRefRange(e.target.value)}
                      placeholder="e.g. 4.0 - 5.6"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Interpretation</label>
                    <select
                      value={labInterpretation}
                      onChange={(e) => setLabInterpretation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="ABNORMAL">ABNORMAL</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lab Notes</label>
                  <input
                    type="text"
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    placeholder="e.g. Slightly elevated, repeat in 3 months"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 5. PRESCRIPTION FORM */}
            {recordType === 'PRESCRIPTION' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {prescriptionMeds.map((med, index) => (
                    <div key={index} className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">Medication #{index + 1}</span>
                        {prescriptionMeds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Medicine name *"
                          value={med.medicineName}
                          onChange={(e) => handleMedChange(index, 'medicineName', e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg) *"
                          value={med.dosage}
                          onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. TDS) *"
                          value={med.frequency}
                          onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days) *"
                          value={med.duration}
                          onChange={(e) => handleMedChange(index, 'duration', e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          required
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Medication
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">General Prescription Instructions</label>
                  <textarea
                    rows={2}
                    value={prescriptionInstructions}
                    onChange={(e) => setPrescriptionInstructions(e.target.value)}
                    placeholder="Dietary precautions, review dates, warning signs..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 6. DOCUMENT FORM */}
            {recordType === 'DOCUMENT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Document Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                      <option value="CLINICAL_NOTE">CLINICAL NOTE</option>
                      <option value="DISCHARGE_SUMMARY">DISCHARGE SUMMARY</option>
                      <option value="LAB_REPORT">LAB REPORT</option>
                      <option value="IMAGING_SCAN">IMAGING SCAN</option>
                      <option value="PRESCRIPTION_SCAN">PRESCRIPTION SCAN</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">File Name *</label>
                    <input
                      type="text"
                      value={docFileName}
                      onChange={(e) => setDocFileName(e.target.value)}
                      placeholder="e.g. chest_xray_2026.pdf"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">MIME Type</label>
                    <input
                      type="text"
                      value={docMimeType}
                      onChange={(e) => setDocMimeType(e.target.value)}
                      placeholder="application/pdf"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Storage Reference / URL *</label>
                    <input
                      type="text"
                      value={docStorageRef}
                      onChange={(e) => setDocStorageRef(e.target.value)}
                      placeholder="synthetic-storage://hosp/docs/scan123.pdf"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Document Notes</label>
                  <input
                    type="text"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="Findings summary or indexing keywords..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Record...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Record Clinical Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
