# HealthBridge — Phase 3: Hospitals & Hospital Administration Documentation

## 1. Overview

Phase 3 introduces the healthcare organization domain and its authoritative lifecycle management. A hospital represents an organization participating in the HealthBridge multi-hospital network. The Express API acts as the authoritative gatekeeper, strictly enforcing registration in `PENDING` status and restricting lifecycle transitions (`APPROVED`, `REJECTED`, `SUSPENDED`) to users authenticated as `SYSTEM_ADMIN`.

---

## 2. Hospital Lifecycle State Machine

```text
               ┌───────────┐
               │  PENDING  │
               └─────┬─────┘
                ┌────┴────┐
                ↓         ↓
            APPROVED    REJECTED
                │
                ↓
            SUSPENDED
```

### Valid Status Transitions
- `PENDING → APPROVED`: System Administrator verifies hospital credentials and activates the organization.
- `PENDING → REJECTED`: System Administrator declines hospital registration.
- `APPROVED → SUSPENDED`: System Administrator temporarily suspends hospital operations.

### Prohibited / Terminal Transitions
All other transitions are strictly rejected by the backend with `400 Bad Request` (`INVALID_STATUS_TRANSITION`):
- `REJECTED → APPROVED` (rejected)
- `SUSPENDED → APPROVED` (rejected)
- `REJECTED → SUSPENDED` (rejected)

---

## 3. Hospital Data Model

Collection: `hospitals`

```javascript
{
  id: "6aa8f592d94aaeb5d95853ae",
  name: "HealthBridge General Hospital",
  hospitalCode: "HOSP-GEN01",        // Unique, uppercase
  address: {
    street: "100 Healthcare Boulevard",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600001",
    country: "India"
  },
  contactEmail: "admin@genhospital.local",
  contactPhone: "+91 98765 43210",
  status: "PENDING",                  // PENDING | APPROVED | REJECTED | SUSPENDED
  registeredBy: "6aa8f592d94aaeb5d95853ad", // ObjectId ref User
  createdAt: "2026-09-15T07:36:50.000Z",
  updatedAt: "2026-09-15T07:36:50.000Z"
}
```

---

## 4. API Endpoints

### 1. `POST /api/hospitals`
Registers a new healthcare organization.
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: Any authenticated user can submit a hospital registration.
- **Lifecycle Rule**: Status is unconditionally set to `PENDING` by the backend. Any attempt by the client to supply `status` is ignored/rejected.
- **Code Assignment**: If `hospitalCode` is omitted, the system generates a unique `HOSP-XXXXXX` code.

**Request Body:**
```json
{
  "name": "HealthBridge General Hospital",
  "hospitalCode": "HOSP-GEN01",
  "address": {
    "street": "100 Healthcare Boulevard",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postalCode": "600001",
    "country": "India"
  },
  "contactEmail": "admin@genhospital.local",
  "contactPhone": "+91 98765 43210"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "hospital": {
      "id": "6aa8f592d94aaeb5d95853ae",
      "name": "HealthBridge General Hospital",
      "hospitalCode": "HOSP-GEN01",
      "status": "PENDING",
      "registeredBy": "6aa8f592d94aaeb5d95853ad",
      ...
    }
  }
}
```

### 2. `GET /api/hospitals`
Lists all registered hospitals.
- **Query Parameters**: `status` (e.g. `GET /api/hospitals?status=APPROVED`).
- Returns safe hospital summaries with populated `registeredBy` (name, email).

### 3. `GET /api/hospitals/:id`
Retrieves full details for a specific hospital.
- Returns `404 Not Found` if ID does not exist.
- Returns `400 Bad Request` if ID is not a valid 24-char hex ObjectId.

### 4. `PATCH /api/hospitals/:id/status`
Updates hospital lifecycle status (`APPROVED`, `REJECTED`, `SUSPENDED`).
- **Authentication**: Required (`Bearer <token>`).
- **Authorization**: **Strictly restricted to `SYSTEM_ADMIN`**. Non-admin callers (`DOCTOR`, `PATIENT`) receive `403 Forbidden`.
- **Validation**: Enforces allowed state machine transitions.

**Request Body:**
```json
{
  "status": "APPROVED"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hospital": {
      "id": "6aa8f592d94aaeb5d95853ae",
      "status": "APPROVED",
      ...
    }
  }
}
```

---

## 5. Security & Administrative Controls

- **Role Gating**: Implemented via minimal `requireRoles('SYSTEM_ADMIN')` middleware.
- **Frontend Independence**: Frontend role checks are for presentation only; the Express backend authoritatively verifies the caller's role from the verified JWT before allowing any status change.
- **Data Integrity**: Unique index on `hospitalCode` prevents duplicate codes with `409 Conflict`.

---

## 6. Synthetic Data Requirement

All demonstrations and tests strictly utilize synthetic, fictional hospital names such as:
- `HealthBridge General Hospital`
- `Chennai Care Medical Center`
- `Kongu Health Institute`

No real-world hospital or patient data is used.

---

## 7. Scope Boundaries (What Remains Unimplemented)

Phase 3 establishes only the hospital domain and lifecycle. The following remain intentionally deferred to subsequent phases:
- **Phase 4**: Patient domain and Patient-Hospital memberships.
- **Phase 5**: Medical records (polymorphic discriminator schemas) and document attachments.
- **Phase 6**: Fine-grained authorization policies (`policies/`) and doctor-patient assignments.
- **Phase 7**: Patient-controlled consent and cross-hospital access requests.
- **Phase 8**: Security audit logging.
- **Phase 9+**: Vector database (Qdrant), embeddings, RAG copilot, and AI evaluation.
