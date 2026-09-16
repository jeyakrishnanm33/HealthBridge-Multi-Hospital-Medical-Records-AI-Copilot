import { authStorage } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Helper to execute JSON API requests with error handling and optional auth header.
 */
async function apiRequest(endpoint, options = {}) {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    const code = data?.error?.code || 'REQUEST_FAILED';
    const error = new Error(message);
    error.code = code;
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

/**
 * Register a new account.
 * @param {Object} credentials - { name, email, password, role }
 */
export async function registerUser({ name, email, password, role }) {
  const result = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
  if (result?.data?.token) {
    authStorage.setToken(result.data.token);
  }
  return result.data;
}

/**
 * Login with email and password.
 * @param {Object} credentials - { email, password }
 */
export async function loginUser({ email, password }) {
  const result = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (result?.data?.token) {
    authStorage.setToken(result.data.token);
  }
  return result.data;
}

/**
 * Retrieve the current authenticated user profile using stored JWT.
 */
export async function fetchCurrentUser() {
  const token = authStorage.getToken();
  if (!token) return null;

  try {
    const result = await apiRequest('/api/auth/me', {
      method: 'GET',
    });
    return result.data.user;
  } catch (err) {
    if (err.code === 'TOKEN_EXPIRED' || err.code === 'INVALID_TOKEN' || err.code === 'USER_NOT_FOUND') {
      authStorage.removeToken();
    }
    throw err;
  }
}

/**
 * Logout the user by calling server logout and clearing client storage.
 */
export async function logoutUser() {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  } catch {
    // Ignore server error on logout
  } finally {
    authStorage.removeToken();
  }
}

/**
 * Fetch all registered hospitals with optional status filter.
 * @param {Object} [filter] - { status }
 */
export async function fetchHospitals(filter = {}) {
  const query = new URLSearchParams();
  if (filter.status && filter.status !== 'ALL') {
    query.set('status', filter.status);
  }
  const endpoint = `/api/hospitals${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data.hospitals;
}

/**
 * Fetch a single hospital's details by ID.
 * @param {string} id
 */
export async function fetchHospitalById(id) {
  const result = await apiRequest(`/api/hospitals/${id}`, { method: 'GET' });
  return result.data.hospital;
}

/**
 * Register a new hospital (always created as PENDING).
 * Requires authenticated user.
 * @param {Object} hospitalData
 */
export async function registerHospital(hospitalData) {
  const result = await apiRequest('/api/hospitals', {
    method: 'POST',
    body: JSON.stringify(hospitalData),
  });
  return result.data.hospital;
}

/**
 * Update a hospital's lifecycle status (APPROVED, REJECTED, SUSPENDED).
 * Requires authenticated SYSTEM_ADMIN.
 * @param {string} id
 * @param {string} status
 */
export async function updateHospitalStatus(id, status) {
  const result = await apiRequest(`/api/hospitals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return result.data.hospital;
}

/**
 * Fetch health status from the backend API.
 */
export async function checkBackendHealth() {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return {
      connected: true,
      latency,
      data: json.data,
      error: null,
    };
  } catch (error) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    return {
      connected: false,
      latency,
      data: null,
      error: error.name === 'AbortError' ? 'Request timed out after 8s' : (error.message || 'Connection failed'),
    };
  }
}

/**
 * Create patient profile for authenticated PATIENT.
 * @param {Object} data
 */
