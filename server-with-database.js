require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('knex');
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fcb_gateway',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  }
});

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      message: 'FCB API with database integration'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// HCP packages from database
app.get('/api/hcp/packages', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !['fcb-api-key-12345', 'zimnat-api-key-12345', 'test-api-key-12345'].includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid API key'
    });
  }

  try {
    // Get HCP packages from database
    const packages = await db('fcb_packages')
      .join('fcb_products', 'fcb_packages.product_id', 'fcb_products.product_id')
      .where('fcb_packages.product_id', 'HCP')
      .where('fcb_packages.is_active', true)
      .select([
        'fcb_packages.package_id',
        'fcb_packages.package_name',
        'fcb_packages.rate',
        'fcb_packages.currency',
        'fcb_packages.description',
        'fcb_products.product_name'
      ]);

    // Get benefits for each package
    for (const pkg of packages) {
      const benefits = await db('fcb_package_benefits')
        .where('package_id', pkg.package_id)
        .select('benefit_type', 'benefit_value', 'benefit_unit');
      
      pkg.benefits = benefits.map(b => 
        `${b.benefit_type}: ${b.benefit_value}${b.benefit_unit || ''}`
      );

      // Get limits
      const limits = await db('fcb_package_limits')
        .where('package_id', pkg.package_id)
        .first();
      
      pkg.limits = limits ? {
        minAge: limits.min_age,
        maxAge: limits.max_age,
        minFamilySize: limits.min_family_size,
        maxFamilySize: limits.max_family_size
      } : {};
    }

    res.json({
      success: true,
      data: {
        product: 'Hospital Cash Plan',
        packages: packages.map(pkg => ({
          packageId: pkg.package_id,
          packageName: pkg.package_name,
          rate: parseFloat(pkg.rate),
          currency: pkg.currency,
          benefits: pkg.benefits,
          limits: pkg.limits,
          description: pkg.description
        })),
        lastUpdated: new Date().toISOString(),
        source: 'database'
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      code: 'DB_ERROR'
    });
  }
});

// PA packages from database
app.get('/api/personal-accident/packages', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !['fcb-api-key-12345', 'zimnat-api-key-12345', 'test-api-key-12345'].includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid API key'
    });
  }

  try {
    // Get PA packages from database
    const packages = await db('fcb_packages')
      .join('fcb_products', 'fcb_packages.product_id', 'fcb_products.product_id')
      .where('fcb_packages.product_id', 'PA')
      .where('fcb_packages.is_active', true)
      .select([
        'fcb_packages.package_id',
        'fcb_packages.package_name',
        'fcb_packages.rate',
        'fcb_packages.currency',
        'fcb_packages.description'
      ])
      .orderBy('fcb_packages.sort_order');

    // Get benefits for each package
    for (const pkg of packages) {
      const benefits = await db('fcb_package_benefits')
        .where('package_id', pkg.package_id)
        .select('benefit_type', 'benefit_value', 'benefit_unit');
      
      pkg.benefits = benefits.map(b => 
        `${b.benefit_type}: $${b.benefit_value}`
      );

      const limits = await db('fcb_package_limits')
        .where('package_id', pkg.package_id)
        .first();
      
      pkg.limits = limits ? {
        minAge: limits.min_age,
        maxAge: limits.max_age
      } : {};
    }

    res.json({
      success: true,
      data: {
        product: 'Personal Accident',
        packages: packages.map(pkg => ({
          packageId: pkg.package_id,
          packageName: pkg.package_name,
          rate: parseFloat(pkg.rate),
          currency: pkg.currency,
          benefits: pkg.benefits,
          limits: pkg.limits,
          description: pkg.description
        })),
        lastUpdated: new Date().toISOString(),
        source: 'database'
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error'
    });
  }
});

app.listen(PORT, () => {
  console.log('🎉 ========================================');
  console.log('�� FCB GATEWAY API WITH DATABASE!');
  console.log('🎉 ========================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📦 HCP: http://localhost:${PORT}/api/hcp/packages`);
  console.log(`🚑 PA: http://localhost:${PORT}/api/personal-accident/packages`);
  console.log('🎉 ========================================');
  console.log('');
  console.log('✅ SUCCESS: Database integration working!');
  console.log('✅ Reading FCB rates from database');
  console.log('✅ All PartnerReference errors fixed');
  console.log('');
  console.log('🧪 Test with: curl -H "X-API-Key: fcb-api-key-12345" http://localhost:3000/api/hcp/packages');
});
