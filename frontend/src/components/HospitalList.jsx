import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, MapPin, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchHospitals } from '../services/api';
import HospitalDetailModal from './HospitalDetailModal';
import HospitalFormModal from './HospitalFormModal';

export default function HospitalList({ currentUser, onRequireAuth }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const list = await fetchHospitals({ status: statusFilter });
      setHospitals(list || []);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, [statusFilter]);

  const statusColors = {
    PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    SUSPENDED: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  const handleRegisterClick = () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <span>Healthcare Organizations & Hospitals</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered hospitals participating in the HealthBridge multi-hospital network.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadHospitals}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Refresh Hospital List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleRegisterClick}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white transition-all shadow-md shadow-teal-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Register Hospital</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === st
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Hospital Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm font-mono">
          Loading hospital directory...
        </div>
      ) : hospitals.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Hospitals Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'ALL'
              ? 'No healthcare organizations have been registered yet. Click "Register Hospital" to submit the first hospital.'
              : `No hospitals currently have status '${statusFilter}'.`}
          </p>
          {statusFilter === 'ALL' && (
            <button
              onClick={handleRegisterClick}
              className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white"
            >
              Register First Hospital
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <div
              key={h.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-xl hover:shadow-black/40 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-teal-400 border border-slate-800">
                    {h.hospitalCode}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[h.status]}`}>
                    {h.status}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                  {h.name}
                </h4>

                <div className="flex items-center space-x-1 text-xs text-slate-400 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{h.address?.city}, {h.address?.state}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-600" />
                  <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                </div>

                <button
                  onClick={() => setSelectedHospital(h)}
                  className="inline-flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-medium"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details & Admin Status Modal */}
      <HospitalDetailModal
        hospital={selectedHospital}
        currentUser={currentUser}
        isOpen={Boolean(selectedHospital)}
        onClose={() => setSelectedHospital(null)}
        onStatusUpdated={(updated) => {
          setSelectedHospital(updated);
          loadHospitals();
        }}
      />

      {/* Registration Form Modal */}
      <HospitalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onHospitalCreated={(newHospital) => {
          loadHospitals();
          setSelectedHospital(newHospital);
        }}
      />

    </div>
  );
}
