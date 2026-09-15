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

