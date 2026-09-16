import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, CheckCircle2, AlertCircle, Loader2, Stethoscope, ArrowRight } from 'lucide-react';
import { fetchHospitals, requestDoctorAffiliation } from '../services/api';

export default function JoinHospitalAffiliationModal({
  isOpen,
  onClose,
  existingAffiliations = [],
  onAffiliationCreated,
}) {
  const [approvedHospitals, setApprovedHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    setSelectedHospitalId('');
    setDepartment('');
    setError('');
    setSuccessMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Map existing affiliations by hospital ID for easy lookup
  const existingHospitalIds = new Set(
    existingAffiliations.map((a) =>
      typeof a.hospital === 'object' ? a.hospital.id || a.hospital._id : a.hospital
    )
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalId) {
      setError('Please select a hospital to request affiliation with');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const newAffiliation = await requestDoctorAffiliation(selectedHospitalId, department.trim());
      setSuccessMessage('Hospital affiliation request submitted successfully (Status: PENDING).');
      if (onAffiliationCreated) {
        onAffiliationCreated(newAffiliation);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit hospital affiliation request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Request Hospital Affiliation</h3>
            <p className="text-xs text-slate-400">
              Affiliate with approved health networks to provide consultations and access medical data.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-teal-400" />
            <span>Loading approved healthcare networks...</span>
          </div>
        ) : approvedHospitals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-white">No Approved Hospitals Available</p>
            <p className="text-xs text-slate-500 mt-1">
              There are currently no hospitals in APPROVED status to affiliate with.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Approved Hospital
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {approvedHospitals.map((hosp) => {
                  const isAffiliated = existingHospitalIds.has(hosp.id);
                  const isSelected = selectedHospitalId === hosp.id;

                  return (
                    <div
                      key={hosp.id}
                      onClick={() => !isAffiliated && setSelectedHospitalId(hosp.id)}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isAffiliated
                          ? 'bg-slate-950/30 border-slate-800/40 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-500/10 border-teal-500/50 cursor-pointer shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{hosp.name}</span>
                            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {hosp.hospitalCode}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>
                              {hosp.address?.city}, {hosp.address?.state}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isAffiliated ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md">
                            Already Affiliated
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-bold text-teal-400 bg-teal-500/20 px-2 py-1 rounded-md">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 group-hover:text-white">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Clinical Department <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Cardiology, General Surgery, ICU, Outpatient"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

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
                disabled={submitting || !selectedHospitalId}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Request Affiliation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
