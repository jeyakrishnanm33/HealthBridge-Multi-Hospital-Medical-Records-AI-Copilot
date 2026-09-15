const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { registerSchema, loginSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
