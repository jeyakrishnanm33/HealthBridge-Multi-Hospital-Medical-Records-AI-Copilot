const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { verifyNotificationRecipient } = require('../policies/notificationPolicy');
const { BadRequestError, NotFoundError } = require('../errors/AppError');
const { DOMAIN_EVENTS, subscribeDomainEvent } = require('../utils/domainEvents');
const logger = require('../utils/logger');

const notificationPopulation = [
  { path: 'actor', select: 'name email role' },
  { path: 'hospital', select: 'name hospitalCode status' },
  { path: 'patient', select: 'patientId gender' },
];

/**
 * Creates a single notification for a specific recipient user.
 * Validates recipient presence, type validity, and privacy guidelines.
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  resourceType = null,
  resourceId = null,
  patient = null,
  hospital = null,
  actor = null,
}) => {
  if (!recipient) {
    throw new BadRequestError('Recipient User ID is required', 'NOTIFICATION_RECIPIENT_REQUIRED');
  }

  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new BadRequestError(`Invalid notification type: ${type}`, 'INVALID_NOTIFICATION_TYPE');
  }

  const notification = await Notification.create({
    recipient,
    type,
    title: title.trim(),
    message: message.trim(),
    resourceType,
    resourceId,
    patient,
    hospital,
    actor,
    status: 'UNREAD',
  });

  logger.info(`[NotificationService] Created notification ${notification._id} for recipient ${recipient} (type: ${type})`);

  return notification;
};

/**
 * Batch creates multiple notifications.
 */
const createNotifications = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const validated = items.map((item) => {
    if (!item.recipient) {
      throw new BadRequestError('Recipient User ID is required for all notifications', 'NOTIFICATION_RECIPIENT_REQUIRED');
    }
    if (!NOTIFICATION_TYPES.includes(item.type)) {
      throw new BadRequestError(`Invalid notification type: ${item.type}`, 'INVALID_NOTIFICATION_TYPE');
    }
    return {
      recipient: item.recipient,
      type: item.type,
      title: item.title.trim(),
      message: item.message.trim(),
      resourceType: item.resourceType || null,
      resourceId: item.resourceId || null,
      patient: item.patient || null,
      hospital: item.hospital || null,
      actor: item.actor || null,
      status: 'UNREAD',
    };
  });

  return await Notification.insertMany(validated);
};

/**
 * Lists notifications strictly for the authenticated recipient user.
 */
const listNotifications = async ({ user, query = {} }) => {
  const userId = user.id || user._id;
  const filter = { recipient: userId };

  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  if (query.type) {
    filter.type = query.type;
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate(notificationPopulation)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, status: 'UNREAD' }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieves a single notification ensuring the caller is the recipient.
 */
const getNotificationById = async ({ notificationId, user }) => {
  const notification = await Notification.findById(notificationId).populate(notificationPopulation);
  if (!notification) {
    throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  verifyNotificationRecipient(notification, user);

  return notification;
};

/**
 * Marks a notification as read for the authenticated recipient.
 */
const markNotificationRead = async ({ notificationId, user }) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  verifyNotificationRecipient(notification, user);

  if (notification.status !== 'READ') {
    notification.status = 'READ';
    notification.readAt = new Date();
    await notification.save();
  }

  return await Notification.findById(notification._id).populate(notificationPopulation);
};

/**
 * Marks all unread notifications as read for the authenticated user.
 */
const markAllNotificationsRead = async ({ user }) => {
  const userId = user.id || user._id;

  const result = await Notification.updateMany(
    { recipient: userId, status: 'UNREAD' },
    { $set: { status: 'READ', readAt: new Date() } }
  );

  return {
    modifiedCount: result.modifiedCount || 0,
    unreadCount: 0,
  };
};

/**
 * Returns the count of unread notifications for the authenticated user.
 */
const getUnreadCount = async ({ user }) => {
  const userId = user.id || user._id;
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    status: 'UNREAD',
  });

  return { unreadCount };
};

// ----------------------------------------------------------------------------
// Domain Event Listeners (Decoupled Side-Effect Ingestion)
// ----------------------------------------------------------------------------

/**
 * Register domain event subscriptions for automatic clinical notification dispatch.
 */
