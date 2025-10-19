// src/routes/swaggerRoutes.js
const express = require('express');
const router = express.Router();
const { specs, swaggerUi } = require('../config/swagger');

// Swagger UI route
router.use('/api/swagger', swaggerUi.serve);
router.get('/api/swagger', swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { 
      background: #1a2332; 
      border-radius: 8px; 
      padding: 10px;
      margin: 10px 0;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #3498db;
      background: rgba(52, 152, 219, 0.1);
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #27ae60;
      background: rgba(39, 174, 96, 0.1);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #e74c3c;
      background: rgba(231, 76, 60, 0.1);
    }
    .swagger-ui .wrapper {
      max-width: 1200px;
    }
    .swagger-ui .info .title {
      color: #3498db;
    }
  `,
  customSiteTitle: "Enterprise API Documentation",
  customfavIcon: "/favicon.ico",
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2
  }
}));

// JSON endpoint for the OpenAPI spec
router.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

module.exports = router;