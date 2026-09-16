# HealthBridge Phase 11 — Appointment & Scheduling Domain

## 1. Domain Overview

The **Appointment & Scheduling Domain** delivers enterprise-grade clinical scheduling integrated across the HealthBridge ecosystem. Rather than simple calendar entries, appointments in HealthBridge are formal clinical scheduling agreements enforced with tenant isolation, doctor-patient assignment prerequisites, multi-party authorization, conflict detection, and event-driven notifications.

### Key Architectural Principles

1. **10-Step Precondition Chain**:
   Appointment booking enforces clinical and tenant boundaries:
   - Target Hospital must exist and hold `APPROVED` status.
   - Attending Doctor must exist and hold `ACTIVE` profile status.
   - Attending Doctor must hold an `ACTIVE` affiliation with the target hospital.
   - Patient must exist and hold an `ACTIVE` profile status.
   - Patient must hold an `ACTIVE` hospital membership at the target hospital.
   - An `ACTIVE` Doctor-Patient Assignment must exist between the doctor and patient at that hospital.
   - Appointment date cannot be in the past.
   - Start and end times must follow `HH:mm` format with `endTime > startTime`.
   - Doctor time conflict check prevents double-booking across active appointments.
   - Patient time conflict check prevents overlapping consultations across active appointments.

2. **Strict Multi-Tenant & Role Isolation**:
   - Patients can only view and schedule appointments for their own profile.
   - Doctors can only view and manage appointments where they are the attending physician.
   - Hospital Administrators can only view and manage appointments within their administered facility.
   - System Administrators possess global supervisory access across all facilities.

3. **Deterministic State Machine**:
   - `REQUESTED` → `CONFIRMED` | `REJECTED` | `CANCELLED`
   - `CONFIRMED` → `COMPLETED` | `CANCELLED` | `NO_SHOW` | (Rescheduled on same document)
   - Terminal states (`COMPLETED`, `CANCELLED`, `REJECTED`, `NO_SHOW`) are immutable against further status transitions.

4. **Audit Trail & Domain Event Ingestion**:
   - Every appointment creation, confirmation, rejection, cancellation, rescheduling, completion, and no-show is recorded immutably in `AuditLog`.
   - Domain events (`APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_REJECTED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_RESCHEDULED`, `APPOINTMENT_COMPLETED`, `APPOINTMENT_NO_SHOW`) trigger automated notifications to relevant doctors and patients.

```text
       Patient Requests
              ↓ (status: REQUESTED)
    [Doctor / Hospital Admin]
           ↙        ↘
 [Confirm]            [Reject with Reason]
     ↓                         ↓
(status: CONFIRMED)     (status: REJECTED)
   ↙    |    ↘
[Complete] [No-Show] [Cancel / Reschedule]
```

---

## 2. Appointment Data Model

