import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { fetchHospitals, requestHospitalMembership } from '../services/api';

export default function JoinHospitalModal({ isOpen, onClose, existingMemberships = [], onMembershipCreated }) {
  const [approvedHospitals, setApprovedHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadApprovedHospitals = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await fetchHospitals({ status: 'APPROVED' });
        setApprovedHospitals(list || []);
      } catch (err) {
        setError(err.message || 'Failed to load approved hospitals');
      } finally {
        setLoading(false);
      }
    };

    loadApprovedHospitals();
  }, [isOpen]);

  if (!isOpen) return null;

  // Map existing memberships by hospital ID for easy lookup
  const existingHospitalIds = new Set(
    existingMemberships.map((m) =>
      typeof m.hospital === 'object' ? m.hospital.id || m.hospital._id : m.hospital
    )
  );

  const handleRequestMembership = async (hospitalId) => {
    setSubmittingId(hospitalId);
    setError('');
    setSuccessMessage('');

    try {
      const newMembership = await requestHospitalMembership(hospitalId);
      setSuccessMessage('Membership request submitted successfully. Status: PENDING.');
      if (onMembershipCreated) {
        onMembershipCreated(newMembership);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit membership request');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Join a Participating Hospital</h3>
            <p className="text-xs text-slate-400">
              Select an approved healthcare network partner to request patient-hospital membership.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400 mr-2" />
            <span className="text-xs">Loading approved hospitals...</span>
          </div>
        ) : approvedHospitals.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
            No approved hospitals are currently available to join.
          </div>
        ) : (
          <div className="space-y-3">
            {approvedHospitals.map((hospital) => {
              const alreadyMember = existingHospitalIds.has(hospital.id);
              const isSubmitting = submittingId === hospital.id;

              return (
                <div
                  key={hospital.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{hospital.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700">
                        {hospital.hospitalCode}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-teal-400/80" />
                      <span>
                        {hospital.address?.city}, {hospital.address?.state} ({hospital.address?.country})
                      </span>
                    </div>
                  </div>

                  <div>
                    {alreadyMember ? (
                      <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800/80 text-slate-400 rounded-lg text-xs font-semibold border border-slate-700/60 cursor-default">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Already Linked</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestMembership(hospital.id)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Request Membership</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
