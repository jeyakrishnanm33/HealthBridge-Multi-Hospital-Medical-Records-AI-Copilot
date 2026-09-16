# HealthBridge Phase 10 — Notifications & Clinical Event Communication

## 1. Domain Overview

The **Notifications & Clinical Event Communication Domain** provides a centralized, decoupled, asynchronous communication layer across HealthBridge. It notifies patients, doctors, and healthcare administrators about critical platform workflows, lifecycle events, clinical relationships, access requests, consent revocations, and institutional changes.

### Key Architectural Principles

1. **In-Process Domain Event Bus**:
   Clinical and institutional domain services (`assignmentService`, `doctorService`, `accessRequestService`, `consentService`, `hospitalService`) emit structured events through `domainEvents.js` (an EventEmitter wrapper). The originating service executes business logic and database persistence without being tightly coupled to notification creation.

2. **Decoupled, Fail-Safe Execution**:
   Notification creation runs asynchronously after domain state transitions. If notification generation or delivery encounters an error, it is safely logged and caught—**it never rolls back or crashes the primary clinical transaction**.

3. **No Arbitrary Client Ingestion**:
   Clients cannot forge or create notifications directly. There is **no `POST /api/notifications` endpoint** (calling it returns `404 Not Found`). Notifications are generated strictly by internal system events and verified domain workflows.

4. **Strict Recipient Isolation**:
   Every user has exclusive access to their own notifications. A patient cannot read a doctor's notifications; a hospital admin cannot read an individual doctor's or patient's notifications; and a system admin cannot browse arbitrary user notification inboxes.

5. **Zero PHI / Sensitive Data Exposure**:
   Notifications convey operational status (e.g. "Dr. Sarah Jenkins requested record access for cardiology consult"), never clinical details, lab results, diagnoses, or credentials.

```text
 Clinical / Domain Action (e.g., Doctor requests Cross-Hospital Access)
                         ↓
  [accessRequestService.createAccessRequest]
                         ↓ (Saves record to DB & audit trail)
       domainEvents.emit('access_request.created', payload)
                         ↓
  [notificationService Event Subscriber] (Asynchronous / Non-blocking)
                         ↓
   Recipient Resolution (Lookup patient's linked User ID)
                         ↓
   Sanitization & Notification Construction
                         ↓
  [Notification Model] ──→ Persists to 'notifications' collection
                         ↓
   Client Notification Center (Polls /api/notifications/unread-count & /api/notifications)
```

---

## 2. Notification Schema & Model

Located at `backend/src/models/Notification.js` in collection `notifications`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `recipient` | `ObjectId -> User` | Target user who owns and can view the notification (Required) |
| `type` | `String (Enum)` | Controlled event type identifier (Required) |
| `title` | `String` | Brief human-readable notification header (Max 120 chars) |
| `message` | `String` | Descriptive message text without PHI (Max 500 chars) |
| `status` | `Enum` | Status: `UNREAD` (default) or `READ` |
| `readAt` | `Date` | Timestamp when notification was marked read (null when unread) |
| `resourceType` | `Enum` | `HOSPITAL`, `DOCTOR`, `PATIENT`, `ASSIGNMENT`, `MEDICAL_RECORD`, `ACCESS_REQUEST`, `CONSENT`, `USER`, `SYSTEM` |
| `resourceId` | `String` | ID string of related domain object for deep linking |
| `metadata` | `Mixed` | Non-sensitive contextual metadata (e.g., hospital name, doctor name) |
| `createdAt` | `Date` | Automated creation timestamp |
| `updatedAt` | `Date` | Automated update timestamp |

### Index Strategy

Optimized for high-concurrency mailbox queries, filtering, and badge counters:

- `{ recipient: 1, createdAt: -1 }`: Primary inbox listing sorted by date.
- `{ recipient: 1, status: 1, createdAt: -1 }`: Fast unread count aggregation and unread-only tab queries.
- `{ recipient: 1, type: 1, createdAt: -1 }`: Type-based filtering.

