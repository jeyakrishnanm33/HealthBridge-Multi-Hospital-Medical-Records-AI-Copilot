# HealthBridge — End-to-End Demonstration Scenario & Portfolio Guide

> **Important Scope Disclaimer**: HealthBridge is a portfolio engineering demonstration using deterministic synthetic data. It demonstrates secure multi-tenant healthcare architecture, patient-governed consent, and authorization-aware AI retrieval. It is not intended for production healthcare use, clinical diagnosis, or medical treatment.

---

## Demonstration Narrative Overview

This demonstration illustrates the central value proposition of HealthBridge: **Enabling secure cross-hospital clinical record interoperability strictly governed by fine-grained patient consent, while ensuring that an AI copilot operates within the exact same authorization boundaries.**

```text
  [ Hospital A ]                                     [ Hospital B ]
  Patient Alex has records                            Doctor Smith needs history
         │                                                  │
         │                                                  ▼
         │ ◄────────── 1. Requests Scoped Access ───────────│
         │
         ▼
  2. Patient Approves Scopes (e.g. VISITS, LAB_RESULTS)
         │
         ▼
  3. Dynamic Consent Issued
         │
         ├──────────────────────────────────────────────────┐
         ▼                                                  ▼
  Doctor Smith Views Permitted Records           Doctor Smith Queries AI Copilot
  (Hospital A visits & labs visible)             (AI retrieves ONLY permitted visits/labs)
         │                                                  │
         ▼                                                  ▼
  4. Patient Revokes Consent ────────────────────► Instant Access Cutoff (403 Forbidden)
```

---

## Demonstration Walkthrough (13-Step Flow)

### Step 1: Authentication & Role Selection
1. Open the web interface at `http://localhost:5173`.
2. Click **Sign In** and authenticate as:
   - **Doctor**: `doctor@metrohealth.demo` / `password123` (Dr. Sarah Chen, Metro Health).
   - Alternatively, test the System Admin or Patient roles via the built-in demo credentials.
3. Observe the role-aware dashboard dynamically adjusting available navigation tabs based on the authenticated JWT.

---

### Step 2: Hospital & Patient Relationship Establishment
1. Switch to the **Doctor Affiliations** or **Patient Memberships** view.
2. Observe the multi-tenant facility structure:
   - **Hospital A**: *Metro Health Center*
   - **Hospital B**: *City General Hospital*
3. Verify that the Patient (`PAT-A1001`, Alex Rivera) has an active membership at *Metro Health Center* and is formally assigned to Dr. Sarah Chen.

---

### Step 3: Synthetic Clinical Records Creation & Inspection
1. Navigate to **Clinical Records** as Dr. Sarah Chen at *Metro Health Center*.
2. Review the 6 specialized Mongoose discriminator record types:
   - `VISIT`: Outpatient checkup notes, vital signs (BP, HR, SpO2).
   - `DIAGNOSIS`: Chronic hypertension (ICD-10 `I10`), diagnostic status.
   - `MEDICATION`: Amlodipine 5mg oral daily.
   - `LAB_RESULT`: Comprehensive Metabolic Panel & Lipid profile (abnormal LDL).
   - `PRESCRIPTION`: Multi-drug prescription order.
   - `DOCUMENT`: Clinical discharge summary.
3. Add a new clinical record or inspect existing timeline entries with structured parameters.

---

### Step 4: Same-Hospital Authorized Clinical Access
1. While logged in as Dr. Sarah Chen at *Metro Health Center*, view the complete record timeline for Patient Alex Rivera.
2. Confirm that access is granted automatically:
   - Preconditions satisfied: Active Doctor Profile + Approved Hospital + Active Affiliation + Active Patient Membership + Active Assignment.

---

### Step 5: Cross-Hospital Access Denial (Security Invariant)
1. Sign in as **Dr. Robert Taylor** (affiliated exclusively with *City General Hospital*, Hospital B).
2. Attempt to query or view medical records belonging to Patient Alex Rivera at *Metro Health Center*.
3. **Expected Result**: 
   ```json
   {
     "success": false,
     "error": {
       "code": "ACCESS_DENIED",
       "message": "Doctor is not assigned to this patient at the record's hospital and has no active consent."
     }
   }
   ```
4. Access is strictly blocked with `403 Forbidden`. The tenant boundary is preserved.

---

### Step 6: Cross-Hospital Granular Access Request
1. As Dr. Robert Taylor at *City General Hospital*, navigate to **Access Requests** and click **New Access Request**.
2. Select:
   - **Target Patient**: Alex Rivera (`PAT-A1001`)
   - **Source Facility**: Metro Health Center
   - **Requested Scopes**: `VISITS`, `LAB_RESULTS` (intentionally omitting `MEDICATIONS` and `DIAGNOSES`)
   - **Clinical Purpose**: `Specialist Consultation & Second Opinion`
   - **Duration**: `7 Days`
