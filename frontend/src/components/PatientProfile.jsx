import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  Heart,
  Calendar,
  ShieldCheck,
  Edit3,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { fetchMyPatientProfile } from '../services/api';
import PatientProfileModal from './PatientProfileModal';

export default function PatientProfile({ currentUser }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSaved = (savedPatient) => {
    setPatient(savedPatient);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
        <span className="text-sm font-medium">Loading patient record...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <User className="w-5 h-5 text-teal-400" />
            <span>My Patient Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personal medical identity and contact credentials in the HealthBridge network.
          </p>
        </div>

        <div>
          {patient ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Patient Profile</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!patient ? (
        <div className="p-8 border border-dashed border-slate-700/80 rounded-2xl bg-slate-900/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Patient Profile Created Yet</h3>
            <p className="text-xs text-slate-400">
              You are authenticated as <span className="text-teal-400 font-semibold">{currentUser?.email}</span>.
              Create your patient profile to establish your server-verified patient identifier and join participating hospitals.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Profile Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Card */}
          <div className="md:col-span-1 p-6 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 text-lg font-bold">
                {patient.user?.name ? patient.user.name[0].toUpperCase() : 'P'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">{patient.user?.name}</h3>
                <p className="text-xs text-slate-400">{patient.user?.email}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                  Patient ID (Read-only)
                </span>
                <div className="mt-1 flex items-center justify-between px-3 py-2 bg-slate-950 border border-teal-500/30 rounded-xl">
                  <span className="font-mono font-bold text-sm text-teal-300">{patient.patientId}</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-md font-mono">
                    VERIFIED
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                  Record Status
                </span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      patient.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    {patient.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Demographic & Contact Details */}
          <div className="md:col-span-2 p-6 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl space-y-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Demographic & Clinical Attributes</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="text-xs font-semibold text-slate-200">
                  {patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : 'Not specified'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">Gender</span>
                <span className="text-xs font-semibold text-slate-200">{patient.gender}</span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">Blood Group</span>
                <span className="text-xs font-bold text-rose-400">{patient.bloodGroup || '—'}</span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl col-span-2 sm:col-span-3">
                <span className="text-[11px] text-slate-400 block mb-0.5">Phone Number</span>
                <span className="text-xs font-semibold text-slate-200 font-mono">{patient.phone}</span>
              </div>
            </div>

            {/* Address */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Address</span>
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                {[
                  patient.address?.street,
                  patient.address?.city,
                  patient.address?.state,
                  patient.address?.postalCode,
                  patient.address?.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address provided'}
              </p>
            </div>

            {/* Emergency Contact */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Emergency Contact</span>
              </h5>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">
                    {patient.emergencyContact?.name || 'None listed'}
                  </span>
                  {patient.emergencyContact?.relationship && (
                    <span className="text-slate-400 ml-2 text-[11px]">
                      ({patient.emergencyContact.relationship})
                    </span>
                  )}
                </div>
                {patient.emergencyContact?.phone && (
                  <span className="font-mono text-teal-300">{patient.emergencyContact.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PatientProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingProfile={patient}
        onProfileSaved={handleProfileSaved}
      />
    </div>
  );
}
