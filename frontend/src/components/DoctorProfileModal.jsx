import React, { useState, useEffect } from 'react';
import { X, Stethoscope, Phone, Award, Briefcase, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { createDoctorProfile, updateMyDoctorProfile } from '../services/api';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

export default function DoctorProfileModal({ isOpen, onClose, existingProfile, onProfileSaved }) {
  const isEdit = !!existingProfile;

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'MALE',
    dateOfBirth: '',
    medicalLicenseNumber: '',
    specialization: '',
    qualifications: '',
    yearsOfExperience: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingProfile) {
      setFormData({
        fullName: existingProfile.fullName || '',
        phone: existingProfile.phone || '',
        gender: existingProfile.gender || 'MALE',
        dateOfBirth: existingProfile.dateOfBirth
          ? new Date(existingProfile.dateOfBirth).toISOString().split('T')[0]
          : '',
        medicalLicenseNumber: existingProfile.medicalLicenseNumber || '',
        specialization: existingProfile.specialization || '',
        qualifications: Array.isArray(existingProfile.qualifications)
          ? existingProfile.qualifications.join(', ')
          : existingProfile.qualifications || '',
        yearsOfExperience: existingProfile.yearsOfExperience || 0,
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        gender: 'MALE',
        dateOfBirth: '',
        medicalLicenseNumber: '',
        specialization: '',
        qualifications: '',
        yearsOfExperience: 0,
      });
    }
    setError('');
  }, [existingProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse comma-separated qualifications
      const qualificationsList = formData.qualifications
        .split(',')
        .map((q) => q.trim())
        .filter(Boolean);

      if (qualificationsList.length === 0) {
        throw new Error('Please enter at least one qualification (e.g. MBBS, MD)');
      }

      let savedDoctor;
      if (isEdit) {
        savedDoctor = await updateMyDoctorProfile({
          phone: formData.phone,
          specialization: formData.specialization,
          qualifications: qualificationsList,
          yearsOfExperience: Number(formData.yearsOfExperience),
        });
      } else {
        savedDoctor = await createDoctorProfile({
          fullName: formData.fullName,
          phone: formData.phone,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          medicalLicenseNumber: formData.medicalLicenseNumber,
          specialization: formData.specialization,
          qualifications: qualificationsList,
          yearsOfExperience: Number(formData.yearsOfExperience),
        });
      }

      onProfileSaved(savedDoctor);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save doctor profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isEdit ? 'Edit Doctor Profile' : 'Create Clinical Identity'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEdit
                ? 'Update your contact details, specialization, and qualifications'
                : 'Enter your clinical credentials and medical license to practice in HealthBridge'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Full Clinical Name {isEdit && <span className="text-slate-500 font-normal">(locked)</span>}
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              placeholder="e.g. Dr. Sarah Jenkins"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Medical License & Specialization Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Medical License Number {isEdit && <span className="text-slate-500 font-normal">(locked)</span>}
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                placeholder="e.g. MED-88291-NY"
                value={formData.medicalLicenseNumber}
                onChange={(e) => setFormData({ ...formData, medicalLicenseNumber: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Specialization
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cardiology, Neurology, General Medicine"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Qualifications & Years of Experience Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Qualifications <span className="text-slate-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, MD, FRCP"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                max="70"
                required
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Gender & DOB Row (Locked on edit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Gender {isEdit && <span className="text-slate-500 font-normal">(locked)</span>}
              </label>
              <select
                disabled={isEdit}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date of Birth {isEdit && <span className="text-slate-500 font-normal">(locked)</span>}
              </label>
              <input
                type="date"
                required
                disabled={isEdit}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'Save Changes' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