---

## 3. Controlled Notification Vocabulary

Notifications use an explicit enum vocabulary across five clinical workflow domains:

### Clinical Assignments (`ASSIGNMENT_*`)
- `ASSIGNMENT_CREATED`: Patient assigned to doctor at hospital.
- `ASSIGNMENT_TRANSFERRED`: Patient care transferred to a different clinician.
- `ASSIGNMENT_ENDED`: Active clinical assignment concluded.

### Doctor Affiliations (`DOCTOR_*`)
- `DOCTOR_AFFILIATION_REQUESTED`: Doctor submitted affiliation request to hospital.
- `DOCTOR_AFFILIATION_APPROVED`: Hospital admin approved affiliation.
- `DOCTOR_AFFILIATION_REJECTED`: Hospital admin rejected affiliation.
- `DOCTOR_AFFILIATION_SUSPENDED`: Hospital admin suspended clinical privileges.

### Cross-Hospital Access Requests (`ACCESS_REQUEST_*`)
- `ACCESS_REQUEST_CREATED`: Doctor at another hospital requested record access; sent to patient.
- `ACCESS_REQUEST_APPROVED`: Patient approved record access; sent to requesting doctor.
- `ACCESS_REQUEST_DENIED`: Patient rejected record access; sent to requesting doctor.
- `ACCESS_REQUEST_CANCELLED`: Doctor retracted pending request; sent to patient.

### Patient Consents (`CONSENT_*`)
- `CONSENT_GRANTED`: Active consent created granting record access; sent to doctor and patient.
- `CONSENT_REVOKED`: Patient revoked cross-hospital access; sent to doctor.
- `CONSENT_EXPIRED`: Consent duration elapsed; sent to doctor.

### Hospital & System Operations (`HOSPITAL_*`, `SYSTEM_*`)
- `HOSPITAL_REGISTRATION_SUBMITTED`: New hospital onboarded.
- `HOSPITAL_STATUS_CHANGED`: Hospital approved, suspended, or archived.
- `SYSTEM_ANNOUNCEMENT`: Platform-wide administrative notification.

---

## 4. Recipient Determination Rules

Notification recipients are dynamically resolved using trusted domain relationships:

| Domain Trigger | Recipient(s) Resolved | Rule / Justification |
| :--- | :--- | :--- |
| **Assignment Created** | Doctor User ID & Patient User ID | Both parties must be notified of the active care relationship. |
| **Assignment Ended** | Doctor User ID & Patient User ID | Both parties must know clinical care scope is closed. |
| **Affiliation Status Change** | Doctor User ID | Doctor is notified if approved, rejected, or suspended. |
| **Access Request Created** | Patient User ID | Patient must be prompted to review and approve/deny cross-hospital access. |
| **Access Request Decision** | Requesting Doctor User ID | Doctor must know if their cross-hospital request was approved or denied. |
| **Access Request Cancelled** | Patient User ID | Patient inbox removes or resolves the pending decision request. |
| **Consent Revocation** | Doctor User ID | Doctor is immediately notified that cross-hospital access has been terminated. |
| **Hospital Status Changed** | Hospital Admin User IDs | All administrators of that hospital are notified of status changes. |

---

## 5. Security & Privacy Safeguards

1. **Authorization & Privacy Policy (`notificationPolicy.js`)**:
   `verifyNotificationRecipient(user, notification)` asserts that `user.id === notification.recipient.toString()`. If mismatched, a `403 Forbidden` (`FORBIDDEN_NOTIFICATION_ACCESS`) is thrown. Even administrators cannot read another user's personal notifications.

2. **Sanitized Metadata & No Clinical Data**:
   Payloads contain only entity identifiers, names, and operational text. Diagnostic findings, lab values, progress notes, and medication regimens are strictly forbidden from notification payloads.

