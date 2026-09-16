import React from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Shield,
  Activity,
  UserCheck,
} from 'lucide-react';

const STATUS_CONFIG = {
  REQUESTED: {
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    icon: Clock,
    label: 'Requested (Pending Confirmation)',
  },
  CONFIRMED: {
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    label: 'Confirmed',
  },
  COMPLETED: {
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    icon: CheckCircle2,
    label: 'Completed',
  },
  CANCELLED: {
    badge: 'bg-slate-500/10 text-slate-400 border-slate-700/50',
    icon: XCircle,
    label: 'Cancelled',
  },
  REJECTED: {
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    icon: XCircle,
    label: 'Rejected',
  },
  NO_SHOW: {
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    icon: AlertCircle,
    label: 'No-Show',
  },
};

export default function AppointmentDetailModal({ isOpen, onClose, appointment }) {
  if (!isOpen || !appointment) return null;

  const statusInfo = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.REQUESTED;
  const StatusIcon = statusInfo.icon;

  const formattedDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Clinical Appointment Overview</h2>
              <p className="text-xs text-slate-400 font-mono">ID: {appointment.id || appointment._id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <StatusIcon className="w-5 h-5 text-slate-300" />
              <div>
                <div className="text-xs text-slate-400">Current Status</div>
                <div className="text-sm font-semibold text-white">{statusInfo.label}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.badge}`}
            >
              {appointment.status}
            </span>
          </div>

          {/* Date & Time Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Scheduled Date
              </div>
              <div className="text-sm font-medium text-white">{formattedDate}</div>
            </div>

            <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-cyan-400" />
                Time Slot
              </div>
              <div className="text-sm font-medium text-white">
                {appointment.startTime} – {appointment.endTime}
              </div>
            </div>
          </div>

          {/* Stakeholders Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hospital */}
            <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Hospital
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {appointment.hospital?.name || 'Hospital Facility'}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {appointment.hospital?.hospitalCode || '—'}
                </div>
              </div>
            </div>

            {/* Doctor */}
            <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                Physician
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {appointment.doctor?.fullName || 'Doctor'}
                </div>
                <div className="text-xs text-emerald-400">
                  {appointment.doctor?.specialization || 'General Practice'}
                </div>
              </div>
            </div>

            {/* Patient */}
            <div className="p-4 bg-slate-800/20 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Patient
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {appointment.patient?.user?.name || appointment.patient?.patientId || 'Patient'}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  ID: {appointment.patient?.patientId || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Reasons & Notes */}
          <div className="space-y-3">
            {appointment.reason && (
              <div className="p-3.5 bg-slate-800/20 border border-slate-800 rounded-xl space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reason for Visit
                </div>
                <div className="text-sm text-slate-200">{appointment.reason}</div>
              </div>
            )}

            {appointment.notes && (
              <div className="p-3.5 bg-slate-800/20 border border-slate-800 rounded-xl space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Preparation Notes
                </div>
                <div className="text-sm text-slate-300">{appointment.notes}</div>
              </div>
            )}

            {appointment.rejectionReason && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                  Rejection Reason
                </div>
                <div className="text-sm text-rose-200">{appointment.rejectionReason}</div>
              </div>
            )}

            {appointment.cancellationReason && (
              <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cancellation Reason
                </div>
                <div className="text-sm text-slate-300">{appointment.cancellationReason}</div>
              </div>
            )}
          </div>

          {/* Audit & Transition Timeline Details */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400">
            <div>
              <span className="block text-slate-500">Created:</span>
              <span className="font-mono text-slate-300">
                {appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
            {appointment.confirmedAt && (
              <div>
                <span className="block text-slate-500">Confirmed:</span>
                <span className="font-mono text-emerald-400">
                  {new Date(appointment.confirmedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {appointment.completedAt && (
              <div>
                <span className="block text-slate-500">Completed:</span>
                <span className="font-mono text-cyan-400">
                  {new Date(appointment.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {appointment.cancelledAt && (
              <div>
                <span className="block text-slate-500">Cancelled:</span>
                <span className="font-mono text-slate-400">
                  {new Date(appointment.cancelledAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
