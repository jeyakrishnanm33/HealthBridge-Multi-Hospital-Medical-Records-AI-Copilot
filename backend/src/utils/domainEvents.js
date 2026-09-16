const { EventEmitter } = require('events');
const logger = require('./logger');

/**
 * Domain event constants.
 */
const DOMAIN_EVENTS = {
  // Clinical assignments
  ASSIGNMENT_CREATED: 'ASSIGNMENT_CREATED',
  ASSIGNMENT_ENDED: 'ASSIGNMENT_ENDED',

  // Doctor affiliations
  DOCTOR_AFFILIATION_APPROVED: 'DOCTOR_AFFILIATION_APPROVED',
  DOCTOR_AFFILIATION_REJECTED: 'DOCTOR_AFFILIATION_REJECTED',
  DOCTOR_AFFILIATION_SUSPENDED: 'DOCTOR_AFFILIATION_SUSPENDED',

  // Cross-hospital access requests
  ACCESS_REQUEST_CREATED: 'ACCESS_REQUEST_CREATED',
  ACCESS_REQUEST_APPROVED: 'ACCESS_REQUEST_APPROVED',
  ACCESS_REQUEST_DENIED: 'ACCESS_REQUEST_DENIED',
  ACCESS_REQUEST_CANCELLED: 'ACCESS_REQUEST_CANCELLED',

  // Patient consent
  CONSENT_CREATED: 'CONSENT_CREATED',
  CONSENT_REVOKED: 'CONSENT_REVOKED',

  // Hospital lifecycle
  HOSPITAL_STATUS_CHANGED: 'HOSPITAL_STATUS_CHANGED',

  // Medical Records
  MEDICAL_RECORD_CREATED: 'MEDICAL_RECORD_CREATED',
  MEDICAL_RECORD_UPDATED: 'MEDICAL_RECORD_UPDATED',
  MEDICAL_RECORD_DELETED: 'MEDICAL_RECORD_DELETED',

  // Appointments
  APPOINTMENT_REQUESTED: 'APPOINTMENT_REQUESTED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_REJECTED: 'APPOINTMENT_REJECTED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
};

class DomainEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow ample listeners without memory leak warnings
    this.setMaxListeners(50);
  }
}

const domainEventEmitter = new DomainEventEmitter();

/**
 * Publishes an in-process domain event.
 * Wraps handler execution in safe error handling so that notification or side-effect
 * failures do not disrupt the primary business transaction.
 *
 * @param {string} eventName - Name of the domain event from DOMAIN_EVENTS
 * @param {Object} payload - Event payload containing domain entities and context
 */
const publishDomainEvent = async (eventName, payload) => {
  try {
    logger.info(`[DomainEvent] Publishing event: ${eventName}`, {
      event: eventName,
      resourceId: payload?.resourceId || payload?.id,
    });
    // Emit event to listeners
    domainEventEmitter.emit(eventName, payload);
  } catch (err) {
    logger.error(`[DomainEvent] Error publishing event ${eventName}: ${err.message}`, {
      error: err.message,
      stack: err.stack,
    });
  }
};

/**
 * Subscribes a handler to an in-process domain event.
 * Ensures any asynchronous handler errors are caught and logged.
 *
 * @param {string} eventName - Name of the event to subscribe to
 * @param {Function} handler - Async or sync handler function
 */
const subscribeDomainEvent = (eventName, handler) => {
  domainEventEmitter.on(eventName, async (payload) => {
    try {
      await handler(payload);
    } catch (err) {
      logger.error(`[DomainEvent] Handler failure for event ${eventName}: ${err.message}`, {
        event: eventName,
        error: err.message,
        stack: err.stack,
      });
    }
  });
};

module.exports = {
  DOMAIN_EVENTS,
  publishDomainEvent,
  subscribeDomainEvent,
  domainEventEmitter,
};
