/*const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin } = require('../validators/zimnatValidator');

router.post('/api/authenticate',
  validateLogin,
  authController.authenticate
);

module.exports = router; */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { body } = require('express-validator');

router.post('/api/authenticate',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  AuthController.authenticate
);

router.post('/api/v1/auth/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  AuthController.refreshToken
);

/* DISABLED - Using ZIMNAT v2.1 logout instead
router.post('/api/v1/auth/logout',
  AuthController.logout
);
*/

/**
 * ZIMNAT API v2.1 - Authentication endpoints
 */
const ZimnatAuthController = require('../controllers/zimnatAuthController');
const { validateJWT } = require('../middleware/jwtMiddleware');

// POST /api/v1/auth/login - Generate JWT access token
// Note: express-validator may show snake_case in errors, but fields should be camelCase
router.post('/api/v1/auth/login', ZimnatAuthController.login);

// POST /api/v1/auth/logout - Revoke JWT token
router.post('/api/v1/auth/logout',
  ZimnatAuthController.logout
);

// GET /api/v1/auth/verify - Verify JWT token validity
router.get('/api/v1/auth/verify',
  validateJWT,
  ZimnatAuthController.verify
);

module.exports = router;