import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Building2,
  User,
  Clock,
  ExternalLink,
  X,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Code,
  Terminal,
} from 'lucide-react';
import { fetchAuditLogs, fetchHospitals } from '../services/api';

const RESULT_BADGES = {
  SUCCESS: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: ShieldCheck,
    label: 'SUCCESS',
  },
  DENIED: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: AlertTriangle,
    label: 'DENIED',
  },
  FAILURE: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: ShieldX,
    label: 'FAILURE',
  },
};

const ACTION_LABELS = {
  LOGIN_SUCCESS: 'Login Success',
  LOGIN_FAILURE: 'Login Failed',
  LOGOUT: 'User Logout',
  USER_CREATED: 'User Registered',
  USER_ROLE_CHANGED: 'Role Changed',
  HOSPITAL_CREATED: 'Hospital Registered',
  HOSPITAL_STATUS_CHANGED: 'Hospital Status Updated',
  DOCTOR_PROFILE_CREATED: 'Doctor Profile Created',
  DOCTOR_PROFILE_UPDATED: 'Doctor Profile Updated',
  DOCTOR_AFFILIATION_REQUESTED: 'Doctor Affiliation Requested',
  DOCTOR_AFFILIATION_APPROVED: 'Doctor Affiliation Approved',
  DOCTOR_AFFILIATION_REJECTED: 'Doctor Affiliation Rejected',
  DOCTOR_AFFILIATION_SUSPENDED: 'Doctor Affiliation Suspended',
  ASSIGNMENT_CREATED: 'Clinical Assignment Created',
  ASSIGNMENT_ENDED: 'Clinical Assignment Ended',
  MEDICAL_RECORD_CREATED: 'Medical Record Created',
  MEDICAL_RECORD_VIEWED: 'Medical Record Viewed',
  MEDICAL_RECORD_UPDATED: 'Medical Record Updated',
  MEDICAL_RECORD_ACCESS_DENIED: 'Record Access Denied',
  ACCESS_REQUEST_CREATED: 'Access Request Created',
  ACCESS_REQUEST_APPROVED: 'Access Request Approved',
  ACCESS_REQUEST_DENIED: 'Access Request Denied',
  ACCESS_REQUEST_CANCELLED: 'Access Request Cancelled',
  CONSENT_CREATED: 'Consent Created',
  CONSENT_REVOKED: 'Consent Revoked',
  CONSENT_ACCESS_DENIED: 'Consent Denied Record Access',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'Unauthorized Access Attempt',
  TENANT_ACCESS_DENIED: 'Tenant Access Denied',
  ADMIN_CLINICAL_ACCESS_DENIED: 'Admin Clinical Restriction Enforced',
};

