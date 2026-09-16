"""Deterministic clinical document representation and chunking service."""
from typing import Any, Dict, List
from pydantic import BaseModel

from app.schemas.indexing import IndexRecordRequest


class ClinicalChunk(BaseModel):
    """A deterministic chunk extracted from a clinical record."""
    chunk_id: str
    text: str
    medical_record_id: str
    patient_id: str
    hospital_id: str
    doctor_id: str
    record_type: str
    record_date: str


class ChunkingService:
    """Service to transform structured medical records into deterministic searchable text chunks."""

    @staticmethod
    def _format_visit(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Visit / Consultation"]
        if "reasonForVisit" in data:
            parts.append(f"Reason for Visit: {data['reasonForVisit']}")
        if "symptoms" in data:
            symptoms = data["symptoms"]
            symptoms_str = ", ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)
            parts.append(f"Symptoms: {symptoms_str}")
        if "diagnosis" in data:
            parts.append(f"Diagnosis: {data['diagnosis']}")
        if "vitalSigns" in data and isinstance(data["vitalSigns"], dict):
            vitals = data["vitalSigns"]
            vital_items = [f"{k}: {v}" for k, v in vitals.items() if v is not None]
            if vital_items:
                parts.append(f"Vital Signs: {', '.join(vital_items)}")
        if "notes" in data:
            parts.append(f"Clinical Notes: {data['notes']}")
        return "\n".join(parts)

    @staticmethod
    def _format_diagnosis(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Clinical Diagnosis"]
        if "diagnosisCode" in data:
            parts.append(f"Diagnosis Code (ICD): {data['diagnosisCode']}")
        if "description" in data:
            parts.append(f"Condition: {data['description']}")
        if "category" in data:
            parts.append(f"Category: {data['category']}")
        if "severity" in data:
            parts.append(f"Severity: {data['severity']}")
        if "status" in data:
            parts.append(f"Status: {data['status']}")
        if "notes" in data:
            parts.append(f"Notes: {data['notes']}")
        return "\n".join(parts)

    @staticmethod
    def _format_medication(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Medication"]
        if "drugName" in data:
            parts.append(f"Drug Name: {data['drugName']}")
        if "dosage" in data:
            parts.append(f"Dosage: {data['dosage']}")
        if "frequency" in data:
            parts.append(f"Frequency: {data['frequency']}")
        if "route" in data:
            parts.append(f"Route: {data['route']}")
        if "instructions" in data:
            parts.append(f"Instructions: {data['instructions']}")
        if "startDate" in data or "endDate" in data:
            parts.append(f"Schedule: {data.get('startDate', '')} to {data.get('endDate', 'ongoing')}")
        if "notes" in data:
            parts.append(f"Notes: {data['notes']}")
        return "\n".join(parts)

    @staticmethod
    def _format_lab_result(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Laboratory Result"]
        if "testName" in data:
            parts.append(f"Test Name: {data['testName']}")
        if "testCategory" in data:
            parts.append(f"Category: {data['testCategory']}")
        if "testDate" in data:
            parts.append(f"Test Date: {data['testDate']}")
        if "results" in data and isinstance(data["results"], list):
            res_lines = []
            for item in data["results"]:
                if isinstance(item, dict):
                    name = item.get("name", "")
                    val = item.get("value", "")
                    unit = item.get("unit", "")
                    ref = item.get("referenceRange", "")
                    flag = item.get("flag", "")
                    line = f"{name}: {val} {unit}".strip()
                    if ref:
                        line += f" (Ref: {ref})"
                    if flag:
                        line += f" [{flag}]"
                    res_lines.append(line)
            if res_lines:
                parts.append("Panel Results:\n  - " + "\n  - ".join(res_lines))
        if "conclusion" in data:
            parts.append(f"Conclusion: {data['conclusion']}")
        if "notes" in data:
            parts.append(f"Notes: {data['notes']}")
        return "\n".join(parts)

    @staticmethod
    def _format_prescription(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Prescription Order"]
        if "medications" in data and isinstance(data["medications"], list):
            med_lines = []
            for m in data["medications"]:
                if isinstance(m, dict):
                    name = m.get("drugName", "")
                    dose = m.get("dosage", "")
                    freq = m.get("frequency", "")
                    dur = m.get("duration", "")
                    instr = m.get("instructions", "")
                    med_str = f"{name} {dose} - {freq} for {dur}".strip()
                    if instr:
                        med_str += f" ({instr})"
                    med_lines.append(med_str)
                else:
                    med_lines.append(str(m))
            if med_lines:
                parts.append("Prescribed Items:\n  - " + "\n  - ".join(med_lines))
        if "validityPeriod" in data:
            parts.append(f"Validity: {data['validityPeriod']}")
        if "instructions" in data:
            parts.append(f"General Instructions: {data['instructions']}")
        if "notes" in data:
            parts.append(f"Notes: {data['notes']}")
        return "\n".join(parts)

    @staticmethod
    def _format_document(data: Dict[str, Any]) -> str:
        parts = ["Record Type: Medical Document Attachment"]
        if "title" in data:
            parts.append(f"Title: {data['title']}")
        if "documentType" in data:
            parts.append(f"Document Type: {data['documentType']}")
        if "summary" in data:
            parts.append(f"Summary: {data['summary']}")
        if "description" in data:
            parts.append(f"Description: {data['description']}")
        if "notes" in data:
            parts.append(f"Notes: {data['notes']}")
        return "\n".join(parts)

    def format_record_to_text(self, record: IndexRecordRequest) -> str:
        """Deterministically transform a medical record into structured clinical text."""
        rec_type = (record.recordType or "").upper()
        data = record.data or {}

        # Base header
        header = f"Clinical Record Date: {record.recordDate}\nRecord Discriminator: {rec_type}"

        if rec_type == "VISIT":
            body = self._format_visit(data)
        elif rec_type == "DIAGNOSIS":
            body = self._format_diagnosis(data)
        elif rec_type == "MEDICATION":
            body = self._format_medication(data)
        elif rec_type == "LAB_RESULT":
            body = self._format_lab_result(data)
        elif rec_type == "PRESCRIPTION":
            body = self._format_prescription(data)
        elif rec_type == "DOCUMENT":
            body = self._format_document(data)
        else:
            # Fallback for generic or custom payload
            body = f"Record Type: {rec_type}\n" + "\n".join(f"{k}: {v}" for k, v in data.items())

        return f"{header}\n{body}".strip()

    def chunk_record(self, record: IndexRecordRequest, max_chunk_chars: int = 800) -> List[ClinicalChunk]:
        """Produce deterministic chunks from a medical record."""
        full_text = self.format_record_to_text(record)

        # If full text fits comfortably in one chunk, produce a single chunk
        if len(full_text) <= max_chunk_chars:
            return [
                ClinicalChunk(
                    chunk_id=f"{record.medicalRecordId}_chunk_0",
                    text=full_text,
                    medical_record_id=record.medicalRecordId,
                    patient_id=record.patientId,
                    hospital_id=record.hospitalId,
                    doctor_id=record.doctorId,
                    record_type=record.recordType.upper(),
                    record_date=record.recordDate
                )
            ]

        # Multi-chunk splitting on section boundaries or line breaks
        lines = full_text.split("\n")
        chunks_text: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        # Prefix for subsequent chunks to maintain context
        context_prefix = f"[Record Date: {record.recordDate} | Type: {record.recordType.upper()}]\n"

        for line in lines:
            line_len = len(line) + 1
            if current_len + line_len > max_chunk_chars and current_chunk:
                chunks_text.append("\n".join(current_chunk))
                current_chunk = [line]
                current_len = line_len
            else:
                current_chunk.append(line)
                current_len += line_len

        if current_chunk:
            chunks_text.append("\n".join(current_chunk))

        result_chunks: List[ClinicalChunk] = []
        for i, text_segment in enumerate(chunks_text):
            final_text = text_segment if i == 0 else context_prefix + text_segment
            result_chunks.append(
                ClinicalChunk(
                    chunk_id=f"{record.medicalRecordId}_chunk_{i}",
                    text=final_text,
                    medical_record_id=record.medicalRecordId,
                    patient_id=record.patientId,
                    hospital_id=record.hospitalId,
                    doctor_id=record.doctorId,
                    record_type=record.recordType.upper(),
                    record_date=record.recordDate
                )
            )

        return result_chunks
