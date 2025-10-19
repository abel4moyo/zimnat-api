const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/environment');
const logger = require('../utils/logger');

class AuthenticationService {
  static async generateJWT(payload) {
    try {
      const token = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
        issuer: 'fcb-zimnat-api',
        audience: 'fcb-zimnat-clients'
      });

      return token;

    } catch (error) {
      logger.error('Error generating JWT', error);
      throw error;
    }
  }

  static async verifyJWT(token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'fcb-zimnat-api',
        audience: 'fcb-zimnat-clients'
      });

      return decoded;

    } catch (error) {
      logger.error('Error verifying JWT', error);
      throw {
        status: 401,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      };
    }
  }

  static async authenticateUser(credentials) {
    try {
      const { username, password } = credentials;

      // For demo purposes, using hardcoded credentials
      // In production, this should check against a user database
      const validCredentials = [
        { username: 'zimnat_user', password: 'zimnat_password' },
        { username: 'admin', password: 'admin_password' },
        { username: 'fcb_user', password: 'fcb_password' }
      ];

      const user = validCredentials.find(u => u.username === username);
      
      if (!user || user.password !== password) {
        throw {
          status: 401,
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Generate JWT token
      const tokenPayload = {
        userId: user.username,
        username: user.username,
        loginTime: new Date().toISOString()
      };

      const token = await this.generateJWT(tokenPayload);

      logger.info('User authenticated', {
        username: user.username,
        loginTime: tokenPayload.loginTime
      });

      return {
        token,
        user: {
          username: user.username,
          loginTime: tokenPayload.loginTime
        },
        expiresIn: config.JWT_EXPIRES_IN
      };

    } catch (error) {
      logger.error('Error authenticating user', error);
      throw error;
    }
  }

  static async hashPassword(password) {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;

    } catch (error) {
      logger.error('Error hashing password', error);
      throw error;
    }
  }

  static async verifyPassword(password, hashedPassword) {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      return isValid;

    } catch (error) {
      logger.error('Error verifying password', error);
      throw error;
    }
  }
}

module.exports = AuthenticationService;