const initializeDomainEventSubscriptions = () => {
  // 1. Assignment Created -> Notify Doctor and Patient
  subscribeDomainEvent(DOMAIN_EVENTS.ASSIGNMENT_CREATED, async (payload) => {
    const { assignment, doctorUser, patientUser, hospitalName, doctorName, patientId } = payload;
    const notifications = [];

    if (doctorUser) {
      notifications.push({
        recipient: doctorUser,
        type: 'ASSIGNMENT_CREATED',
        title: 'New Patient Assignment',
        message: `You have been assigned to patient ${patientId || ''} at ${hospitalName || 'your hospital'}.`,
        resourceType: 'ASSIGNMENT',
        resourceId: assignment?._id,
        patient: assignment?.patient,
        hospital: assignment?.hospital,
        actor: payload.actor,
      });
    }

    if (patientUser) {
      notifications.push({
        recipient: patientUser,
        type: 'ASSIGNMENT_CREATED',
        title: 'Physician Assignment Confirmed',
        message: `Dr. ${doctorName || 'a physician'} has been assigned as your attending doctor at ${hospitalName || 'the hospital'}.`,
        resourceType: 'ASSIGNMENT',
        resourceId: assignment?._id,
        patient: assignment?.patient,
        hospital: assignment?.hospital,
        actor: payload.actor,
      });
    }

    if (notifications.length > 0) {
      await createNotifications(notifications);
    }
  });

  // 2. Assignment Ended -> Notify Doctor and Patient
  subscribeDomainEvent(DOMAIN_EVENTS.ASSIGNMENT_ENDED, async (payload) => {
    const { assignment, doctorUser, patientUser, hospitalName, doctorName, patientId } = payload;
    const notifications = [];

    if (doctorUser) {
      notifications.push({
        recipient: doctorUser,
        type: 'ASSIGNMENT_ENDED',
        title: 'Patient Assignment Concluded',
        message: `Your clinical assignment for patient ${patientId || ''} at ${hospitalName || 'the hospital'} has ended.`,
        resourceType: 'ASSIGNMENT',
        resourceId: assignment?._id,
        patient: assignment?.patient,
        hospital: assignment?.hospital,
        actor: payload.actor,
      });
    }

    if (patientUser) {
      notifications.push({
        recipient: patientUser,
        type: 'ASSIGNMENT_ENDED',
        title: 'Doctor Assignment Concluded',
        message: `Your clinical assignment with Dr. ${doctorName || 'your physician'} at ${hospitalName || 'the hospital'} has ended.`,
        resourceType: 'ASSIGNMENT',
        resourceId: assignment?._id,
        patient: assignment?.patient,
        hospital: assignment?.hospital,
        actor: payload.actor,
      });
    }

    if (notifications.length > 0) {
      await createNotifications(notifications);
    }
  });

  // 3. Doctor Affiliation Approved
  subscribeDomainEvent(DOMAIN_EVENTS.DOCTOR_AFFILIATION_APPROVED, async (payload) => {
    const { doctorUser, hospitalName, affiliationId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'DOCTOR_AFFILIATION_APPROVED',
        title: 'Hospital Affiliation Approved',
        message: `Your clinical affiliation with ${hospitalName || 'the hospital'} has been approved.`,
        resourceType: 'DOCTOR',
        resourceId: affiliationId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 4. Doctor Affiliation Rejected
  subscribeDomainEvent(DOMAIN_EVENTS.DOCTOR_AFFILIATION_REJECTED, async (payload) => {
    const { doctorUser, hospitalName, affiliationId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'DOCTOR_AFFILIATION_REJECTED',
        title: 'Hospital Affiliation Decision',
        message: `Your affiliation request for ${hospitalName || 'the hospital'} was not approved.`,
        resourceType: 'DOCTOR',
        resourceId: affiliationId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 5. Doctor Affiliation Suspended
  subscribeDomainEvent(DOMAIN_EVENTS.DOCTOR_AFFILIATION_SUSPENDED, async (payload) => {
    const { doctorUser, hospitalName, affiliationId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'DOCTOR_AFFILIATION_SUSPENDED',
        title: 'Hospital Affiliation Suspended',
        message: `Your clinical affiliation with ${hospitalName || 'the hospital'} has been suspended.`,
        resourceType: 'DOCTOR',
        resourceId: affiliationId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 6. Access Request Created -> Notify Patient
  subscribeDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_CREATED, async (payload) => {
    const { patientUser, doctorName, requestingHospitalName, sourceHospitalName, accessRequestId, patientId, hospitalId, actor } = payload;
    if (patientUser) {
      await createNotification({
        recipient: patientUser,
        type: 'ACCESS_REQUEST_CREATED',
        title: 'Cross-Hospital Access Request',
        message: `Dr. ${doctorName || 'A physician'} from ${requestingHospitalName || 'another hospital'} requested access to your medical records at ${sourceHospitalName || 'your hospital'}.`,
        resourceType: 'ACCESS_REQUEST',
        resourceId: accessRequestId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 7. Access Request Approved -> Notify Requesting Doctor
  subscribeDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_APPROVED, async (payload) => {
    const { doctorUser, patientCode, accessRequestId, patientId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'ACCESS_REQUEST_APPROVED',
        title: 'Access Request Approved',
        message: `Patient ${patientCode || ''} has approved your cross-hospital medical record access request.`,
        resourceType: 'ACCESS_REQUEST',
        resourceId: accessRequestId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 8. Access Request Denied -> Notify Requesting Doctor
  subscribeDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_DENIED, async (payload) => {
    const { doctorUser, patientCode, accessRequestId, patientId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'ACCESS_REQUEST_DENIED',
        title: 'Access Request Denied',
        message: `Patient ${patientCode || ''} has denied your cross-hospital medical record access request.`,
        resourceType: 'ACCESS_REQUEST',
        resourceId: accessRequestId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 9. Access Request Cancelled -> Notify Patient
  subscribeDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_CANCELLED, async (payload) => {
    const { patientUser, doctorName, accessRequestId, patientId, hospitalId, actor } = payload;
    if (patientUser) {
      await createNotification({
        recipient: patientUser,
        type: 'ACCESS_REQUEST_CANCELLED',
        title: 'Access Request Cancelled',
        message: `Dr. ${doctorName || 'The requesting physician'} has cancelled their cross-hospital medical record access request.`,
        resourceType: 'ACCESS_REQUEST',
        resourceId: accessRequestId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 10. Consent Created -> Notify Requesting Doctor
  subscribeDomainEvent(DOMAIN_EVENTS.CONSENT_CREATED, async (payload) => {
    const { doctorUser, patientCode, sourceHospitalName, consentId, patientId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'CONSENT_CREATED',
        title: 'Patient Consent Active',
        message: `Clinical access consent is now active for patient ${patientCode || ''} records at ${sourceHospitalName || 'the source hospital'}.`,
        resourceType: 'CONSENT',
        resourceId: consentId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 11. Consent Revoked -> Notify Doctor
  subscribeDomainEvent(DOMAIN_EVENTS.CONSENT_REVOKED, async (payload) => {
    const { doctorUser, patientCode, sourceHospitalName, consentId, patientId, hospitalId, actor } = payload;
    if (doctorUser) {
      await createNotification({
        recipient: doctorUser,
        type: 'CONSENT_REVOKED',
        title: 'Clinical Consent Revoked',
        message: `Patient ${patientCode || ''} has revoked cross-hospital access consent for records at ${sourceHospitalName || 'the source hospital'}.`,
        resourceType: 'CONSENT',
        resourceId: consentId,
        patient: patientId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  // 12. Hospital Status Changed -> Notify Hospital Admin
  subscribeDomainEvent(DOMAIN_EVENTS.HOSPITAL_STATUS_CHANGED, async (payload) => {
    const { adminUser, hospitalName, newStatus, hospitalId, actor } = payload;
    if (adminUser) {
      const type =
        newStatus === 'APPROVED'
          ? 'HOSPITAL_APPROVED'
          : newStatus === 'REJECTED'
          ? 'HOSPITAL_REJECTED'
          : 'HOSPITAL_SUSPENDED';

      await createNotification({
        recipient: adminUser,
        type,
        title: 'Hospital Status Updated',
        message: `Your hospital ${hospitalName || ''} status has transitioned to ${newStatus}.`,
        resourceType: 'HOSPITAL',
        resourceId: hospitalId,
        hospital: hospitalId,
        actor,
      });
    }
  });

  logger.info('[NotificationService] Domain event subscriptions initialized successfully');
};

// Initialize listeners on module load
initializeDomainEventSubscriptions();

module.exports = {
  createNotification,
  createNotifications,
  listNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  initializeDomainEventSubscriptions,
};
