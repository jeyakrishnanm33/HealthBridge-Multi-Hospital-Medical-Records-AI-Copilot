import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  UserPlus
} from 'lucide-react';
import { checkBackendHealth, fetchCurrentUser, logoutUser } from './services/api';

// Layout Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import SystemHealthDrawer from './components/layout/SystemHealthDrawer';

// Modals & User Cards
import AuthModal from './components/AuthModal';
import UserProfileCard from './components/UserProfileCard';
import CreateAccessRequestModal from './components/CreateAccessRequestModal';

// Feature Views
import HospitalList from './components/HospitalList';
import PatientProfile from './components/PatientProfile';
import HospitalMembershipList from './components/HospitalMembershipList';
import HospitalPatientList from './components/HospitalPatientList';
import DoctorProfile from './components/DoctorProfile';
import DoctorHospitalAffiliationList from './components/DoctorHospitalAffiliationList';
import HospitalDoctorList from './components/HospitalDoctorList';
import DoctorPatientAssignmentList from './components/DoctorPatientAssignmentList';
import DoctorClinicalRecordsView from './components/DoctorClinicalRecordsView';
import PatientMedicalRecordsView from './components/PatientMedicalRecordsView';
import AccessRequestList from './components/AccessRequestList';
import ConsentList from './components/ConsentList';
import AuditLogList from './components/AuditLogList';
import AppointmentList from './components/AppointmentList';
import SemanticSearch from './components/SemanticSearch';
import ClinicalAssistant from './components/ClinicalAssistant';

