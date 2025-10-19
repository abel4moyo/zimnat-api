

const AuthenticationService = require('../services/authenticationService');
const logger = require('../utils/logger');

class AuthController {
  static async authenticate(req, res, next) {
    try {
      const { username, password } = req.body;
      
      const authResult = await AuthenticationService.authenticate(username, password);
      
      if (!authResult.success) {
        logger.warn('Authentication failed', { 
          username, 
          ip: req.ip,
          reason: authResult.reason 
        });
        
        return res.status(401).json({
          status: 'ERROR',
          errorCode: 'AUTH_FAILED_001',
          errorMessage: 'Invalid username or password'
        });
      }

      logger.info('Authentication successful', { 
        username, 
        ip: req.ip,
        tokenExpiry: authResult.expiresAt 
      });

      res.json({
        status: 'SUCCESS',
        data: {
          id_token: authResult.token,
          token_type: 'Bearer',
          expires_in: authResult.expiresIn,
          expires_at: authResult.expiresAt
        }
      });
    } catch (error) {
      logger.error('Authentication service error', { 
        error: error.message, 
        stack: error.stack, 
        username: req.body.username,
        ip: req.ip 
      });
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      const refreshResult = await AuthenticationService.refreshToken(refreshToken);
      
      if (!refreshResult.success) {
        return res.status(401).json({
          status: 'ERROR',
          errorCode: 'TOKEN_REFRESH_FAILED',
          errorMessage: 'Invalid or expired refresh token'
        });
      }

      res.json({
        status: 'SUCCESS',
        data: {
          id_token: refreshResult.token,
          token_type: 'Bearer',
          expires_in: refreshResult.expiresIn,
          expires_at: refreshResult.expiresAt
        }
      });
    } catch (error) {
      logger.error('Token refresh failed', { 
        error: error.message, 
        stack: error.stack 
      });
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        await AuthenticationService.invalidateToken(token);
      }

      res.json({
        status: 'SUCCESS',
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout failed', { 
        error: error.message, 
        stack: error.stack 
      });
      next(error);
    }
  }
}

module.exports = AuthController;