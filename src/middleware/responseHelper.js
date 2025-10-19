const logger = require('./logger');

class ResponseHelper {
  static successResponse(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  static errorResponse(message, code = 'ERROR', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return response;
  }

  static paginatedResponse(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    };
  }

  static zimnatFormatResponse(data, result = 'SUCCESS', message = 'Operation completed successfully') {
    return {
      Result: result,
      Message: message,
      ...data,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ResponseHelper;