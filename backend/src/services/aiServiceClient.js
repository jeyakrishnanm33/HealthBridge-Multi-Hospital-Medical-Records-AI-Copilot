/**
 * Internal AI Service HTTP Client
 * Secure communication channel between Express Backend and FastAPI AI Service
 */
const env = require('../config/env');
const logger = require('../utils/logger');

class AIServiceClient {
  constructor() {
    this.baseUrl = (env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
    this.secretKey = env.AI_SERVICE_SECRET_KEY || 'hb_internal_secret_key_change_in_production_32char';
  }

  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': this.secretKey,
    };
  }

  /**
   * Check health of AI service
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        return { status: 'unhealthy', statusCode: response.status };
      }
      return await response.json();
    } catch (err) {
      logger.warn('[AIServiceClient] Health check failed', { error: err.message });
      return { status: 'unavailable', error: err.message };
    }
  }

  /**
   * Format MedicalRecord Mongoose document into AI Indexing payload
   */
  _extractRecordData(record) {
    const raw = typeof record.toObject === 'function' ? record.toObject() : record;
    const {
      _id,
      patient,
      hospital,
      doctor,
      recordType,
      recordDate,
      createdAt,
      updatedAt,
      __v,
      ...clinicalData
    } = raw;

    return clinicalData;
  }

  /**
   * Asynchronously index or re-index a medical record
   */
  async indexRecord(record) {
    try {
      const payload = {
        medicalRecordId: (record._id || record.id).toString(),
        patientId: (record.patient._id || record.patient).toString(),
        hospitalId: (record.hospital._id || record.hospital).toString(),
        doctorId: (record.doctor._id || record.doctor).toString(),
        recordType: record.recordType,
        recordDate: record.recordDate
          ? (record.recordDate instanceof Date ? record.recordDate.toISOString() : String(record.recordDate))
          : new Date().toISOString(),
        data: this._extractRecordData(record),
      };

      const response = await fetch(`${this.baseUrl}/internal/index`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('[AIServiceClient] AI service returned error during indexing', {
          status: response.status,
          recordId: payload.medicalRecordId,
          error: errorText,
        });
        return { success: false, error: errorText };
      }

      const data = await response.json();
      logger.info(`[AIServiceClient] Successfully indexed record ${payload.medicalRecordId} (${data.indexedChunks} chunks)`);
      return data;
    } catch (err) {
      // Non-blocking: record indexing failure must NOT break the medical record creation/update
      logger.warn('[AIServiceClient] Network error while indexing record', {
        recordId: (record._id || record.id)?.toString(),
        error: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete record vectors
   */
  async deleteRecordIndex(medicalRecordId) {
    try {
      const response = await fetch(`${this.baseUrl}/internal/index/${medicalRecordId}`, {
        method: 'DELETE',
        headers: this._getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('[AIServiceClient] Failed to delete record index', {
          recordId: medicalRecordId,
          status: response.status,
        });
        return { success: false, error: errorText };
      }

      return await response.json();
    } catch (err) {
      logger.warn('[AIServiceClient] Network error deleting record index', {
        recordId: medicalRecordId,
        error: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Perform semantic similarity search
   */
  async search({ query, patientId, hospitalId, doctorId, recordTypes, fromDate, toDate, limit = 10 }) {
    try {
      const payload = {
        query,
        filters: {
          patientId: patientId || undefined,
          hospitalId: hospitalId || undefined,
          doctorId: doctorId || undefined,
          recordTypes: Array.isArray(recordTypes) && recordTypes.length > 0 ? recordTypes : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          limit: Number(limit) || 10,
        },
      };

      const response = await fetch(`${this.baseUrl}/internal/search`, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[AIServiceClient] Search query failed in AI service', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`AI search service error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error('[AIServiceClient] Failed to connect to AI search service', { error: err.message });
      throw err;
    }
  }
}

const aiServiceClient = new AIServiceClient();
module.exports = aiServiceClient;
