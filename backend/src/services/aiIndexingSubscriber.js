/**
 * Asynchronous AI Indexing Domain Event Subscriber
 * Listens to clinical domain events and triggers vector indexing in the background.
 * Any failures are logged and will NEVER affect clinical operations.
 */
const { DOMAIN_EVENTS, subscribeDomainEvent } = require('../utils/domainEvents');
const aiServiceClient = require('./aiServiceClient');
const logger = require('../utils/logger');

const initializeAIIndexingSubscriptions = () => {
  // Record Created -> Trigger Vector Indexing
  subscribeDomainEvent(DOMAIN_EVENTS.MEDICAL_RECORD_CREATED, async (payload) => {
    try {
      if (payload && payload.record) {
        logger.info(`[AIIndexingSubscriber] Triggering indexing for new record ${payload.record._id || payload.record.id}`);
        await aiServiceClient.indexRecord(payload.record);
      }
    } catch (err) {
      logger.warn('[AIIndexingSubscriber] Failed to index newly created medical record', {
        recordId: payload?.record?._id?.toString(),
        error: err.message,
      });
    }
  });

  // Record Updated -> Trigger Vector Re-indexing
  subscribeDomainEvent(DOMAIN_EVENTS.MEDICAL_RECORD_UPDATED, async (payload) => {
    try {
      if (payload && payload.record) {
        logger.info(`[AIIndexingSubscriber] Triggering re-indexing for updated record ${payload.record._id || payload.record.id}`);
        await aiServiceClient.indexRecord(payload.record);
      }
    } catch (err) {
      logger.warn('[AIIndexingSubscriber] Failed to re-index updated medical record', {
        recordId: payload?.record?._id?.toString(),
        error: err.message,
      });
    }
  });

  // Record Deleted -> Trigger Vector Deletion
  subscribeDomainEvent(DOMAIN_EVENTS.MEDICAL_RECORD_DELETED, async (payload) => {
    try {
      const recordId = payload?.recordId || payload?.record?._id;
      if (recordId) {
        logger.info(`[AIIndexingSubscriber] Triggering vector deletion for record ${recordId}`);
        await aiServiceClient.deleteRecordIndex(recordId.toString());
      }
    } catch (err) {
      logger.warn('[AIIndexingSubscriber] Failed to delete record vectors', {
        recordId: payload?.recordId?.toString(),
        error: err.message,
      });
    }
  });

  logger.info('[AIIndexingSubscriber] AI indexing event subscriptions initialized successfully');
};

initializeAIIndexingSubscriptions();

module.exports = {
  initializeAIIndexingSubscriptions,
};
