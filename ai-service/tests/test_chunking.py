"""Tests for clinical document representation and deterministic chunking."""
import pytest
from app.schemas.indexing import IndexRecordRequest
from app.services.chunking_service import ChunkingService


def test_chunking_visit_record():
    """VISIT record transformation should format symptoms, vitals, and diagnosis deterministically."""
    service = ChunkingService()
    record = IndexRecordRequest(
        medicalRecordId="rec_visit_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="VISIT",
        recordDate="2026-03-10",
        data={
            "reasonForVisit": "Annual cardiac follow-up",
            "symptoms": ["Palpitations", "Mild dizziness"],
            "diagnosis": "Sinus Arrhythmia",
            "vitalSigns": {
                "bloodPressure": "120/80",
                "heartRate": 74,
                "temperature": 98.6
            },
            "notes": "Patient is stable and compliant with medications."
        }
    )

    text = service.format_record_to_text(record)
    assert "Record Type: Visit / Consultation" in text
    assert "Reason for Visit: Annual cardiac follow-up" in text
    assert "Symptoms: Palpitations, Mild dizziness" in text
    assert "Diagnosis: Sinus Arrhythmia" in text
    assert "Vital Signs:" in text
    assert "bloodPressure: 120/80" in text

    chunks = service.chunk_record(record)
    assert len(chunks) == 1
    assert chunks[0].chunk_id == "rec_visit_001_chunk_0"
    assert chunks[0].patient_id == "pat_001"
    assert chunks[0].hospital_id == "hosp_001"
    assert chunks[0].doctor_id == "doc_001"
    assert chunks[0].record_type == "VISIT"


def test_chunking_all_six_discriminator_types():
    """Verify formatting across DIAGNOSIS, MEDICATION, LAB_RESULT, PRESCRIPTION, DOCUMENT."""
    service = ChunkingService()

    # 1. DIAGNOSIS
    rec_diag = IndexRecordRequest(
        medicalRecordId="rec_diag_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="DIAGNOSIS",
        recordDate="2026-03-11",
        data={
            "diagnosisCode": "I10",
            "description": "Essential (primary) hypertension",
            "category": "Cardiovascular",
            "severity": "MODERATE",
            "status": "CONFIRMED"
        }
    )
    text_diag = service.format_record_to_text(rec_diag)
    assert "Diagnosis Code (ICD): I10" in text_diag
    assert "Condition: Essential (primary) hypertension" in text_diag

    # 2. MEDICATION
    rec_med = IndexRecordRequest(
        medicalRecordId="rec_med_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="MEDICATION",
        recordDate="2026-03-12",
        data={
            "drugName": "Amlodipine Besylate",
            "dosage": "5mg",
            "frequency": "Once daily",
            "route": "Oral",
            "instructions": "Take in the morning with water"
        }
    )
    text_med = service.format_record_to_text(rec_med)
    assert "Drug Name: Amlodipine Besylate" in text_med
    assert "Dosage: 5mg" in text_med

    # 3. LAB_RESULT
    rec_lab = IndexRecordRequest(
        medicalRecordId="rec_lab_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="LAB_RESULT",
        recordDate="2026-03-13",
        data={
            "testName": "Lipid Panel",
            "testCategory": "Biochemistry",
            "results": [
                {"name": "Total Cholesterol", "value": "210", "unit": "mg/dL", "referenceRange": "<200", "flag": "HIGH"},
                {"name": "HDL", "value": "55", "unit": "mg/dL", "referenceRange": ">40", "flag": "NORMAL"}
            ],
            "conclusion": "Borderline hypercholesterolemia"
        }
    )
    text_lab = service.format_record_to_text(rec_lab)
    assert "Test Name: Lipid Panel" in text_lab
    assert "Total Cholesterol: 210 mg/dL (Ref: <200) [HIGH]" in text_lab
    assert "Conclusion: Borderline hypercholesterolemia" in text_lab

    # 4. PRESCRIPTION
    rec_rx = IndexRecordRequest(
        medicalRecordId="rec_rx_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="PRESCRIPTION",
        recordDate="2026-03-14",
        data={
            "medications": [
                {"drugName": "Lisinopril", "dosage": "10mg", "frequency": "Daily", "duration": "30 days"}
            ],
            "validityPeriod": "30 days",
            "instructions": "Check blood pressure weekly"
        }
    )
    text_rx = service.format_record_to_text(rec_rx)
    assert "Lisinopril 10mg - Daily for 30 days" in text_rx
    assert "Validity: 30 days" in text_rx

    # 5. DOCUMENT
    rec_doc = IndexRecordRequest(
        medicalRecordId="rec_doc_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="DOCUMENT",
        recordDate="2026-03-15",
        data={
            "title": "Echocardiogram Diagnostic Report",
            "documentType": "CARDIOLOGY_REPORT",
            "summary": "Normal left ventricular ejection fraction of 60%"
        }
    )
    text_doc = service.format_record_to_text(rec_doc)
    assert "Title: Echocardiogram Diagnostic Report" in text_doc
    assert "Summary: Normal left ventricular ejection fraction of 60%" in text_doc


def test_chunking_long_document_multi_chunk():
    """Very long documents should produce deterministic sequential chunks."""
    service = ChunkingService()
    long_notes = "\n".join([f"Observation line {i}: Patient reports stable progress without adverse effects." for i in range(30)])

    record = IndexRecordRequest(
        medicalRecordId="rec_long_001",
        patientId="pat_001",
        hospitalId="hosp_001",
        doctorId="doc_001",
        recordType="VISIT",
        recordDate="2026-03-15",
        data={
            "reasonForVisit": "Extensive Multi-System Clinical Review",
            "notes": long_notes
        }
    )

    chunks = service.chunk_record(record, max_chunk_chars=300)
    assert len(chunks) > 1
    assert chunks[0].chunk_id == "rec_long_001_chunk_0"
    assert chunks[1].chunk_id == "rec_long_001_chunk_1"
    # Verify context prefix on subsequent chunks
    assert "[Record Date: 2026-03-15 | Type: VISIT]" in chunks[1].text
