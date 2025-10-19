const moment = require('moment');

class DateHelper {
  // Format date to ISO string
  static toISOString(date) {
    if (!date) return null;
    return new Date(date).toISOString();
  }

  // Format date for display
  static formatForDisplay(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!date) return '';
    return moment(date).format(format);
  }

  // Add duration to date
  static addDuration(date, amount, unit = 'months') {
    return moment(date).add(amount, unit).toDate();
  }

  // Calculate days between dates
  static daysBetween(startDate, endDate) {
    return moment(endDate).diff(moment(startDate), 'days');
  }

  // Check if date is in the past
  static isPastDate(date) {
    return moment(date).isBefore(moment());
  }

  // Check if date is in the future
  static isFutureDate(date) {
    return moment(date).isAfter(moment());
  }

  // Get start of day
  static startOfDay(date) {
    return moment(date).startOf('day').toDate();
  }

  // Get end of day
  static endOfDay(date) {
    return moment(date).endOf('day').toDate();
  }

  // Calculate policy expiry date
  static calculatePolicyExpiry(startDate, durationMonths) {
    return this.addDuration(startDate, durationMonths, 'months');
  }

  // Check if policy is expired
  static isPolicyExpired(expiryDate) {
    return this.isPastDate(expiryDate);
  }

  // Get age from birth date
  static calculateAge(birthDate) {
    return moment().diff(moment(birthDate), 'years');
  }

  // Format date for Zimnat API
  static formatForZimnat(date) {
    return moment(date).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  // Parse Zimnat date format
  static parseZimnatDate(dateString) {
    return moment(dateString).toDate();
  }

  // Get current timestamp for logging
  static getCurrentTimestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  // Validate date range
  static isValidDateRange(startDate, endDate) {
    return moment(startDate).isBefore(moment(endDate));
  }

  // Get financial year dates (April to March)
  static getFinancialYear(date = new Date()) {
    const year = moment(date).year();
    const month = moment(date).month();
    
    let startYear = year;
    if (month < 3) { // Before April (month 3)
      startYear = year - 1;
    }
    
    return {
      start: moment(`${startYear}-04-01`).toDate(),
      end: moment(`${startYear + 1}-03-31`).endOf('day').toDate()
    };
  }
}

module.exports = DateHelper;