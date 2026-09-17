import React from 'react';
import {
  FileText,
  UserCheck,
  Bot,
  Sparkles,
  Calendar,
  FileKey,
  Shield,
  Stethoscope,
  Building2,
  Users,
  User,
  ShieldAlert,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({
  user,
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) {
  const role = user?.role;

  // Build categorized navigation items strictly based on role
  const getNavSections = () => {
    const sections = [];

    // 1. CLINICAL WORKSPACE (Doctors and Patients only - Admins excluded by design)
    if (role === 'DOCTOR') {
      sections.push({
        title: 'CLINICAL WORKSPACE',
        items: [
          { id: 'doctor-records', label: 'Clinical Records', icon: FileText },
          { id: 'doctor-assignments', label: 'Assigned Patients', icon: UserCheck },
          { id: 'doctor-assistant', label: 'Clinical Assistant', icon: Bot, badge: 'AI' },
          { id: 'doctor-search', label: 'Semantic Search', icon: Sparkles },
          { id: 'doctor-appointments', label: 'Appointments', icon: Calendar },
        ],
      });
    } else if (role === 'PATIENT') {
      sections.push({
        title: 'CLINICAL WORKSPACE',
        items: [
          { id: 'patient-records', label: 'My Medical Records', icon: FileText },
          { id: 'patient-assistant', label: 'Health Assistant', icon: Bot, badge: 'AI' },
          { id: 'patient-search', label: 'Semantic Search', icon: Sparkles },
          { id: 'patient-appointments', label: 'Appointments', icon: Calendar },
          { id: 'patient-assignments', label: 'Attending Doctors', icon: UserCheck },
        ],
      });
    }

    // 2. PRIVACY & CONSENT
    if (role === 'DOCTOR') {
      sections.push({
        title: 'PRIVACY & CONSENT',
        items: [
          { id: 'doctor-access-requests', label: 'Access Requests', icon: FileKey },
          { id: 'doctor-consents', label: 'Active Consents', icon: Shield },
        ],
      });
    } else if (role === 'PATIENT') {
      sections.push({
        title: 'PRIVACY & CONSENT',
        items: [
          { id: 'patient-access-requests', label: 'Access Requests', icon: FileKey },
          { id: 'patient-consents', label: 'Active Consents', icon: Shield },
        ],
      });
    } else if (role === 'HOSPITAL_ADMIN' || role === 'SYSTEM_ADMIN') {
      sections.push({
        title: 'PRIVACY & CONSENT',
        items: [
          { id: 'hospital-access-requests', label: 'Access Requests', icon: FileKey },
          { id: 'hospital-consents', label: 'Facility Consents', icon: Shield },
        ],
      });
    }

    // 3. HOSPITAL OPERATIONS
    if (role === 'DOCTOR') {
      sections.push({
        title: 'HOSPITAL OPERATIONS',
        items: [
          { id: 'doctor-profile', label: 'My Doctor Profile', icon: Stethoscope },
          { id: 'doctor-affiliations', label: 'Hospital Affiliations', icon: Building2 },
          { id: 'hospitals', label: 'Healthcare Network', icon: Building2 },
        ],
      });
    } else if (role === 'PATIENT') {
      sections.push({
        title: 'HOSPITAL OPERATIONS',
        items: [
          { id: 'my-profile', label: 'My Patient Profile', icon: User },
          { id: 'my-memberships', label: 'Hospital Memberships', icon: Building2 },
          { id: 'hospitals', label: 'Healthcare Network', icon: Building2 },
        ],
      });
    } else if (role === 'HOSPITAL_ADMIN' || role === 'SYSTEM_ADMIN') {
      sections.push({
        title: 'HOSPITAL OPERATIONS',
        items: [
          { id: 'hospital-assignments', label: 'Doctor-Patient Assignments', icon: UserCheck },
          { id: 'doctor-affiliations-admin', label: 'Doctor Affiliations', icon: Stethoscope },
          { id: 'patient-memberships', label: 'Patient Memberships', icon: Users },
          { id: 'hospital-appointments', label: 'Appointments', icon: Calendar },
          { id: 'hospitals', label: 'Healthcare Facilities', icon: Building2 },
        ],
      });
    } else {
      // Guest / Unauthenticated
      sections.push({
        title: 'HOSPITAL OPERATIONS',
        items: [
          { id: 'hospitals', label: 'Healthcare Network', icon: Building2 },
        ],
      });
    }

    // 4. GOVERNANCE & SYSTEM
    const governanceItems = [];
    if (role === 'HOSPITAL_ADMIN' || role === 'SYSTEM_ADMIN') {
      governanceItems.push({
        id: 'audit-logs',
        label: role === 'SYSTEM_ADMIN' ? 'Global Audit Logs' : 'Facility Audit Trail',
        icon: ShieldAlert,
      });
    }
    governanceItems.push({ id: 'health', label: 'Full-Stack Health', icon: Activity });
    governanceItems.push({ id: 'roadmap', label: 'Architecture Roadmap', icon: Layers });

    sections.push({
      title: 'GOVERNANCE & SYSTEM',
      items: governanceItems,
    });

    return sections;
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {section.title}
              </div>

              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-teal-600/15 text-teal-300 border border-teal-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-teal-400'
                              : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {item.badge && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="font-mono">HealthBridge v0.17</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/80"></span>
        </div>
      </aside>
    </>
  );
}
