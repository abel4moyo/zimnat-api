// ===================================================================
// FIXED SEED FILE - Table Name Correction
// File: src/db/seeds/001_load_rating_tables.js
// ===================================================================

exports.seed = function(knex) {
  // Delete existing data from tables in correct order (respecting foreign keys)
  return knex('fcb_payment_transactions').del()
    .then(() => knex('fcb_policies').del())
    .then(() => knex('fcb_quotes').del())
    .then(() => knex('fcb_rating_factors').del())
    .then(() => knex('fcb_package_limits').del())
    .then(() => knex('fcb_package_benefits').del())
    .then(() => knex('fcb_packages').del())
    .then(() => knex('fcb_products').del())
    .then(() => knex('fcb_partners').del())
    .then(() => {
      // Insert products
      return knex('fcb_products').insert([
        {
          product_id: 'HCP',
          product_name: 'Hospital Cash Plan',
          product_category: 'HEALTH',
          rating_type: 'FLAT_RATE',
          description: 'Daily cash benefit for hospital stays',
          status: 'ACTIVE'
        },
        {
          product_id: 'PA',
          product_name: 'Personal Accident',
          product_category: 'ACCIDENT',
          rating_type: 'FLAT_RATE',
          description: 'Accidental death and disability cover',
          status: 'ACTIVE'
        },
        {
          product_id: 'DOMESTIC',
          product_name: 'Domestic Insurance',
          product_category: 'PROPERTY',
          rating_type: 'PERCENTAGE',
          description: 'Household contents and buildings insurance',
          status: 'ACTIVE'
        },
        {
          product_id: 'TRAVEL',
          product_name: 'Travel Insurance',
          product_category: 'TRAVEL',
          rating_type: 'FLAT_RATE',
          description: 'Travel and medical emergency cover',
          status: 'ACTIVE'
        },
        {
          product_id: 'MOTOR',
          product_name: 'Motor Insurance',
          product_category: 'MOTOR',
          rating_type: 'PERCENTAGE',
          description: 'Vehicle insurance coverage',
          status: 'ACTIVE'
        }
      ]);
    })
    .then(() => {
      // Insert packages
      return knex('fcb_packages').insert([
        // HCP Packages
        {
          package_id: 'HCP_INDIVIDUAL',
          product_id: 'HCP',
          package_name: 'Individual Hospital Cash Plan',
          rate: 2.00,
          currency: 'USD',
          description: 'Individual coverage for hospital cash benefits',
          sort_order: 1,
          is_active: true
        },
        {
          package_id: 'HCP_FAMILY',
          product_id: 'HCP',
          package_name: 'Family Hospital Cash Plan',
          rate: 5.00,
          currency: 'USD',
          description: 'Family coverage for hospital cash benefits',
          sort_order: 2,
          is_active: true
        },
        
        // Personal Accident Packages
        {
          package_id: 'PA_STANDARD',
          product_id: 'PA',
          package_name: 'Standard Personal Accident',
          rate: 1.00,
          currency: 'USD',
          description: 'Basic personal accident coverage',
          sort_order: 1,
          is_active: true
        },
        {
          package_id: 'PA_PRESTIGE',
          product_id: 'PA',
          package_name: 'Prestige Personal Accident',
          rate: 2.50,
          currency: 'USD',
          description: 'Enhanced personal accident coverage',
          sort_order: 2,
          is_active: true
        },
        {
          package_id: 'PA_PREMIER',
          product_id: 'PA',
          package_name: 'Premier Personal Accident',
          rate: 5.00,
          currency: 'USD',
          description: 'Premium personal accident coverage',
          sort_order: 3,
          is_active: true
        },
        
        // Domestic Insurance Packages
        {
          package_id: 'DOMESTIC_STANDARD',
          product_id: 'DOMESTIC',
          package_name: 'Standard Domestic Insurance',
          rate: 0.75, // 0.75% of sum insured
          currency: 'USD',
          minimum_premium: 25.00,
          description: 'Basic household contents and buildings cover',
          sort_order: 1,
          is_active: true
        },
        {
          package_id: 'DOMESTIC_ENHANCED',
          product_id: 'DOMESTIC',
          package_name: 'Enhanced Domestic Insurance',
          rate: 1.00, // 1.00% of sum insured
          currency: 'USD',
          minimum_premium: 35.00,
          description: 'Enhanced household coverage with additional benefits',
          sort_order: 2,
          is_active: true
        },
        {
          package_id: 'DOMESTIC_COMPREHENSIVE',
          product_id: 'DOMESTIC',
          package_name: 'Comprehensive Domestic Insurance',
          rate: 1.25, // 1.25% of sum insured
          currency: 'USD',
          minimum_premium: 50.00,
          description: 'Comprehensive household coverage with all risks',
          sort_order: 3,
          is_active: true
        }
      ]);
    })
    .then(() => {
      // Insert package benefits
      return knex('fcb_package_benefits').insert([
        // HCP Benefits
        { package_id: 'HCP_INDIVIDUAL', benefit_type: 'Daily Cash Benefit', benefit_value: '50', benefit_unit: 'USD/day' },
        { package_id: 'HCP_INDIVIDUAL', benefit_type: 'Maximum Days', benefit_value: '30', benefit_unit: 'days' },
        { package_id: 'HCP_FAMILY', benefit_type: 'Daily Cash Benefit', benefit_value: '50', benefit_unit: 'USD/day per person' },
        { package_id: 'HCP_FAMILY', benefit_type: 'Maximum Days', benefit_value: '30', benefit_unit: 'days per person' },
        { package_id: 'HCP_FAMILY', benefit_type: 'Family Members', benefit_value: '6', benefit_unit: 'max members' },
        
        // PA Benefits
        { package_id: 'PA_STANDARD', benefit_type: 'Accidental Death', benefit_value: '1000', benefit_unit: 'USD' },
        { package_id: 'PA_STANDARD', benefit_type: 'Permanent Total Disablement', benefit_value: '1000', benefit_unit: 'USD' },
        { package_id: 'PA_PRESTIGE', benefit_type: 'Accidental Death', benefit_value: '2500', benefit_unit: 'USD' },
        { package_id: 'PA_PRESTIGE', benefit_type: 'Permanent Total Disablement', benefit_value: '2500', benefit_unit: 'USD' },
        { package_id: 'PA_PREMIER', benefit_type: 'Accidental Death', benefit_value: '10000', benefit_unit: 'USD' },
        { package_id: 'PA_PREMIER', benefit_type: 'Permanent Total Disablement', benefit_value: '10000', benefit_unit: 'USD' },
        
        // Domestic Benefits
        { package_id: 'DOMESTIC_STANDARD', benefit_type: 'Contents Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_STANDARD', benefit_type: 'Buildings Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_ENHANCED', benefit_type: 'Contents Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_ENHANCED', benefit_type: 'Buildings Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_ENHANCED', benefit_type: 'Alternative Accommodation', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_COMPREHENSIVE', benefit_type: 'Contents Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_COMPREHENSIVE', benefit_type: 'Buildings Cover', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_COMPREHENSIVE', benefit_type: 'Alternative Accommodation', benefit_value: 'Yes', benefit_unit: '' },
        { package_id: 'DOMESTIC_COMPREHENSIVE', benefit_type: 'All Risks Extension', benefit_value: 'Yes', benefit_unit: '' }
      ]);
    })
    .then(() => {
      // Insert package limits
      return knex('fcb_package_limits').insert([
        // HCP Limits
        { package_id: 'HCP_INDIVIDUAL', min_age: 18, max_age: 65, min_family_size: 1, max_family_size: 1 },
        { package_id: 'HCP_FAMILY', min_age: 18, max_age: 65, min_family_size: 2, max_family_size: 6 },
        
        // PA Limits
        { package_id: 'PA_STANDARD', min_age: 18, max_age: 70 },
        { package_id: 'PA_PRESTIGE', min_age: 18, max_age: 70 },
        { package_id: 'PA_PREMIER', min_age: 18, max_age: 70 },
        
        // Domestic Limits
        { package_id: 'DOMESTIC_STANDARD', min_sum_insured: 1000, max_sum_insured: 100000 },
        { package_id: 'DOMESTIC_ENHANCED', min_sum_insured: 1000, max_sum_insured: 200000 },
        { package_id: 'DOMESTIC_COMPREHENSIVE', min_sum_insured: 1000, max_sum_insured: 500000 }
      ]);
    })
    .then(() => {
      // Insert rating factors
      return knex('fcb_rating_factors').insert([
        // Age-based factors for Personal Accident
        { product_id: 'PA', factor_type: 'AGE_BAND', factor_key: '18-30', factor_multiplier: 1.0, factor_description: 'Standard rate for ages 18-30' },
        { product_id: 'PA', factor_type: 'AGE_BAND', factor_key: '31-45', factor_multiplier: 1.2, factor_description: '20% increase for ages 31-45' },
        { product_id: 'PA', factor_type: 'AGE_BAND', factor_key: '46-60', factor_multiplier: 1.5, factor_description: '50% increase for ages 46-60' },
        { product_id: 'PA', factor_type: 'AGE_BAND', factor_key: '61-70', factor_multiplier: 2.0, factor_description: '100% increase for ages 61-70' },
        
        // Family size factors for HCP
        { product_id: 'HCP', factor_type: 'FAMILY_SIZE', factor_key: 'EXTRA_MEMBER', factor_addition: 1.0, factor_description: '$1 per additional family member above 2' },
        
        // Cover type factors for Domestic
        { product_id: 'DOMESTIC', factor_type: 'COVER_TYPE', factor_key: 'HOMEOWNERS', factor_multiplier: 1.0, factor_description: 'Standard rate for homeowners' },
        { product_id: 'DOMESTIC', factor_type: 'COVER_TYPE', factor_key: 'HOUSEHOLDERS', factor_multiplier: 0.8, factor_description: '20% discount for contents only' }
      ]);
    })
    .then(() => {
      // Insert partner data
      return knex('fcb_partners').insert([
        {
          partner_code: 'FCB',
          partner_name: 'First Capital Bank',
          api_key: 'fcb-api-key-12345',
          allowed_products: JSON.stringify(['HCP', 'PA', 'DOMESTIC', 'TRAVEL']),
          commission_rate: 0.15,
          is_active: true,
          settings: JSON.stringify({
            autoApproveLimit: 1000,
            requiresManualApproval: false,
            allowedCurrencies: ['USD', 'ZWL']
          })
        },
        {
          partner_code: 'ZIMNAT',
          partner_name: 'Zimnat Insurance',
          api_key: 'zimnat-api-key-12345',
          allowed_products: JSON.stringify(['HCP', 'PA', 'DOMESTIC', 'MOTOR']),
          commission_rate: 0.20,
          is_active: true,
          settings: JSON.stringify({
            autoApproveLimit: 2000,
            requiresManualApproval: false,
            allowedCurrencies: ['USD', 'ZWL']
          })
        },
        {
          partner_code: 'TEST',
          partner_name: 'Test Partner',
          api_key: 'test-api-key-12345',
          allowed_products: JSON.stringify(['HCP', 'PA']),
          commission_rate: 0.10,
          is_active: true,
          settings: JSON.stringify({
            autoApproveLimit: 500,
            requiresManualApproval: true,
            allowedCurrencies: ['USD']
          })
        }
      ]);
    });
};

