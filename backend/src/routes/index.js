const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const medicalRecordRoutes = require('./medicalRecordRoutes');
const accessRequestRoutes = require('./accessRequestRoutes');
const consentRoutes = require('./consentRoutes');
const auditRoutes = require('./auditRoutes');
const notificationRoutes = require('./notificationRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const searchRoutes = require('./searchRoutes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/records', medicalRecordRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/consents', consentRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/search', searchRoutes);

module.exports = router;


