import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Building2,
  User,
  AlertCircle,
  Loader2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { fetchAssignments } from '../services/api';
import MedicalRecordList from './MedicalRecordList';

export default function DoctorClinicalRecordsView({ currentUser }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await fetchAssignments({ status: 'ACTIVE' });
        setAssignments(list || []);
        if (list && list.length > 0) {
          setSelectedAssignmentId(list[0].id || list[0]._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load assigned patients');
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  const selectedAssignment = assignments.find(
    (a) => (a.id || a._id) === selectedAssignmentId
  );

  const patientId = selectedAssignment?.patient?.id || selectedAssignment?.patient?._id;
  const patientName =
    selectedAssignment?.patient?.user?.name ||
    selectedAssignment?.patient?.patientId ||
    'Assigned Patient';

  const hospitalId = selectedAssignment?.hospital?.id || selectedAssignment?.hospital?._id;
  const hospitalName = selectedAssignment?.hospital?.name || 'Assigned Hospital';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading clinical assignments...</p>
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

  if (assignments.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
        <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Active Clinical Assignments</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          To create or view clinical medical records, a Hospital Administrator must first establish an active Doctor–Patient Assignment for you within an approved facility.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Selector Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Active Clinical Patient Selection
          </label>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {assignments.map((a) => {
                const aId = a.id || a._id;
                const pName = a.patient?.user?.name || a.patient?.patientId || 'Patient';
                const hName = a.hospital?.name || 'Hospital';
                return (
                  <option key={aId} value={aId}>
                    {pName} ({a.patient?.patientId || 'ID'}) — {hName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {selectedAssignment && (
          <div className="flex items-center gap-4 text-xs text-slate-400 sm:border-l sm:border-slate-800 sm:pl-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Facility</span>
              <span className="text-slate-200 font-medium">{hospitalName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Status</span>
              <span className="text-emerald-400 font-bold">ACTIVE CLINICAL CARE</span>
            </div>
          </div>
        )}
      </div>

      {/* Render Medical Record Timeline */}
      {patientId && (
        <MedicalRecordList
          patientId={patientId}
          patientName={patientName}
          hospitalId={hospitalId}
          hospitalName={hospitalName}
          currentUserRole="DOCTOR"
        />
      )}
    </div>
  );
}
