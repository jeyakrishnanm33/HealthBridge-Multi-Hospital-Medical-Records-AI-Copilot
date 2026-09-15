import React from 'react';
import { X, Building2, MapPin, Mail, Phone, Calendar, User, Shield } from 'lucide-react';
import HospitalStatusActions from './HospitalStatusActions';

export default function HospitalDetailModal({ hospital, currentUser, isOpen, onClose, onStatusUpdated }) {
  if (!isOpen || !hospital) return null;

  const statusColors = {
    PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    REJECTED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    SUSPENDED: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5 pr-8">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-white">{hospital.name}</h3>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="font-mono text-xs text-teal-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {hospital.hospitalCode}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[hospital.status]}`}>
                {hospital.status}
              </span>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Location</span>
            </div>
            <div className="text-slate-200">
              {hospital.address?.street && <div>{hospital.address.street}</div>}
              <div>{hospital.address?.city}, {hospital.address?.state}</div>
              <div className="text-slate-400">{hospital.address?.country} {hospital.address?.postalCode}</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact Details</span>
            </div>
            <div className="text-slate-200 truncate" title={hospital.contactEmail}>
              {hospital.contactEmail}
            </div>
            <div className="text-slate-400 flex items-center space-x-1">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{hospital.contactPhone}</span>
            </div>
          </div>

        </div>

        {/* Metadata */}
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Registered: {new Date(hospital.createdAt).toLocaleDateString()}</span>
          </div>
          {hospital.registeredBy?.name && (
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>By: {hospital.registeredBy.name}</span>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        <HospitalStatusActions
          hospital={hospital}
          currentUser={currentUser}
          onStatusUpdated={(updatedHospital) => {
            onStatusUpdated(updatedHospital);
          }}
        />

      </div>
    </div>
  );
}
