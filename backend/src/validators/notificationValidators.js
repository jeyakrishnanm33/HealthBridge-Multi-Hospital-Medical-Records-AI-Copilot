const { z } = require('zod');
const { NOTIFICATION_TYPES } = require('../models/Notification');
const { commonValidators } = require('./index');

const notificationIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const listNotificationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  status: z.enum(['UNREAD', 'READ', 'ALL']).optional().default('ALL'),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

module.exports = {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
};