3. Submit the request. The request enters state `PENDING`.

---

### Step 7: Patient-Governed Consent Approval
1. Sign in as **Patient Alex Rivera**.
2. Observe the real-time notification badge indicating a new cross-hospital access request.
3. Navigate to **Access Requests** -> Review Dr. Taylor's request.
4. Patient explicitly verifies the requested scopes (`VISITS`, `LAB_RESULTS`) and clicks **Approve Request**.
5. A dynamic `Consent` record is generated with status `ACTIVE`.

---

### Step 8: Scoped Cross-Hospital Record Access
1. Switch back to **Dr. Robert Taylor** (*City General Hospital*).
2. Open Patient Alex Rivera's clinical timeline.
3. Observe that Dr. Taylor can now see:
   - ✅ `VISIT` records from Metro Health Center
   - ✅ `LAB_RESULT` records from Metro Health Center
4. Confirm that non-consented scopes remain hidden and inaccessible:
   - ❌ `MEDICATION` records: Blocked by consent filter
   - ❌ `DIAGNOSIS` records: Blocked by consent filter

---

### Step 9: Clinical Assistant / AI Agent Querying
1. While logged in as Dr. Robert Taylor, navigate to the **Clinical Assistant** tab.
2. Ask a natural-language clinical question:
   > *"What abnormal laboratory findings and recent vital signs were documented for this patient?"*
3. The Express AI gateway coordinates:
   - Multi-step tool execution via FastAPI AI microservice.
   - Tool parameter validation and authoritative authorization checking.
   - Mongoose data retrieval adhering strictly to the active consent scopes (`VISITS`, `LAB_RESULTS`).

---

### Step 10: Grounded Citations & Hallucination Prevention
1. Review the generated response in the UI:
   - Grounded summary highlighting the elevated LDL lab result and recent blood pressure reading.
   - **Evidence Citations**: Interactive citation cards linking to the exact source `VisitRecord` and `LabResultRecord`.
2. Click **Inspect Record** on a citation card to view the authoritative database record.
3. Notice that no medication or diagnosis information is cited or leaked, as unconsented records were stripped prior to LLM reasoning.

---

### Step 11: Tamper-Resistant Zero-PHI Audit Trail
1. Sign in as **Hospital Admin** or **System Admin**.
2. Navigate to **Audit Trail**.
3. Inspect recent audit entries:
   - `ACCESS_REQUEST_CREATED`
   - `ACCESS_REQUEST_APPROVED`
   - `CONSENT_GRANTED`
   - `MEDICAL_RECORD_VIEWED`
   - `CLINICAL_ASSISTANT_QUERY`
   - `CLINICAL_TOOL_EXECUTED`
4. Confirm that all audit logs contain request IDs, timestamps, actor roles, and resource IDs, with **zero patient health information (PHI)**, clinical notes, or queries stored in metadata.

---

### Step 12: Real-Time Patient Consent Revocation
1. Switch back to **Patient Alex Rivera**.
2. Navigate to **Active Consents**.
3. Select the consent granted to Dr. Robert Taylor and click **Revoke Consent**.
4. The consent status transitions immediately from `ACTIVE` to `REVOKED`.

---

### Step 13: Immediate Cross-Hospital Denial Verification
1. Switch back to **Dr. Robert Taylor** (*City General Hospital*).
2. Refresh the patient record view or re-submit a query in the Clinical Assistant.
3. **Expected Result**:
   - Record view returns `403 Forbidden` (`CONSENT_REVOKED`).
   - Clinical Assistant reports access denied / empty authorized evidence.
4. Access cutoff is instantaneous, proving that Express dynamically enforces authorization on every single request.

---

## Summary of Architectural Proof Points for Interviews

| Demonstration Point | Architectural Mechanism | Source of Truth |
|---|---|---|
| **Tenant Isolation** | Multi-hospital memberships & affiliations | Mongoose compound indexes & policies |
| **Cross-Hospital Gate** | 12-invariant precondition validation | `accessRequestPolicy.js` |
| **Dynamic Consent** | Real-time `effectiveStatus` evaluation | `consentPolicy.js` |
| **Admin Clinical Shield** | Administrative exclusion rule (`ADMIN_CLINICAL_ACCESS_RESTRICTED`) | `medicalRecordPolicy.js` |
| **Authoritative AI Boundary** | Express handles all authorization & DB hydration | `searchPolicy.js` & `toolAuthorizationPolicy.js` |
| **Agent Safety Limits** | Max 4 steps, max 4 tools, 15s timeout | `agentOrchestrator.js` |
| **Hallucination Gate** | Express verifies citations against retrieved IDs | `verifyCitations()` |
| **Zero-PHI Audit Invariant** | Deep recursive sanitization | `auditService.js` |
