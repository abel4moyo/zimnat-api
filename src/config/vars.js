const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'FCB',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'S@turday123',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    }
  },
  api: {
    port: process.env.PORT || 3000,
    version: '1.0.0',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
  },
  auth: {
    apiSecret: process.env.API_SECRET_KEY || 'development-secret',
    partners: {
      FCB: process.env.FCB_API_KEY || 'demo-api-key'
    }
  }
};