Located at `backend/src/models/Appointment.js`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `patient` | `ObjectId -> Patient` | Reference to target Patient (Required, Indexed) |
| `doctor` | `ObjectId -> Doctor` | Reference to attending Doctor (Required, Indexed) |
| `hospital` | `ObjectId -> Hospital` | Reference to hospital facility (Required, Indexed) |
| `appointmentDate` | `Date` | Scheduled appointment date (Required, Indexed) |
| `startTime` | `String` | Scheduled start time in `HH:mm` format (Required) |
| `endTime` | `String` | Scheduled end time in `HH:mm` format (Required) |
| `status` | `Enum` | `REQUESTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `NO_SHOW` (Default: `REQUESTED` for patients, `CONFIRMED` for clinicians) |
| `reason` | `String` | Clinical reason for the consultation (Max 500 chars) |
| `notes` | `String` | Clinical prep notes or consultation guidelines (Max 500 chars) |
| `cancellationReason` | `String` | Reason for cancellation (Max 500 chars) |
| `rejectionReason` | `String` | Reason for rejection (Max 500 chars) |
| `createdBy` | `ObjectId -> User` | User who created the appointment record |
| `confirmedBy` | `ObjectId -> User` | User who confirmed the appointment |
| `cancelledBy` | `ObjectId -> User` | User who cancelled the appointment |
| `completedBy` | `ObjectId -> User` | User who marked appointment completed |
| `rejectedBy` | `ObjectId -> User` | User who rejected the appointment |
| `confirmedAt` | `Date` | Timestamp of confirmation |
| `cancelledAt` | `Date` | Timestamp of cancellation |
| `completedAt` | `Date` | Timestamp of completion |
| `rejectedAt` | `Date` | Timestamp of rejection |
| `rescheduledFrom` | `ObjectId -> Appointment` | Reference if rescheduled from prior appointment |
| `createdAt` / `updatedAt`| `Date` | Timestamps |

### Index Strategy

- `{ doctor: 1, appointmentDate: 1, startTime: 1, endTime: 1 }`: Fast overlap detection for clinician schedules.
- `{ patient: 1, appointmentDate: 1 }`: Fast overlap detection and patient history queries.
- `{ hospital: 1, appointmentDate: 1, status: 1 }`: Facility calendar and status management.
- `{ status: 1, appointmentDate: 1 }`: Operational lifecycle queries.

---

## 3. API Endpoints Reference

Base route: `/api/appointments` (All routes require `Authorization: Bearer <token>`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/appointments` | All Roles | Create appointment (Patients create `REQUESTED`, Doctors/Admins create `CONFIRMED`) |
| `GET` | `/api/appointments` | All Roles | List appointments with role-based scoping and filters (`status`, `upcoming`, `hospitalId`, `doctorId`, `patientId`, `startDate`, `endDate`) |
| `GET` | `/api/appointments/:id` | Doctor, Patient, Hospital Admin, System Admin | View appointment details (Enforces read policy) |
| `PATCH`| `/api/appointments/:id/confirm` | Doctor, Hospital Admin, System Admin | Confirm a `REQUESTED` appointment |
| `PATCH`| `/api/appointments/:id/reject` | Doctor, Hospital Admin, System Admin | Reject a `REQUESTED` appointment with `rejectionReason` |
| `PATCH`| `/api/appointments/:id/cancel` | All Involved Roles | Cancel a `REQUESTED` or `CONFIRMED` appointment with `cancellationReason` |
| `PATCH`| `/api/appointments/:id/reschedule` | All Involved Roles | Reschedule a `CONFIRMED` appointment with new date/time |
| `PATCH`| `/api/appointments/:id/complete` | Doctor, Hospital Admin, System Admin | Mark `CONFIRMED` appointment as `COMPLETED` |
| `PATCH`| `/api/appointments/:id/no-show` | Doctor, Hospital Admin, System Admin | Mark `CONFIRMED` appointment as `NO_SHOW` |

---

## 4. Frontend Integration

1. **Appointment Management Dashboard (`AppointmentList.jsx`)**:
   - Filter bar with status filters, upcoming toggle, and facility selector for administrators.
   - Status badge color coding: Pending (Amber), Confirmed (Emerald), Completed (Cyan), Cancelled (Slate), Rejected (Rose), No-Show (Purple).
   - In-line contextual action buttons based on user role and state machine eligibility.
2. **Scheduling Modal (`CreateAppointmentModal.jsx`)**:
   - Facility selector with approved hospital filtering.
   - Doctor and patient selection driven by active doctor-patient assignments.
   - Date picker, time slot pickers, reason, and preparation notes.
3. **Rescheduling Modal (`RescheduleAppointmentModal.jsx`)**:
   - In-place date/time adjustments with overlap conflict checks.
4. **Appointment Detail Modal (`AppointmentDetailModal.jsx`)**:
   - Comprehensive stakeholder overview, timestamps, and audit transition information.

---

## 5. Verification & Test Coverage

- **Automated Backend Tests**: `backend/tests/appointment.test.js` (27 test cases covering 10-step preconditions, state transitions, overlap rejection, RBAC/tenant isolation, audit logs, and domain notifications).
- **Full Backend Suite**: 319 passed across 12 test suites.
- **Frontend Production Build**: Vite build passed with 0 errors and 0 warnings.
