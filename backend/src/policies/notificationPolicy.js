const { ForbiddenError, NotFoundError } = require('../errors/AppError');

/**
 * Enforces that a notification can only be accessed or modified by its recipient.
 * Neither Hospital Administrators nor System Administrators are permitted to inspect
 * or mark other users' personal notifications.
 *
 * @param {Object} notification - Mongoose Notification document
 * @param {Object} user - Authenticated user object from req.user
 */
const verifyNotificationRecipient = (notification, user) => {
  if (!notification) {
    throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  const recipientIdStr = (
    notification.recipient?._id ||
    notification.recipient?.id ||
    notification.recipient ||
    ''
  ).toString();

  const userIdStr = (user?.id || user?._id || '').toString();

  if (!recipientIdStr || recipientIdStr !== userIdStr) {
    throw new ForbiddenError(
      'You are not authorized to view or manage notifications for another user',
      'NOTIFICATION_ACCESS_FORBIDDEN'
    );
  }
};

module.exports = {
  verifyNotificationRecipient,
};
