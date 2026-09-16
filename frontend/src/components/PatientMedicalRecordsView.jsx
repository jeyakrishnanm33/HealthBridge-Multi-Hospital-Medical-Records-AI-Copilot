import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Loader2, User } from 'lucide-react';
import { fetchMyPatientProfile } from '../services/api';
import MedicalRecordList from './MedicalRecordList';

export default function PatientMedicalRecordsView({ currentUser }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchMyPatientProfile();
        setPatient(data);
      } catch (err) {
        if (err.code === 'PATIENT_PROFILE_NOT_FOUND') {
          setPatient(null);
        } else {
          setError(err.message || 'Failed to load patient profile');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Resolving patient identity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Patient Profile Required</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Please complete your Patient Profile under the "My Patient Profile" tab before accessing your clinical medical records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MedicalRecordList
        patientId={patient.id || patient._id}
        patientName={patient.user?.name || patient.patientId}
        currentUserRole="PATIENT"
      />
    </div>
  );
}
