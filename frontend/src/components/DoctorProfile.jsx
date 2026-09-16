import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Phone,
  Calendar,
  Award,
  Briefcase,
  ShieldCheck,
  Edit3,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  FileBadge,
} from 'lucide-react';
import { fetchMyDoctorProfile } from '../services/api';
import DoctorProfileModal from './DoctorProfileModal';

const STATUS_BADGES = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  ACTIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  SUSPENDED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

export default function DoctorProfile({ currentUser }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyDoctorProfile();
      setDoctor(data);
    } catch (err) {
      if (err.code === 'DOCTOR_PROFILE_NOT_FOUND') {
        setDoctor(null);
      } else {
        setError(err.message || 'Failed to load doctor profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSaved = (savedDoctor) => {
    setDoctor(savedDoctor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
        <span className="text-sm font-medium">Loading clinical credentials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <span>Doctor Clinical Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Your verified medical identity, specialization, and credentials across the HealthBridge network.
          </p>
        </div>

        <div>
          {doctor ? (
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
              <span>Create Doctor Profile</span>
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

      {!doctor ? (
        <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Clinical Profile Established</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            You are authenticated as a DOCTOR, but have not yet registered your medical license and qualifications.
            Create your clinical profile to request hospital affiliations and access patient records.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-lg shadow-teal-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Doctor Profile Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Credentials Card */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-xl shadow-inner">
                  {doctor.fullName ? doctor.fullName.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">{doctor.fullName}</h3>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        STATUS_BADGES[doctor.status] || STATUS_BADGES.PENDING
                      }`}
                    >
                      {doctor.status}
                    </span>
                  </div>
                  <p className="text-xs text-teal-400 font-medium mt-0.5">{doctor.specialization}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300 self-start sm:self-center">
                <FileBadge className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-mono text-white font-semibold">{doctor.medicalLicenseNumber}</span>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-teal-400" />
                  <span>Clinical Experience</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? 'Year' : 'Years'}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Contact Phone</span>
                </div>
                <p className="text-sm font-semibold text-white">{doctor.phone}</p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  <span>Date of Birth</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toLocaleDateString() : '—'}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Gender</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {doctor.gender ? doctor.gender.replace('_', ' ') : '—'}
                </p>
              </div>
            </div>

            {/* Qualifications */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                <Award className="w-4 h-4 text-teal-400" />
                <span>Verified Qualifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0 ? (
                  doctor.qualifications.map((q, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold rounded-lg"
                    >
                      {q}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">None registered</span>
                )}
              </div>
            </div>
          </div>

          {/* Account & Status Sidebar Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Account Association</span>
              </h4>

              <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <div>
                  <span className="text-[11px] text-slate-400">User Email</span>
                  <p className="text-xs font-semibold text-white truncate">
                    {doctor.user?.email || currentUser?.email || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">User Role</span>
                  <p className="text-xs font-semibold text-teal-400">
                    {doctor.user?.role || currentUser?.role || 'DOCTOR'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Profile Created</span>
                  <p className="text-xs text-slate-300">
                    {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-teal-500/5 border border-teal-500/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-teal-300 mb-1">Status Lifecycle:</p>
                <p className="text-[11px] text-slate-400">
                  {doctor.status === 'PENDING' &&
                    'Your profile is currently PENDING until a hospital administrator approves your first hospital affiliation.'}
                  {doctor.status === 'ACTIVE' &&
                    'Your clinical credentials are ACTIVE. You may consult with patients and operate within affiliated hospitals.'}
                  {doctor.status === 'SUSPENDED' &&
                    'Your clinical privileges are SUSPENDED. Please reach out to your hospital administrator.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify Clinical Details</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <DoctorProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingProfile={doctor}
        onProfileSaved={handleProfileSaved}
      />
    </div>
  );
}
