import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { createPatientProfile, updateMyPatientProfile } from '../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function PatientProfileModal({ isOpen, onClose, existingProfile, onProfileSaved }) {
  const isEdit = !!existingProfile;

  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingProfile) {
      setFormData({
        dateOfBirth: existingProfile.dateOfBirth
          ? new Date(existingProfile.dateOfBirth).toISOString().split('T')[0]
          : '',
        gender: existingProfile.gender || 'MALE',
        bloodGroup: existingProfile.bloodGroup || 'O+',
        phone: existingProfile.phone || '',
        address: {
          street: existingProfile.address?.street || '',
          city: existingProfile.address?.city || '',
          state: existingProfile.address?.state || '',
          postalCode: existingProfile.address?.postalCode || '',
          country: existingProfile.address?.country || 'India',
        },
        emergencyContact: {
          name: existingProfile.emergencyContact?.name || '',
          relationship: existingProfile.emergencyContact?.relationship || '',
          phone: existingProfile.emergencyContact?.phone || '',
        },
      });
    } else {
      setFormData({
        dateOfBirth: '',
        gender: 'MALE',
        bloodGroup: 'O+',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'India',
        },
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
        },
      });
    }
    setError('');
  }, [existingProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        // Editable fields only: phone, bloodGroup, address, emergencyContact
        const payload = {
          phone: formData.phone,
          bloodGroup: formData.bloodGroup || null,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
        };
        const updated = await updateMyPatientProfile(payload);
        onProfileSaved(updated);
      } else {
        const payload = {
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup || null,
          phone: formData.phone,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
        };
        const created = await createPatientProfile(payload);
        onProfileSaved(created);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save patient profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isEdit ? 'Edit Patient Profile' : 'Create Patient Profile'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEdit
                ? 'Update your contact and demographic details. Patient ID is immutable.'
                : 'Initialize your patient profile in the HealthBridge multi-hospital network.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Read-only Patient ID if editing */}
          {isEdit && existingProfile?.patientId && (
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Patient Identifier:</span>
              <span className="font-mono font-bold text-teal-400">{existingProfile.patientId}</span>
            </div>
          )}

          {/* Demographic Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date of Birth {!isEdit && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="date"
                required={!isEdit}
                disabled={isEdit}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isEdit && (
                <span className="text-[10px] text-slate-500 mt-0.5 block">Date of birth is immutable once set</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gender {!isEdit && <span className="text-rose-400">*</span>}
              </label>
              <select
                disabled={isEdit}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>Residential Address</span>
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Street Address"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="City *"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                />
                <input
                  type="text"
                  required
                  placeholder="State *"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={formData.address.postalCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, postalCode: e.target.value },
                    })
                  }
                  className="col-span-2 sm:col-span-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency Contact</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Contact Name"
                value={formData.emergencyContact.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, name: e.target.value },
                  })
                }
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Parent)"
                value={formData.emergencyContact.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, relationship: e.target.value },
                  })
                }
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <input
                type="tel"
                placeholder="Emergency Phone"
                value={formData.emergencyContact.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, phone: e.target.value },
                  })
                }
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
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
