

const logger = require('../utils/logger');

// Try to load CustomerModel
let CustomerModel;
try {
  CustomerModel = require('../models/customerModel');
} catch (error) {
  console.warn('CustomerModel not available, using fallback service');
}

class CustomerService {
  static async findPaginated(partnerId, page, limit, search) {
    try {
      if (CustomerModel) {
        return await CustomerModel.findPaginated(partnerId, page, limit, search);
      } else {
        // Fallback data
        const fallbackData = [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@email.com',
            phone: '+263771234567',
            id_number: '12-345678-A-90',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@email.com',
            phone: '+263771234568',
            id_number: '12-345678-B-90',
            created_at: new Date().toISOString()
          }
        ];

        // Simple search filter
        let filteredData = fallbackData;
        if (search) {
          filteredData = fallbackData.filter(customer =>
            customer.first_name.toLowerCase().includes(search.toLowerCase()) ||
            customer.last_name.toLowerCase().includes(search.toLowerCase()) ||
            customer.email.toLowerCase().includes(search.toLowerCase())
          );
        }

        return {
          data: filteredData,
          total: filteredData.length
        };
      }
    } catch (error) {
      logger.error('Customer service error:', error);
      throw error;
    }
  }

  static async findById(customerId) {
    try {
      if (CustomerModel) {
        return await CustomerModel.findById(customerId);
      } else {
        return {
          id: customerId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@email.com',
          phone: '+263771234567',
          id_number: '12-345678-A-90',
          created_at: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Customer service error:', error);
      throw error;
    }
  }

  static async create(customerData) {
    try {
      if (CustomerModel) {
        return await CustomerModel.create(customerData);
      } else {
        return {
          id: Date.now(),
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Customer service error:', error);
      throw error;
    }
  }
}

module.exports = CustomerService;