export default function AuditLogList({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [requestIdFilter, setRequestIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Auxiliary data
  const [hospitals, setHospitals] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  // Load available hospitals for System Admin filter
  useEffect(() => {
    if (isSystemAdmin) {
      fetchHospitals()
        .then((data) => setHospitals(data || []))
        .catch(() => {});
    }
  }, [isSystemAdmin]);

  const loadLogs = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError('');
      try {
        const filters = {
          page: targetPage,
          limit: pagination.limit,
        };

        if (actionFilter !== 'ALL') filters.action = actionFilter;
        if (resourceTypeFilter !== 'ALL') filters.resourceType = resourceTypeFilter;
        if (resultFilter !== 'ALL') filters.result = resultFilter;
        if (isSystemAdmin && hospitalFilter) filters.hospitalId = hospitalFilter;
        if (requestIdFilter.trim()) filters.requestId = requestIdFilter.trim();
        if (startDateFilter) filters.startDate = startDateFilter;
        if (endDateFilter) filters.endDate = endDateFilter;

        const res = await fetchAuditLogs(filters);
        setLogs(res.auditLogs || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve audit log records');
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.limit,
      actionFilter,
      resourceTypeFilter,
      resultFilter,
      hospitalFilter,
      requestIdFilter,
      startDateFilter,
      endDateFilter,
      isSystemAdmin,
    ]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Security Audit Trail</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Immutable
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {isSystemAdmin
              ? 'Platform-wide tamper-resistant audit records across all healthcare institutions.'
              : 'Institutional audit log for clinical, administrative, and access events in your facility.'}
          </p>
        </div>
        <button
          onClick={() => loadLogs(pagination.page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-sm font-medium rounded-xl border border-slate-700/60 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Result Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Result Status</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="DENIED">DENIED (Security Restriction)</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Action Category</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILURE">Login Failure</option>
              <option value="LOGOUT">Logout</option>
              <option value="MEDICAL_RECORD_CREATED">Medical Record Created</option>
              <option value="MEDICAL_RECORD_VIEWED">Medical Record Viewed</option>
              <option value="MEDICAL_RECORD_UPDATED">Medical Record Updated</option>
              <option value="ADMIN_CLINICAL_ACCESS_DENIED">Admin Clinical Restriction</option>
              <option value="ACCESS_REQUEST_CREATED">Access Request Created</option>
              <option value="ACCESS_REQUEST_APPROVED">Access Request Approved</option>
              <option value="ACCESS_REQUEST_DENIED">Access Request Denied</option>
              <option value="ACCESS_REQUEST_CANCELLED">Access Request Cancelled</option>
              <option value="CONSENT_CREATED">Consent Created</option>
              <option value="CONSENT_REVOKED">Consent Revoked</option>
              <option value="CONSENT_ACCESS_DENIED">Consent Access Denied</option>
              <option value="ASSIGNMENT_CREATED">Assignment Created</option>
              <option value="ASSIGNMENT_ENDED">Assignment Ended</option>
              <option value="HOSPITAL_CREATED">Hospital Created</option>
              <option value="HOSPITAL_STATUS_CHANGED">Hospital Status Changed</option>
              <option value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized Access Attempt</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Resource Type</label>
            <select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Resources</option>
              <option value="MEDICAL_RECORD">MEDICAL_RECORD</option>
              <option value="ACCESS_REQUEST">ACCESS_REQUEST</option>
              <option value="CONSENT">CONSENT</option>
              <option value="ASSIGNMENT">ASSIGNMENT</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="HOSPITAL">HOSPITAL</option>
              <option value="AUTHENTICATION">AUTHENTICATION</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Hospital Filter (System Admin only) */}
          {isSystemAdmin ? (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Facility / Hospital</label>
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Facilities</option>
                {hospitals.map((h) => (
                  <option key={h.id || h._id} value={h.id || h._id}>
                    {h.name} ({h.hospitalCode})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Correlation Request ID</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Request ID..."
                  value={requestIdFilter}
                  onChange={(e) => setRequestIdFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Second row of filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">End Date</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {isSystemAdmin && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Request Correlation ID</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Request ID..."
                  value={requestIdFilter}
                  onChange={(e) => setRequestIdFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Retrieving security audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No Audit Events Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No audit logs matched the specified filter criteria. Adjust your search or reset filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Facility / Tenant</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs.map((log) => {
                  const resultTheme = RESULT_BADGES[log.result] || RESULT_BADGES.SUCCESS;
                  const ResultIcon = resultTheme.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>

                      {/* Result */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${resultTheme.bg} ${resultTheme.border} ${resultTheme.text}`}
                        >
                          <ResultIcon className="w-3.5 h-3.5" />
                          {resultTheme.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        <div className="text-xs font-semibold">
                          {ACTION_LABELS[log.action] || log.action}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{log.action}</div>
                      </td>

                      {/* Resource */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700/50">
                          {log.resourceType}
                        </span>
                        {log.resourceId && (
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-[120px] mt-0.5">
                            {log.resourceId}
                          </div>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <div className="font-medium text-slate-200">
                          {log.actor?.name || 'Anonymous / System'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {log.actorRole || 'SYSTEM'}
                        </div>
                      </td>

                      {/* Facility */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        {log.hospital ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{log.hospital.name || log.hospital.hospitalCode || 'Assigned Facility'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-medium border border-slate-700/60 transition-colors"
                        >
                          View Context
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-950/60">
            <span className="text-xs text-slate-400">
              Showing page <span className="font-semibold text-slate-200">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{pagination.pages}</span> ({pagination.total} total
              events)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(selectedLog.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Result & Reason
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      RESULT_BADGES[selectedLog.result]?.bg
                    } ${RESULT_BADGES[selectedLog.result]?.text}`}
                  >
                    {selectedLog.result}
                  </span>
                  {selectedLog.reasonCode && (
                    <span className="font-mono text-slate-300 text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {selectedLog.reasonCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Correlation ID
                </span>
                <div className="font-mono text-indigo-300 truncate select-all text-[11px]">
                  {selectedLog.requestId || '—'}
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Actor</span>
                <div className="font-medium text-slate-200">
                  {selectedLog.actor?.name || 'Anonymous'} ({selectedLog.actorRole})
                </div>
                {selectedLog.actor?.email && (
                  <div className="text-slate-500 font-mono text-[11px]">{selectedLog.actor.email}</div>
                )}
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Client Network Context
                </span>
                <div className="text-slate-300 font-mono text-[11px]">IP: {selectedLog.ipAddress || '127.0.0.1'}</div>
                <div className="text-slate-500 truncate text-[10px]" title={selectedLog.userAgent}>
                  UA: {selectedLog.userAgent || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Sanitized Context Metadata */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                Sanitized Non-Sensitive Context Metadata
              </span>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