// ===================================================================
// ALTERNATIVE: SIMPLE SEED THAT SKIPS MISSING TABLES
// File: src/db/seeds/002_simple_fcb_data.js (create this as backup)
// ===================================================================

// If the above still has issues, create this simpler version:
/*
exports.seed = function(knex) {
  // Only seed tables that definitely exist
  return Promise.resolve()
    .then(() => {
      // Check if tables exist first, then seed
      return knex.schema.hasTable('fcb_products').then(exists => {
        if (exists) {
          return knex('fcb_products').del().then(() => {
            return knex('fcb_products').insert([
              {
                product_id: 'HCP',
                product_name: 'Hospital Cash Plan',
                product_category: 'HEALTH',
                rating_type: 'FLAT_RATE',
                description: 'Daily cash benefit for hospital stays',
                status: 'ACTIVE'
              },
              {
                product_id: 'PA',
                product_name: 'Personal Accident',
                product_category: 'ACCIDENT',
                rating_type: 'FLAT_RATE',
                description: 'Accidental death and disability cover',
                status: 'ACTIVE'
              }
            ]);
          });
        }
      });
    })
    .then(() => {
      return knex.schema.hasTable('fcb_packages').then(exists => {
        if (exists) {
          return knex('fcb_packages').del().then(() => {
            return knex('fcb_packages').insert([
              {
                package_id: 'HCP_INDIVIDUAL',
                product_id: 'HCP',
                package_name: 'Individual Hospital Cash Plan',
                rate: 2.00,
                currency: 'USD',
                description: 'Individual coverage for hospital cash benefits',
                sort_order: 1,
                is_active: true
              },
              {
                package_id: 'HCP_FAMILY',
                product_id: 'HCP',
                package_name: 'Family Hospital Cash Plan',
                rate: 5.00,
                currency: 'USD',
                description: 'Family coverage for hospital cash benefits',
                sort_order: 2,
                is_active: true
              }
            ]);
          });
        }
      });
    });
};
*/

// ===================================================================
// QUICK TROUBLESHOOTING COMMANDS
// ===================================================================

/*
If you're still having issues, try these commands:

1. CHECK WHAT TABLES ACTUALLY EXIST:
   psql -d fcb_gateway -c "\dt"

2. CHECK FCB TABLES SPECIFICALLY:
   psql -d fcb_gateway -c "\dt fcb_*"

3. ROLLBACK AND RECREATE:
   npx knex migrate:rollback
   npx knex migrate:latest

4. MANUAL TABLE CHECK:
   psql -d fcb_gateway -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

5. SKIP SEEDS FOR NOW, JUST TEST API:
   # Don't run seeds, just test if the API works
   node server-simple.js

6. RUN SPECIFIC SEED:
   npx knex seed:run --specific=001_load_rating_tables.js
*/