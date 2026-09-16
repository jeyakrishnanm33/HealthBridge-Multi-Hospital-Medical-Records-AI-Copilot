const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createAssignmentSchema,
  assignmentIdParamSchema,
  listAssignmentsQuerySchema,
} = require('../validators/assignmentValidators');

const router = express.Router();

// All assignment endpoints require authentication
router.use(authenticate);

// Create Assignment (Hospital Admin & System Admin only)
router.post(
  '/',
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ body: createAssignmentSchema }),
  assignmentController.createAssignment
);

// List Assignments (Role-scoped internally)
router.get(
  '/',
  validate({ query: listAssignmentsQuerySchema }),
  assignmentController.listAssignments
);

// Get Assignment by ID
router.get(
  '/:id',
  validate({ params: assignmentIdParamSchema }),
  assignmentController.getAssignmentById
);

// End Assignment (Hospital Admin & System Admin only)
router.patch(
  '/:id/end',
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: assignmentIdParamSchema }),
  assignmentController.endAssignment
);

module.exports = router;
