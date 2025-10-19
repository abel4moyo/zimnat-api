// ===================================================================
// server.js - Main Entry Point
// ===================================================================
/*require('dotenv').config();
const app = require('./src/app');
const { initializeDatabase } = require('./src/db');
const logger = require('./src/utils/logger');
const { PORT, NODE_ENV } = require('./src/config/environment');

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      logger.info('FCB-Zimnat API Server Started', { 
        port: PORT, 
        env: NODE_ENV 
      });
      
      console.log('🏦 ====================================================');
      console.log('🏦 FCB-ZIMNAT INTEGRATION API STARTED!');
      console.log('🏦 ====================================================');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🎯 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log('🏦 ====================================================');
      console.log('');
      console.log('✅ INTEGRATED FEATURES:');
      console.log(' 🏢 Multi-partner support (FCB, Zimnat)');
      console.log(' 🚗 Zimnat IceCash API (Vehicle Insurance & Licensing)');
      console.log(' 🧮 Dynamic Premium Rating Engine');
      console.log(' 📋 Claims Processing');
      console.log(' 🔐 JWT Authentication + API Keys');
      console.log(' 📊 Real-time Dashboard');
      console.log(' 🛡️ IP Filtering & Rate Limiting');
      console.log(' 📈 Prometheus Metrics');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  process.exit(0);
}. */



//const app = require('./app');
//const { specs } = require('./src/config/swagger');

//const PORT = process.env.PORT || 3000;
//const NODE_ENV = process.env.NODE_ENV || 'development';

/*

require('dotenv').config();
const app = require('./src/app');
const { initializeDatabase } = require('./src/db');
const logger = require('./src/utils/logger');
const { PORT, NODE_ENV } = require('./src/config/environment');

// Graceful shutdown handling
const server = app.listen(PORT, () => {
  console.log('\n🚀 FCB Multi-Partner Integration API');
  console.log('=====================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/docs`);
  console.log(`📖 ReDoc: http://localhost:${PORT}/redoc`);
  console.log(`🏠 Portal: http://localhost:${PORT}/api-portal`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📋 OpenAPI: http://localhost:${PORT}/api-docs.json`);
  console.log(`🚀 Postman: http://localhost:${PORT}/postman-collection.json`);
  console.log(`📊 Metrics: http://localhost:${PORT}/api/v1/metrics`);
  console.log(`\n🏷️  API Version: ${specs.info.version}`);
  console.log(`📝 Total Endpoints: ${Object.keys(specs.paths).length}`);
  console.log(`🏷️  Categories: ${specs.tags.length}`);
  console.log('\n✅ Server is ready for requests!');
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📝 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📝 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});   */




// server.js - Fixed server startup file

/*
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handling
const server = app.listen(PORT, () => {
  console.log('\n🚀 FCB Multi-Partner Integration API');
  console.log('=====================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  
  // Check if documentation is available
  try {
    // Try to get package info safely
    let packageInfo;
    try {
      packageInfo = require('./package.json');
    } catch (error) {
      packageInfo = { version: '3.0.0' };
    }

    console.log(`\n🏷️  API Version: ${packageInfo.version}`);
    
    // Check if swagger dependencies are available
    let swaggerAvailable = false;
    try {
      require('swagger-ui-express');
      require('swagger-jsdoc');
      swaggerAvailable = true;
    } catch (error) {
      // Swagger dependencies not available
    }

    if (swaggerAvailable) {
      console.log('\n📚 Documentation Available:');
      console.log(`🏠 Portal: http://localhost:${PORT}/api-portal`);
      console.log(`📖 Interactive: http://localhost:${PORT}/docs`);
      console.log(`📋 ReDoc: http://localhost:${PORT}/redoc`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`📋 OpenAPI: http://localhost:${PORT}/api-docs.json`);
      console.log(`🚀 Postman: http://localhost:${PORT}/postman-collection.json`);
      console.log(`📊 Metrics: http://localhost:${PORT}/api/v1/metrics`);
    } else {
      console.log('\n⚠️  Documentation not available');
      console.log('💡 To enable: npm install swagger-ui-express swagger-jsdoc js-yaml');
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    }

    console.log('\n✅ Server is ready for requests!');
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ Error during server startup:', error.message);
    console.log(`✅ Server started on port ${PORT} (with errors)`);
    console.log('=====================================\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📝 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📝 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  console.log('🔄 Attempting graceful shutdown...');
  
  server.close(() => {
    console.log('✅ Server closed due to uncaught exception');
    process.exit(1);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️  Forcing exit due to timeout');
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Attempting graceful shutdown...');
  
  server.close(() => {
    console.log('✅ Server closed due to unhandled rejection');
    process.exit(1);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️  Forcing exit due to timeout');
    process.exit(1);
  }, 5000);
});

// Export server for testing purposes
module.exports = server;
*/


/*

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up FCB Gateway API...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file from .env.example...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ .env file created. Please update with your actual configuration.\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully.\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Setup database
console.log('🗄️ Setting up database...');
try {
  execSync('npm run db:setup', { stdio: 'inherit' });
  console.log('✅ Database setup completed successfully.\n');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('⚠️ Please ensure PostgreSQL is running and configuration is correct in .env');
}

console.log('🎉 FCB Gateway API setup completed!');
console.log('\n📋 Next steps:');
console.log('1. Update .env file with your actual configuration');
console.log('2. Start the development server: npm run dev');
console.log('3. Access the API at: http://localhost:3000');
console.log('4. View API docs at: http://localhost:3000/api-docs');
console.log('\n🔧 Available commands:');
console.log('- npm run dev      : Start development server');
console.log('- npm run migrate  : Run database migrations');
console.log('- npm run seed     : Seed database with sample data');
console.log('- npm test         : Run tests');
console.log('- npm run lint     : Check code quality');  */



// src/server.js - Simple server startup file
require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, () => {
  console.log(`\n🌟 Server running on port ${PORT}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/docs`);
  console.log(`💡 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login Endpoint: http://localhost:${PORT}/api/v1/auth/login`);
  console.log('\n✅ Ready to accept requests!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});