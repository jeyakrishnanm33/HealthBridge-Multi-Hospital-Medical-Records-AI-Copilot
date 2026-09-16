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
  Layers,
  HeartPulse,
  Lock,
  UserCheck,
  UserPlus,
  Building2,
  User,
  Users,
  Stethoscope,
  FileText,
  FileKey,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { checkBackendHealth, fetchCurrentUser, logoutUser, loginUser, registerUser } from './services/api';
import AuthModal from './components/AuthModal';
import UserProfileCard from './components/UserProfileCard';
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
import CreateAccessRequestModal from './components/CreateAccessRequestModal';
import AccessRequestList from './components/AccessRequestList';
import ConsentList from './components/ConsentList';
import AuditLogList from './components/AuditLogList';
import NotificationCenter from './components/NotificationCenter';

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
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation / Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent">
                HealthBridge
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Phase 10: Notifications & Clinical Communication
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${isBackendUp && isDbUp ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isBackendUp ? 'API Operational' : 'Awaiting Connection'}</span>
            </div>

            {authLoading ? (
              <div className="text-xs text-slate-500 font-mono">Verifying...</div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <NotificationCenter user={user} />
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">{user.name}</div>
                  <div className="text-[10px] font-mono text-teal-400">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white transition-all shadow-md shadow-teal-900/30"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* View Switcher Bar with Role-Contextual Navigation */}
      <div className="relative z-10 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-sm overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center space-x-2 py-2 min-w-max">
          
          {/* Hospital Admin / System Admin Tabs */}
          {(user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
            <>
              <button
                onClick={() => setActiveTab('hospital-assignments')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'hospital-assignments'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assignments</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-affiliations-admin')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-affiliations-admin'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Affiliations</span>
              </button>

              <button
                onClick={() => setActiveTab('patient-memberships')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'patient-memberships'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Patient Memberships</span>
              </button>

              <button
                onClick={() => setActiveTab('hospital-access-requests')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'hospital-access-requests'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileKey className="w-3.5 h-3.5" />
                <span>Access Requests</span>
              </button>

              <button
                onClick={() => setActiveTab('hospital-consents')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'hospital-consents'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Facility Consents</span>
              </button>

              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'audit-logs'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </>
          )}

          {/* Doctor-Only Tabs */}
          {user?.role === 'DOCTOR' && (
            <>
              <button
                onClick={() => setActiveTab('doctor-records')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-records'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Clinical Records</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-access-requests')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-access-requests'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileKey className="w-3.5 h-3.5" />
                <span>Access Requests</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-consents')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-consents'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Active Consents</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-assignments')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-assignments'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned Patients</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-profile')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-profile'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>My Doctor Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('doctor-affiliations')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'doctor-affiliations'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Hospital Affiliations</span>
              </button>
            </>
          )}

          {/* Patient-Only Tabs */}
          {user?.role === 'PATIENT' && (
            <>
              <button
                onClick={() => setActiveTab('patient-records')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'patient-records'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Medical Records</span>
              </button>

              <button
                onClick={() => setActiveTab('patient-access-requests')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'patient-access-requests'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileKey className="w-3.5 h-3.5" />
                <span>Access Requests</span>
              </button>

              <button
                onClick={() => setActiveTab('patient-consents')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'patient-consents'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>My Consents</span>
              </button>

              <button
                onClick={() => setActiveTab('patient-assignments')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'patient-assignments'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Attending Doctors</span>
              </button>

              <button
                onClick={() => setActiveTab('my-profile')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'my-profile'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Patient Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('my-memberships')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'my-memberships'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>My Hospital Memberships</span>
              </button>
            </>
          )}

          {/* Core Healthcare Views */}
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hospitals'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Healthcare Network</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'health'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Full-Stack Health</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roadmap'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Roadmap</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        {/* User Identity Section */}
        {user ? (
          <UserProfileCard user={user} onLogout={handleLogout} />
        ) : (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm self-start sm:self-auto"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Tab: Doctor-Patient Assignments (Hospital Admin & System Admin) */}
        {activeTab === 'hospital-assignments' &&
          (user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN') && (
            <DoctorPatientAssignmentList currentUser={user} />
          )}

        {/* Tab: Clinical Medical Records (Doctor role) */}
        {activeTab === 'doctor-records' && user?.role === 'DOCTOR' && (
          <DoctorClinicalRecordsView currentUser={user} />
        )}

        {/* Tab: My Patient Assignments (Doctor role) */}
        {activeTab === 'doctor-assignments' && user?.role === 'DOCTOR' && (
          <DoctorPatientAssignmentList currentUser={user} />
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

        {/* Tab: Hospital Management (Healthcare Network) */}
        {activeTab === 'hospitals' && (
          <HospitalList
            currentUser={user}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}

        {/* Tab: Full-Stack Health Status Card */}
        {activeTab === 'health' && (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
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
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 transition-all border border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>{healthLoading ? 'Pinging...' : 'Refresh Status'}</span>
              </button>
            </div>

            {/* Status Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Express Backend Card */}
              <div className={`p-5 rounded-xl border transition-all ${
                isBackendUp 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
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
              <div className={`p-5 rounded-xl border transition-all ${
                isDbUp 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
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
                  <div>Collections: users, hospitals, patients, memberships, doctors, affiliations, assignments</div>
                  <div>Status: {health?.data?.database?.status || (isBackendUp ? 'idle' : 'offline')}</div>
                </div>
              </div>

              {/* Application Runtime Card */}
              <div className="p-5 rounded-xl border bg-slate-800/40 border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Runtime & Stack</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-teal-300 font-mono">
                    Phase 8
                  </span>
                </div>
                <div className="text-base font-bold text-white">
                  Cross-Hospital Access & Consent Active
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
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <span>Architecture Roadmap & Phase Progression</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Phase 1 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 1</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Foundation</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Monorepo, Express REST API, MongoDB connection, Tailwind CSS, health monitoring.
                </p>
              </div>

              {/* Phase 2 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 2</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Auth & Users</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  User model, bcrypt hashing, JWT issuance & verification, protected /me endpoint, role definitions.
                </p>
              </div>

              {/* Phase 3 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 3</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Hospitals & Lifecycle</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Hospital model, registration (PENDING), System Admin approval/rejection/suspension lifecycle.
                </p>
              </div>

              {/* Phase 4 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 4</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Patients & Memberships</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Patient model, server-generated PAT- ID, hospital membership request, strict state-machine lifecycle.
                </p>
              </div>

              {/* Phase 5 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 5</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Doctors & Clinical Roles</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Doctor credentials, license verification, multi-hospital affiliations, state machine governance.
                </p>
              </div>

              {/* Phase 6 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 6</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Assignments</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Clinical relationship establishment, facility governance, tenant isolation, and assignment lifecycle.
                </p>
              </div>

              {/* Phase 7 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 7</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Medical Records</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Mongoose Discriminators, 6 clinical record types, 9-step authorization, admin exclusion, and immutability.
                </p>
              </div>

              {/* Phase 8 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 8</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Cross-Hospital Access & Consent</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  12-invariant preconditions, duplicate request prevention, dynamic status, clinical scopes, and patient revocation.
                </p>
              </div>

              {/* Phase 9 */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                  <span>PHASE 9</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Audit Logging & Security Trail</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Tamper-resistant audit logs, request correlation IDs, metadata sanitization, and tenant-isolated admin access.
                </p>
              </div>

              {/* Phase 10 (Active Focus) */}
              <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/20 relative">
                <div className="text-xs font-bold text-teal-400 mb-1 flex items-center justify-between">
                  <span>PHASE 10</span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-[10px] text-teal-300">COMPLETE</span>
                </div>
                <h4 className="font-semibold text-white text-sm">Notifications & Clinical Communication</h4>
                <p className="text-xs text-slate-400 mt-1.5">
                  Controlled event vocabulary, non-blocking event publishing, recipient isolation, unread counters, and zero PHI leakage.
                </p>
              </div>

            </div>
          </section>
        )}

      </main>

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

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            HealthBridge Engineering Portfolio Project • <span className="text-slate-400">Phase 10: Notifications & Clinical Communication</span>
          </div>
          <div className="text-slate-500">
            Source of Truth: AI HealthConnect Requirements Document
          </div>
        </div>
      </footer>
    </div>
  );
}