export default function App() {
  const [activeTab, setActiveTab] = useState('hospitals');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Authentication State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isCreateAccessRequestOpen, setIsCreateAccessRequestOpen] = useState(false);

  // Layout UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);

  // Health check polling
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setLastUpdated(new Date().toLocaleTimeString());
    setHealthLoading(false);
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // Set sensible default tab depending on role
          if (currentUser.role === 'HOSPITAL_ADMIN') {
            setActiveTab('hospital-assignments');
          } else if (currentUser.role === 'DOCTOR') {
            setActiveTab('doctor-records');
          } else if (currentUser.role === 'PATIENT') {
            setActiveTab('patient-records');
          }
        }
      } catch (err) {
        console.warn('No active session or session expired:', err.message);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
    fetchHealth();
  }, [fetchHealth]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setActiveTab('hospitals');
  };

  const isBackendUp = health?.connected;
  const isDbUp = health?.data?.database?.connected;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        authLoading={authLoading}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        health={health}
        healthLoading={healthLoading}
        onOpenHealthDrawer={() => setIsHealthDrawerOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex">
        
        {/* Role-Aware Sidebar */}
        <Sidebar
          user={user}
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
            
            {/* User Identity / Guest Prompt Card */}
            {user ? (
              <UserProfileCard user={user} onLogout={handleLogout} />
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <UserPlus className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Unauthenticated Session</h3>
                    <p className="text-[11px] text-slate-400">
                      Sign in or register an account as DOCTOR, PATIENT, or HOSPITAL_ADMIN to test role-based privileges.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm self-start sm:self-auto transition-colors"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {/* TAB RENDERING (Preserving all component mounts and props) */}

            {/* Tab: Doctor-Patient Assignments (Hospital Admin & System Admin) */}
            {activeTab === 'hospital-assignments' &&
              (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
                <DoctorPatientAssignmentList currentUser={user} />
              )}

            {/* Tab: Clinical AI Assistant (Doctor role) */}
            {activeTab === 'doctor-assistant' && user?.role === 'DOCTOR' && (
              <ClinicalAssistant currentUser={user} />
            )}

            {/* Tab: Semantic Clinical Search (Doctor role) */}
            {activeTab === 'doctor-search' && user?.role === 'DOCTOR' && (
              <SemanticSearch currentUser={user} />
            )}

            {/* Tab: Clinical Medical Records (Doctor role) */}
            {activeTab === 'doctor-records' && user?.role === 'DOCTOR' && (
              <DoctorClinicalRecordsView currentUser={user} />
            )}

            {/* Tab: My Patient Assignments (Doctor role) */}
            {activeTab === 'doctor-assignments' && user?.role === 'DOCTOR' && (
              <DoctorPatientAssignmentList currentUser={user} />
            )}

            {/* Tab: Clinical AI Assistant (Patient role) */}
            {activeTab === 'patient-assistant' && user?.role === 'PATIENT' && (
              <ClinicalAssistant currentUser={user} />
            )}

            {/* Tab: Semantic Clinical Search (Patient role) */}
            {activeTab === 'patient-search' && user?.role === 'PATIENT' && (
              <SemanticSearch currentUser={user} />
            )}

            {/* Tab: My Medical Records (Patient role) */}
            {activeTab === 'patient-records' && user?.role === 'PATIENT' && (
              <PatientMedicalRecordsView currentUser={user} />
            )}

            {/* Tab: My Attending Doctors (Patient role) */}
            {activeTab === 'patient-assignments' && user?.role === 'PATIENT' && (
              <DoctorPatientAssignmentList currentUser={user} />
            )}

            {/* Tab: Doctor Profile (Doctor role) */}
            {activeTab === 'doctor-profile' && user?.role === 'DOCTOR' && (
              <DoctorProfile currentUser={user} />
            )}

            {/* Tab: Doctor Hospital Affiliations (Doctor role) */}
            {activeTab === 'doctor-affiliations' && user?.role === 'DOCTOR' && (
              <DoctorHospitalAffiliationList
                currentUser={user}
                onNavigateToProfile={() => setActiveTab('doctor-profile')}
              />
            )}

            {/* Tab: Hospital Doctor Affiliations (Hospital Admin & System Admin roles) */}
            {activeTab === 'doctor-affiliations-admin' &&
              (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
                <HospitalDoctorList currentUser={user} />
              )}

            {/* Tab: My Patient Profile (Patient role) */}
            {activeTab === 'my-profile' && user?.role === 'PATIENT' && (
              <PatientProfile currentUser={user} />
            )}

            {/* Tab: My Hospital Memberships (Patient role) */}
            {activeTab === 'my-memberships' && user?.role === 'PATIENT' && (
              <HospitalMembershipList
                currentUser={user}
                onNavigateToProfile={() => setActiveTab('my-profile')}
              />
            )}

            {/* Tab: Hospital Patient Memberships (Hospital Admin & System Admin roles) */}
            {activeTab === 'patient-memberships' &&
              (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
                <HospitalPatientList currentUser={user} />
              )}

            {/* Tab: Cross-Hospital Access Requests */}
            {(activeTab === 'doctor-access-requests' ||
              activeTab === 'patient-access-requests' ||
              activeTab === 'hospital-access-requests') && (
              <AccessRequestList
                currentUser={user}
                onRequestNew={() => setIsCreateAccessRequestOpen(true)}
                onConsentCreated={() =>
                  setActiveTab(user?.role === 'PATIENT' ? 'patient-consents' : 'doctor-consents')
                }
              />
            )}

            {/* Tab: Clinical Consents */}
            {(activeTab === 'doctor-consents' ||
              activeTab === 'patient-consents' ||
              activeTab === 'hospital-consents') && (
              <ConsentList currentUser={user} />
            )}

            {/* Tab: Security Audit Trail (Hospital Admin & System Admin) */}
            {activeTab === 'audit-logs' &&
              (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
                <AuditLogList currentUser={user} />
              )}

            {/* Tab: Clinical Appointments (Patient, Doctor, Hospital Admin, System Admin) */}
            {(activeTab === 'hospital-appointments' ||
              activeTab === 'doctor-appointments' ||
              activeTab === 'patient-appointments') && (
              <AppointmentList currentUser={user} />
            )}

            {/* Tab: Hospital Management (Healthcare Network) */}
            {activeTab === 'hospitals' && (
              <HospitalList
                currentUser={user}
                onRequireAuth={() => setAuthModalOpen(true)}
              />
            )}

            {/* Tab: Full-Stack Health Status Card */}
            {activeTab === 'health' && (
              <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-teal-400" />
                        <span>Full-Stack Health Status</span>
                      </h2>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        GET /api/health
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Continuous end-to-end verification of React frontend, Express REST API, and MongoDB.
                    </p>
                  </div>

                  <button
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 transition-all border border-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                    <span>{healthLoading ? 'Pinging...' : 'Refresh Status'}</span>
                  </button>
                </div>

                {/* Status Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Express Backend Card */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    isBackendUp 
                      ? 'bg-slate-950/60 border-emerald-500/30' 
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Server className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Backend API</span>
                      </div>
                      {isBackendUp ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                    <div className="text-base font-bold text-white">
                      {isBackendUp ? 'Connected' : 'Unavailable'}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                      <div>Service: {health?.data?.service || 'healthbridge-api'}</div>
                      <div>Latency: {health?.latency !== undefined ? `${health.latency}ms` : '--'}</div>
                    </div>
                  </div>

                  {/* MongoDB Card */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    isDbUp 
                      ? 'bg-slate-950/60 border-emerald-500/30' 
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Database</span>
                      </div>
                      {isDbUp ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="text-base font-bold text-white">
                      {isDbUp ? 'MongoDB Connected' : 'Disconnected'}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                      <div>Host: localhost:27017</div>
                      <div>Status: {health?.data?.database?.status || (isBackendUp ? 'idle' : 'offline')}</div>
                    </div>
                  </div>

                  {/* Application Runtime Card */}
                  <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Runtime & Stack</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono">
                        v0.17 Complete
                      </span>
                    </div>
                    <div className="text-base font-bold text-white">
                      HealthBridge Platform Active
                    </div>
                    <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                      <div>Uptime: {health?.data?.uptime !== undefined ? `${health.data.uptime}s` : '--'}</div>
                      <div>Updated: {lastUpdated || 'Checking...'}</div>
                    </div>
                  </div>

                </div>
              </section>
            )}

            {/* Tab: Roadmap & Phase Progression */}
            {activeTab === 'roadmap' && (
              <section className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <span>Architecture Roadmap & Phase Progression</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Phase 1 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 1</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Foundation</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Monorepo, Express REST API, MongoDB connection, Tailwind CSS, health monitoring.
                    </p>
                  </div>

                  {/* Phase 2 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 2</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Auth & Users</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      User model, bcrypt hashing, JWT issuance & verification, protected /me endpoint, role definitions.
                    </p>
                  </div>

                  {/* Phase 3 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 3</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Hospitals & Lifecycle</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Hospital model, registration (PENDING), System Admin approval/rejection/suspension lifecycle.
                    </p>
                  </div>

                  {/* Phase 4 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 4</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Patients & Memberships</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Patient model, server-generated PAT- ID, hospital membership request, strict state-machine lifecycle.
                    </p>
                  </div>

                  {/* Phase 5 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 5</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Doctors & Clinical Roles</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Doctor credentials, license verification, multi-hospital affiliations, state machine governance.
                    </p>
                  </div>

                  {/* Phase 6 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 6</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Assignments</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Clinical relationship establishment, facility governance, tenant isolation, and assignment lifecycle.
                    </p>
                  </div>

                  {/* Phase 7 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 7</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Medical Records</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Mongoose Discriminators, 6 clinical record types, 9-step authorization, admin exclusion, and immutability.
                    </p>
                  </div>

                  {/* Phase 8 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 8</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Cross-Hospital Access & Consent</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      12-invariant preconditions, duplicate request prevention, dynamic status, clinical scopes, and patient revocation.
                    </p>
                  </div>

                  {/* Phase 9 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 9</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Audit Logging & Security Trail</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Tamper-resistant audit logs, request correlation IDs, metadata sanitization, and tenant-isolated admin access.
                    </p>
                  </div>

                  {/* Phase 10 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 10</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Notifications & Events</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Controlled event vocabulary, non-blocking publishing, recipient isolation, unread counters, and zero PHI leakage.
                    </p>
                  </div>

                  {/* Phase 11 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 11</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Appointment & Scheduling</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Multi-actor lifecycle, overlap prevention, slot validation, immutable cancellation reasons, and notification integration.
                    </p>
                  </div>

                  {/* Phase 12 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 12</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Embeddings & Search</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      FastAPI AI service, provider abstraction, deterministic chunking for 6 discriminators, and clinical authorization gateway.
                    </p>
                  </div>

                  {/* Phase 13 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 13</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">RAG Clinical Assistant</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Grounded answer generation, Express authorization boundary, MongoDB hydration, and zero-PHI audit logging.
                    </p>
                  </div>

                  {/* Phase 14 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 14</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Controlled Tool Calling</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Deterministic 2-stage tool pipeline, 6 read-only clinical tools, server-side parameter validation, and safety limits.
                    </p>
                  </div>

                  {/* Phase 15 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 15</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Agent Orchestration</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Bounded multi-step clinical workflow state machine, strict step caps, hallucination citation stripping, and timeout gates.
                    </p>
                  </div>

                  {/* Phase 16 */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                      <span>PHASE 16</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-300 border border-emerald-500/20">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Automated AI Evaluation</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      31 deterministic test cases, 100% pass rate, critical security LLM context isolation proof, and retrieval metrics.
                    </p>
                  </div>

                  {/* Phase 17 */}
                  <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/10">
                    <div className="text-xs font-bold text-teal-400 mb-1 flex items-center justify-between">
                      <span>PHASE 17</span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-[10px] text-teal-300 border border-teal-500/30">COMPLETE</span>
                    </div>
                    <h4 className="font-semibold text-white text-sm">Final Polish & Demo Ready</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Full regression verification, portfolio demo guides, security hardening, and finalized documentation.
                    </p>
                  </div>

                </div>
              </section>
            )}

          </div>

          {/* Clean App Footer */}
          <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 text-center text-xs text-slate-500">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                HealthBridge Portfolio Project • <span className="text-slate-400">Multi-Hospital Medical Records & Clinical AI Copilot</span>
              </div>
              <div className="text-slate-500">
                17 Architectural Phases Complete
              </div>
            </div>
          </footer>
        </main>

      </div>

      {/* Slide-over System Health Drawer */}
      <SystemHealthDrawer
        isOpen={isHealthDrawerOpen}
        onClose={() => setIsHealthDrawerOpen(false)}
        health={health}
        healthLoading={healthLoading}
        lastUpdated={lastUpdated}
        onRefresh={fetchHealth}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)}
      />

      {/* Create Access Request Modal */}
      <CreateAccessRequestModal
        isOpen={isCreateAccessRequestOpen}
        onClose={() => setIsCreateAccessRequestOpen(false)}
        onSuccess={() => setActiveTab(user?.role === 'DOCTOR' ? 'doctor-access-requests' : 'hospital-access-requests')}
      />

    </div>
  );
}