3. **No Direct Creation Route**:
   The router only exposes `GET /`, `GET /unread-count`, `PATCH /read-all`, `GET /:id`, and `PATCH /:id/read`. Client attempts to `POST /api/notifications` fail with HTTP `404 Not Found`.

---

## 6. REST API Reference

All endpoints require active JWT authentication (`Bearer <token>`).

### 1. List Current User Notifications
- **`GET /api/notifications`**
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 50)
  - `status` (`ALL`, `UNREAD`, `READ`, default: `ALL`)
  - `type` (optional controlled type filter)
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": {
      "notifications": [
        {
          "id": "6640...",
          "recipient": "663f...",
          "type": "ACCESS_REQUEST_CREATED",
          "title": "New Record Access Request",
          "message": "Dr. Sarah Jenkins has requested access to your medical records.",
          "status": "UNREAD",
          "readAt": null,
          "resourceType": "ACCESS_REQUEST",
          "resourceId": "6641...",
          "metadata": {
            "doctorName": "Dr. Sarah Jenkins",
            "hospitalName": "Metro General Hospital",
            "specialty": "Cardiology"
          },
          "createdAt": "2026-09-16T12:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "pages": 1
      },
      "unreadCount": 1
    }
  }
  ```

### 2. Get Unread Count
- **`GET /api/notifications/unread-count`**
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": {
      "unreadCount": 3
    }
  }
  ```

### 3. Mark Single Notification Read
- **`PATCH /api/notifications/:id/read`**
- **Response `200 OK`**: Returns the updated notification with `status: "READ"` and `readAt` timestamp.

### 4. Mark All Notifications Read
- **`PATCH /api/notifications/read-all`**
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": {
      "modifiedCount": 3
    }
  }
  ```

### 5. Get Notification Details
- **`GET /api/notifications/:id`**
- **Response `200 OK`**: Returns single notification object after verifying recipient ownership.

---

## 7. Frontend Notification Center

Located in `frontend/src/components/NotificationCenter.jsx`:

1. **Bell Trigger with Badge**:
   Integrated into the application header bar next to user profile. Displays a red badge with the exact unread count (or `99+` if overflowing).
2. **Slide-over Dropdown**:
   Displays a header with quick actions ("Mark all as read", filter tabs: "All" vs "Unread").
3. **Controlled Visual Badges**:
   Categorized badge pills for Doctor, Assignment, Access Request, Consent, Hospital, and System notifications.
4. **Interactive Actions**:
   Single-click to mark as read, relative time formatting ("2m ago", "1h ago"), and click-to-view detailed modal with full metadata.
5. **Background Polling**:
   Automatically polls unread count every 30 seconds while an authenticated user session is active.

---

## 8. Verification & Test Coverage

- **Automated Test Suite**: `backend/tests/notification.test.js` (25 tests)
  - Unit creation with schema validations and compound indexes.
  - Recipient access isolation and cross-user rejection (403 Forbidden).
  - Admin restrictions preventing snooping on user notifications.
  - Rejection of invalid status or pagination params.
  - End-to-end domain event listener tests for:
    - Assignments (`ASSIGNMENT_CREATED`, `ASSIGNMENT_ENDED`)
    - Doctor affiliations (`APPROVED`, `REJECTED`, `SUSPENDED`)
    - Access requests (`CREATED`, `APPROVED`, `DENIED`, `CANCELLED`)
    - Consents (`CREATED`, `REVOKED`)
    - Hospital status updates (`HOSPITAL_STATUS_CHANGED`)
  - Verification that POST `/api/notifications` yields 404.
  - Verification that notifications contain no clinical notes, vitals, or credentials.
- **Full Backend Regression Suite**:
  - **11 test suites passed, 0 failed**
  - **292 tests passed, 0 failed**
- **Frontend Production Build**:
  - `npm run build` executed with **0 errors, 0 warnings**.
