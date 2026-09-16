const notificationService = require('../services/notificationService');

/**
 * Controller handling user notification endpoints.
 */
const listNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.listNotifications({
      user: req.user,
      query: req.query,
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById({
      notificationId: req.params.id,
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationRead({
      notificationId: req.params.id,
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (err) {
    next(err);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsRead({
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount({
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
};
