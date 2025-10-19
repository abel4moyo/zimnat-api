const logger = require('./logger');

class ValidationHelper {
  // Validate Zimbabwean ID number
  static validateZimbabweanID(idNumber) {
    if (!idNumber || typeof idNumber !== 'string') {
      return false;
    }
    
    // Zimbabwean ID format: 12-345678-A-12
    const idRegex = /^\d{2}-\d{6}-[A-Z]-\d{2}$/;
    return idRegex.test(idNumber);
  }

  // Validate vehicle registration number
  static validateVehicleRegistration(vrn) {
    if (!vrn || typeof vrn !== 'string') {
      return false;
    }
    
    // Zimbabwean VRN format: AAA-123A or AAA-1234
    const vrnRegex = /^[A-Z]{3}-\d{3,4}[A-Z]?$/;
    return vrnRegex.test(vrn.toUpperCase());
  }

  // Validate phone number
  static validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Zimbabwe phone number patterns
    const patterns = [
      /^263\d{9}$/, // +263 format
      /^0\d{9}$/, // Local format starting with 0
      /^\d{9}$/ // Without country code or leading 0
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  }

  // Validate email
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate currency amount
  static validateCurrencyAmount(amount) {
    if (amount === null || amount === undefined) {
      return false;
    }
    
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount >= 0 && numAmount <= 999999999.99;
  }

  // Validate date string
  static validateDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  // Sanitize string input
  static sanitizeString(input, maxLength = 255) {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[<>'"&]/g, ''); // Remove potential XSS characters
  }

  // Validate and sanitize object
  static validateAndSanitizeObject(obj, schema) {
    const result = {};
    const errors = [];
    
    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];
      
      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }
      
      // Skip validation if field is optional and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      // Type validation
      if (rules.type) {
        switch (rules.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${key} must be a string`);
              continue;
            }
            result[key] = this.sanitizeString(value, rules.maxLength);
            break;
            
          case 'number':
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              errors.push(`${key} must be a number`);
              continue;
            }
            result[key] = numValue;
            break;
            
          case 'email':
            if (!this.validateEmail(value)) {
              errors.push(`${key} must be a valid email address`);
              continue;
            }
            result[key] = value.toLowerCase().trim();
            break;
            
          case 'phone':
            if (!this.validatePhoneNumber(value)) {
              errors.push(`${key} must be a valid phone number`);
              continue;
            }
            result[key] = value;
            break;
            
          case 'vrn':
            if (!this.validateVehicleRegistration(value)) {
              errors.push(`${key} must be a valid vehicle registration number`);
              continue;
            }
            result[key] = value.toUpperCase();
            break;
            
          case 'date':
            if (!this.validateDateString(value)) {
              errors.push(`${key} must be a valid date`);
              continue;
            }
            result[key] = new Date(value).toISOString();
            break;
            
          default:
            result[key] = value;
        }
      } else {
        result[key] = value;
      }
      
      // Custom validation
      if (rules.validate && typeof rules.validate === 'function') {
        const customValidation = rules.validate(result[key]);
        if (customValidation !== true) {
          errors.push(customValidation || `${key} is invalid`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      data: result,
      errors
    };
  }
}

module.exports = ValidationHelper;