const crypto = require('crypto');
const config = require('../config/environment');
const logger = require('./logger');

class EncryptionHelper {
  static algorithm = 'aes-256-gcm';
  static keyLength = 32;
  static ivLength = 16;
  static tagLength = 16;

  // Generate encryption key from config
  static getEncryptionKey() {
    const key = config.ENCRYPTION_KEY || 'default-key-change-in-production';
    return crypto.scryptSync(key, 'salt', this.keyLength);
  }

  // Encrypt data
  static encrypt(text) {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
      
    } catch (error) {
      logger.error('Encryption error', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  static decrypt(encryptedData) {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      logger.error('Decryption error', error);
      throw new Error('Decryption failed');
    }
  }

  // Hash data (one-way)
  static hash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  // Generate secure random string
  static generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Encrypt sensitive fields in object
  static encryptSensitiveFields(obj, fieldsToEncrypt = []) {
    const encrypted = { ...obj };
    
    fieldsToEncrypt.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field].toString());
      }
    });
    
    return encrypted;
  }

  // Decrypt sensitive fields in object
  static decryptSensitiveFields(obj, fieldsToDecrypt = []) {
    const decrypted = { ...obj };
    
    fieldsToDecrypt.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'object') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          logger.warn(`Failed to decrypt field: ${field}`, error);
        }
      }
    });
    
    return decrypted;
  }
}

module.exports = EncryptionHelper;