export async function createPatientProfile(data) {
  const result = await apiRequest('/api/patients/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.patient;
}

/**
 * Fetch current authenticated patient's profile.
 */
export async function fetchMyPatientProfile() {
  const result = await apiRequest('/api/patients/me', {
    method: 'GET',
  });
  return result.data.patient;
}

/**
 * Update current authenticated patient's profile.
 * @param {Object} data
 */
export async function updateMyPatientProfile(data) {
  const result = await apiRequest('/api/patients/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return result.data.patient;
}

/**
 * Fetch current authenticated patient's hospital memberships.
 */
export async function fetchMyHospitalMemberships() {
  const result = await apiRequest('/api/patients/me/hospitals', {
    method: 'GET',
  });
  return result.data.memberships;
}

/**
 * Request membership to an approved hospital.
 * @param {string} hospitalId
 */
export async function requestHospitalMembership(hospitalId) {
  const result = await apiRequest(`/api/patients/me/hospitals/${hospitalId}/membership`, {
    method: 'POST',
  });
  return result.data.membership;
}

/**
 * Fetch all memberships for a specific hospital (Hospital Admin or System Admin).
 * @param {string} hospitalId
 */
export async function fetchHospitalMemberships(hospitalId) {
  const result = await apiRequest(`/api/hospitals/${hospitalId}/memberships`, {
    method: 'GET',
  });
  return result.data.memberships;
}

/**
 * Update membership status (ACTIVE, REJECTED, INACTIVE).
 * @param {string} hospitalId
 * @param {string} membershipId
 * @param {string} status
 */
export async function updateMembershipStatus(hospitalId, membershipId, status) {
  const result = await apiRequest(
    `/api/hospitals/${hospitalId}/memberships/${membershipId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  return result.data.membership;
}

/**
 * Create doctor profile for authenticated DOCTOR.
 * @param {Object} data
 */
export async function createDoctorProfile(data) {
  const result = await apiRequest('/api/doctors/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.doctor;
}

/**
 * Fetch current authenticated doctor's profile.
 */
export async function fetchMyDoctorProfile() {
  const result = await apiRequest('/api/doctors/me', {
    method: 'GET',
  });
  return result.data.doctor;
}

/**
 * Update current authenticated doctor's profile.
 * @param {Object} data
 */
export async function updateMyDoctorProfile(data) {
  const result = await apiRequest('/api/doctors/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return result.data.doctor;
}

/**
 * Fetch current authenticated doctor's hospital affiliations.
 */
export async function fetchMyDoctorAffiliations() {
  const result = await apiRequest('/api/doctors/me/hospitals', {
    method: 'GET',
  });
  return result.data.affiliations;
}

/**
 * Request hospital affiliation for authenticated doctor.
 * @param {string} hospitalId
 * @param {string} [department]
 */
export async function requestDoctorAffiliation(hospitalId, department = '') {
  const result = await apiRequest(`/api/doctors/me/hospitals/${hospitalId}/affiliation`, {
    method: 'POST',
    body: JSON.stringify({ department }),
  });
  return result.data.affiliation;
}

/**
 * Fetch all doctor affiliations for a specific hospital (Hospital Admin or System Admin).
 * @param {string} hospitalId
 */
export async function fetchHospitalDoctors(hospitalId) {
  const result = await apiRequest(`/api/hospitals/${hospitalId}/doctors`, {
    method: 'GET',
  });
  return result.data.affiliations;
}

/**
 * Update doctor affiliation status (ACTIVE, REJECTED, SUSPENDED).
 * @param {string} hospitalId
 * @param {string} affiliationId
 * @param {string} status
 */
export async function updateDoctorAffiliationStatus(hospitalId, affiliationId, status) {
  const result = await apiRequest(
    `/api/hospitals/${hospitalId}/doctors/${affiliationId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  return result.data.affiliation;
}

/**
 * Create a doctor-patient assignment within a hospital facility (Hospital Admin or System Admin).
 * @param {Object} data - { doctorId, patientId, hospitalId, notes }
 */
export async function createDoctorPatientAssignment(data) {
  const result = await apiRequest('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.assignment;
}

/**
 * Fetch doctor-patient assignments with optional filters.
 * @param {Object} [filters] - { hospitalId, doctorId, patientId, status }
 */
export async function fetchAssignments(filters = {}) {
  const query = new URLSearchParams();
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.doctorId) query.set('doctorId', filters.doctorId);
  if (filters.patientId) query.set('patientId', filters.patientId);
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);

  const endpoint = `/api/assignments${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data.assignments;
}

/**
 * Fetch single assignment by ID.
 * @param {string} assignmentId
 */
export async function fetchAssignmentById(assignmentId) {
  const result = await apiRequest(`/api/assignments/${assignmentId}`, {
    method: 'GET',
  });
  return result.data.assignment;
}

/**
 * End an active doctor-patient assignment (Hospital Admin or System Admin).
 * @param {string} assignmentId
 */
export async function endDoctorPatientAssignment(assignmentId) {
  const result = await apiRequest(`/api/assignments/${assignmentId}/end`, {
    method: 'PATCH',
  });
  return result.data.assignment;
}

/**
 * ============================================================================
 * MEDICAL RECORDS DOMAIN API (PHASE 7)
 * ============================================================================
 */

/**
 * Create a new clinical medical record (Authorized Doctor only).
 * @param {Object} data - { patientId, hospitalId, recordType, recordDate, content }
 */
export async function createMedicalRecord(data) {
  const result = await apiRequest('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data.record;
}

/**
 * Fetch medical records for a specific patient.
 * @param {string} patientId
 * @param {Object} [filters] - { recordType, hospitalId, page, limit }
 */
export async function fetchPatientMedicalRecords(patientId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.recordType && filters.recordType !== 'ALL') query.set('recordType', filters.recordType);
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);

  const endpoint = `/api/records/patient/${patientId}${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data;
}

/**
 * Fetch a single medical record by ID.
 * @param {string} recordId
 */
export async function fetchMedicalRecordById(recordId) {
  const result = await apiRequest(`/api/records/${recordId}`, {
    method: 'GET',
  });
  return result.data.record;
}

/**
 * Update an existing medical record's clinical content (Authorized Doctor only).
 * @param {string} recordId
 * @param {Object} updateData - { content, recordDate }
 */
export async function updateMedicalRecord(recordId, updateData) {
  const result = await apiRequest(`/api/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
  return result.data.record;
}

/* =========================================================================
   PHASE 8: CROSS-HOSPITAL ACCESS REQUESTS & PATIENT CONSENT APIS
   ========================================================================= */

/**
 * Create a cross-hospital access request (Doctor only).
 * @param {Object} requestData - { patientId, sourceHospitalId, requestingHospitalId, requestedScopes, purpose, notes }
 */
export async function createAccessRequest(requestData) {
  const result = await apiRequest('/api/access-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
  return result.data.accessRequest;
}

/**
 * List access requests with optional role/status/patient/doctor filters.
 * @param {Object} [filters] - { status, patientId, doctorId, hospitalId, page, limit }
 */
export async function fetchAccessRequests(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.patientId) query.set('patientId', filters.patientId);
  if (filters.doctorId) query.set('doctorId', filters.doctorId);
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);

  const endpoint = `/api/access-requests${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data;
}

/**
 * Fetch a single access request by ID.
 * @param {string} id
 */
export async function fetchAccessRequestById(id) {
  const result = await apiRequest(`/api/access-requests/${id}`, {
    method: 'GET',
  });
  return result.data.accessRequest;
}

/**
 * Approve an access request and create consent (Patient only).
 * @param {string} id
 * @param {Object} approvalData - { expiresAt, scopes }
 */
export async function approveAccessRequest(id, approvalData) {
  const result = await apiRequest(`/api/access-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(approvalData),
  });
  return result.data;
}

/**
 * Deny an access request (Patient only).
 * @param {string} id
 * @param {string} [reason]
 */
export async function denyAccessRequest(id, reason = '') {
  const result = await apiRequest(`/api/access-requests/${id}/deny`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return result.data.accessRequest;
}

/**
 * Cancel an access request (Requesting Doctor only).
 * @param {string} id
 * @param {string} [reason]
 */
export async function cancelAccessRequest(id, reason = '') {
  const result = await apiRequest(`/api/access-requests/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return result.data.accessRequest;
}

/**
 * List patient consents with optional status/doctor/hospital filters.
 * @param {Object} [filters] - { status, patientId, doctorId, hospitalId, page, limit }
 */
export async function fetchConsents(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.patientId) query.set('patientId', filters.patientId);
  if (filters.doctorId) query.set('doctorId', filters.doctorId);
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);

  const endpoint = `/api/consents${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data;
}

/**
 * Fetch a single consent by ID.
 * @param {string} id
 */
export async function fetchConsentById(id) {
  const result = await apiRequest(`/api/consents/${id}`, {
    method: 'GET',
  });
  return result.data.consent;
}

/**
 * Revoke an active clinical consent (Patient only).
 * @param {string} id
 * @param {string} [reason]
 */
export async function revokeConsent(id, reason = '') {
  const result = await apiRequest(`/api/consents/${id}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return result.data.consent;
}

/**
 * Fetch paginated audit logs with optional filters (System Admin or Hospital Admin).
 * @param {Object} [filters]
 */
export async function fetchAuditLogs(filters = {}) {
  const query = new URLSearchParams();
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.action && filters.action !== 'ALL') query.set('action', filters.action);
  if (filters.resourceType && filters.resourceType !== 'ALL') query.set('resourceType', filters.resourceType);
  if (filters.result && filters.result !== 'ALL') query.set('result', filters.result);
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.patientId) query.set('patientId', filters.patientId);
  if (filters.actorId) query.set('actorId', filters.actorId);
  if (filters.requestId) query.set('requestId', filters.requestId);
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);

  const endpoint = `/api/audit-logs${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result.data;
}

/**
 * Fetch single audit log event by ID (Admin only).
 * @param {string} id
 */
export async function fetchAuditLogById(id) {
  const result = await apiRequest(`/api/audit-logs/${id}`, {
    method: 'GET',
  });
  return result.data.auditLog;
}

/* =========================================================================
   PHASE 10: NOTIFICATIONS & CLINICAL EVENT COMMUNICATION APIS
   ========================================================================= */

/**
 * Fetch paginated notifications for the authenticated user.
 * @param {Object} [filters] - { page, limit, status, type }
 */
export async function fetchNotifications(filters = {}) {
  const query = new URLSearchParams();
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.type) query.set('type', filters.type);

  const endpoint = `/api/notifications${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result;
}

/**
 * Fetch unread notification count for the authenticated user.
 */
export async function fetchUnreadNotificationCount() {
  const result = await apiRequest('/api/notifications/unread-count', {
    method: 'GET',
  });
  return result.unreadCount || 0;
}

/**
 * Fetch single notification by ID for the authenticated recipient.
 * @param {string} id
 */
export async function fetchNotificationById(id) {
  const result = await apiRequest(`/api/notifications/${id}`, {
    method: 'GET',
  });
  return result.notification;
}

/**
 * Mark a single notification as read.
 * @param {string} id
 */
export async function markNotificationAsRead(id) {
  const result = await apiRequest(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return result.notification;
}

/**
 * Mark all unread notifications as read for current user.
 */
export async function markAllNotificationsAsRead() {
  const result = await apiRequest('/api/notifications/read-all', {
    method: 'PATCH',
  });
  return result;
}

/* =========================================================================
   PHASE 11: APPOINTMENT & SCHEDULING DOMAIN APIS
   ========================================================================= */

/**
 * Fetch appointments with optional filters and pagination.
 * @param {Object} [filters] - { hospitalId, doctorId, patientId, status, startDate, endDate, upcoming, page, limit }
 */
export async function fetchAppointments(filters = {}) {
  const query = new URLSearchParams();
  if (filters.hospitalId) query.set('hospitalId', filters.hospitalId);
  if (filters.doctorId) query.set('doctorId', filters.doctorId);
  if (filters.patientId) query.set('patientId', filters.patientId);
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.upcoming) query.set('upcoming', filters.upcoming);
  if (filters.page) query.set('page', filters.page);
  if (filters.limit) query.set('limit', filters.limit);

  const endpoint = `/api/appointments${query.toString() ? `?${query.toString()}` : ''}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result?.data || { appointments: [], pagination: {} };
}

/**
 * Fetch a single appointment by ID.
 * @param {string} id
 */
export async function fetchAppointmentById(id) {
  const result = await apiRequest(`/api/appointments/${id}`, {
    method: 'GET',
  });
  return result?.data?.appointment;
}

/**
 * Create an appointment (status will be REQUESTED if patient, CONFIRMED if doctor/admin).
 * @param {Object} appointmentData - { doctorId, patientId, hospitalId, appointmentDate, startTime, endTime, reason, notes }
 */
export async function createAppointment(appointmentData) {
  const result = await apiRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData),
  });
  return result?.data?.appointment;
}

/**
 * Confirm a requested appointment.
 * @param {string} id
 */
export async function confirmAppointment(id) {
  const result = await apiRequest(`/api/appointments/${id}/confirm`, {
    method: 'PATCH',
  });
  return result?.data?.appointment;
}

/**
 * Reject a requested appointment.
 * @param {string} id
 * @param {string} rejectionReason
 */
export async function rejectAppointment(id, rejectionReason) {
  const result = await apiRequest(`/api/appointments/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason }),
  });
  return result?.data?.appointment;
}

/**
 * Cancel an appointment.
 * @param {string} id
 * @param {string} cancellationReason
 */
export async function cancelAppointment(id, cancellationReason) {
  const result = await apiRequest(`/api/appointments/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ cancellationReason }),
  });
  return result?.data?.appointment;
}

/**
 * Reschedule an appointment.
 * @param {string} id
 * @param {Object} rescheduleData - { appointmentDate, startTime, endTime, reason }
 */
export async function rescheduleAppointment(id, rescheduleData) {
  const result = await apiRequest(`/api/appointments/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(rescheduleData),
  });
  return result?.data?.appointment;
}

/**
 * Complete a confirmed appointment.
 * @param {string} id
 */
export async function completeAppointment(id) {
  const result = await apiRequest(`/api/appointments/${id}/complete`, {
    method: 'PATCH',
  });
  return result?.data?.appointment;
}

/**
 * Mark a confirmed appointment as no-show.
 * @param {string} id
 */
export async function markAppointmentNoShow(id) {
  const result = await apiRequest(`/api/appointments/${id}/no-show`, {
    method: 'PATCH',
  });
  return result?.data?.appointment;
}


