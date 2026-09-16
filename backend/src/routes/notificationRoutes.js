const express = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} = require('../validators/notificationValidators');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// 1. List notifications for authenticated user
router.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  notificationController.listNotifications
);

// 2. Get unread notification count
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

// 3. Mark all notifications as read
router.patch(
  '/read-all',
  notificationController.markAllNotificationsRead
);

// 4. Get single notification by ID
router.get(
  '/:id',
  validate({ params: notificationIdParamSchema }),
  notificationController.getNotificationById
);

// 5. Mark single notification as read
router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  notificationController.markNotificationRead
);

module.exports = router;
