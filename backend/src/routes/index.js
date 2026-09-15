const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const hospitalRoutes = require('./hospitalRoutes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);

module.exports = router;
