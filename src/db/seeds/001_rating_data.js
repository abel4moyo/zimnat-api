// ===================================================================
// FIXED SEED FILE - Correct Table Names
// File: src/db/seeds/001_rating_data.js
// ===================================================================

exports.seed = async function(knex) {
  try {
    console.log('🌱 Starting FCB rating data seed...');

    // Clear existing entries in correct order (respecting foreign keys)
    console.log('🗑️ Clearing existing data...');
    
    // Check if tables exist before trying to delete
    const tableExists = async (tableName) => {
      return await knex.schema.hasTable(tableName);
    };

    // Clear in dependency order
    if (await tableExists('fcb_payment_transactions')) {
      await knex('fcb_payment_transactions').del();
    }
    
    if (await tableExists('fcb_policies')) {
      await knex('fcb_policies').del();
    }
    
    if (await tableExists('fcb_quotes')) {
      await knex('fcb_quotes').del();
    }
    
    if (await tableExists('fcb_rating_factors')) {
      await knex('fcb_rating_factors').del();
    }
    
    if (await tableExists('fcb_package_limits')) {
      await knex('fcb_package_limits').del();
    }
    
    if (await tableExists('fcb_package_benefits')) {
      await knex('fcb_package_benefits').del();
    }
    
    if (await tableExists('fcb_packages')) {
      await knex('fcb_packages').del();
    }
    
    if (await tableExists('fcb_products')) {
      await knex('fcb_products').del();
    }
    
    if (await tableExists('fcb_partners')) {
      await knex('fcb_partners').del();
    }

    console.log('✅ Existing data cleared');

    // Insert rating products based on Excel data
    console.log('📦 Inserting products...');
    await knex('fcb_products').insert([
      {
        product_id: 'PA',
        product_name: 'Personal Accident',
        product_category: 'PERSONAL_ACCIDENT',
        rating_type: 'FLAT_RATE',
        description: 'Financial compensation in the event of injury, disability, or death caused directly by accidental means',
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
        product_id: 'HCP',
        product_name: 'Health Care Plus',
        product_category: 'HEALTH',
        rating_type: 'FLAT_RATE',
        description: 'Hospital cash plan coverage',
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

    console.log('✅ Products inserted');

    // Insert rating packages for PA (Personal Accident)
    console.log('📋 Inserting PA packages...');
    await knex('fcb_packages').insert([
      {
        package_id: 'PA_STANDARD',
        product_id: 'PA',
        package_name: 'Standard Personal Accident',
        rate: 1.0000,
        currency: 'USD',
        minimum_premium: null,
        description: 'Basic personal accident coverage',
        sort_order: 1,
        is_active: true
      },
      {
        package_id: 'PA_PRESTIGE',
        product_id: 'PA',
        package_name: 'Prestige Personal Accident',
        rate: 2.5000,
        currency: 'USD',
        minimum_premium: null,
        description: 'Enhanced personal accident coverage',
        sort_order: 2,
        is_active: true
      },
      {
        package_id: 'PA_PREMIER',
        product_id: 'PA',
        package_name: 'Premier Personal Accident',
        rate: 5.0000,
        currency: 'USD',
        minimum_premium: null,
        description: 'Premium personal accident coverage',
        sort_order: 3,
        is_active: true
      }
    ]);

    console.log('✅ PA packages inserted');

    // Insert rating packages for Domestic
    console.log('🏠 Inserting Domestic packages...');
    await knex('fcb_packages').insert([
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

    console.log('✅ Domestic packages inserted');

    // Insert rating packages for HCP
    console.log('🏥 Inserting HCP packages...');
    await knex('fcb_packages').insert([
      {
        package_id: 'HCP_INDIVIDUAL',
        product_id: 'HCP',
        package_name: 'Individual Hospital Cash Plan',
        rate: 2.0000,
        currency: 'USD',
        minimum_premium: null,
        description: 'Hospital cash plan for individual coverage',
        sort_order: 1,
        is_active: true
      },
      {
        package_id: 'HCP_FAMILY',
        product_id: 'HCP',
        package_name: 'Family Hospital Cash Plan',
        rate: 5.0000,
        currency: 'USD',
        minimum_premium: null,
        description: 'Hospital cash plan for family coverage (up to 4 children)',
        sort_order: 2,
        is_active: true
      }
    ]);

    console.log('✅ HCP packages inserted');

    // Insert package benefits for PA
    console.log('💰 Inserting PA benefits...');
    await knex('fcb_package_benefits').insert([
      {
        package_id: 'PA_STANDARD',
        benefit_type: 'Accidental Death',
        benefit_value: '1000',
        benefit_unit: 'USD',
        benefit_description: 'Accidental death benefit'
      },
      {
        package_id: 'PA_STANDARD',
        benefit_type: 'Permanent Total Disablement',
        benefit_value: '1000',
        benefit_unit: 'USD',
        benefit_description: 'Permanent total disablement benefit'
      },
      {
        package_id: 'PA_PRESTIGE',
        benefit_type: 'Accidental Death',
        benefit_value: '2500',
        benefit_unit: 'USD',
        benefit_description: 'Accidental death benefit'
      },
      {
        package_id: 'PA_PRESTIGE',
        benefit_type: 'Permanent Total Disablement',
        benefit_value: '2500',
        benefit_unit: 'USD',
        benefit_description: 'Permanent total disablement benefit'
      },
      {
        package_id: 'PA_PREMIER',
        benefit_type: 'Accidental Death',
        benefit_value: '10000',
        benefit_unit: 'USD',
        benefit_description: 'Accidental death benefit'
      },
      {
        package_id: 'PA_PREMIER',
        benefit_type: 'Permanent Total Disablement',
        benefit_value: '10000',
        benefit_unit: 'USD',
        benefit_description: 'Permanent total disablement benefit'
      }
    ]);

    console.log('✅ PA benefits inserted');

    // Insert package benefits for HCP
    console.log('🏥 Inserting HCP benefits...');
    await knex('fcb_package_benefits').insert([
      {
        package_id: 'HCP_INDIVIDUAL',
        benefit_type: 'Daily Cash Benefit',
        benefit_value: '50',
        benefit_unit: 'USD/day',
        benefit_description: 'Daily cash benefit for hospital stays'
      },
      {
        package_id: 'HCP_INDIVIDUAL',
        benefit_type: 'Maximum Days',
        benefit_value: '30',
        benefit_unit: 'days',
        benefit_description: 'Maximum benefit period'
      },
      {
        package_id: 'HCP_FAMILY',
        benefit_type: 'Daily Cash Benefit',
        benefit_value: '50',
        benefit_unit: 'USD/day per person',
        benefit_description: 'Daily cash benefit for hospital stays per family member'
      },
      {
        package_id: 'HCP_FAMILY',
        benefit_type: 'Maximum Days',
        benefit_value: '30',
        benefit_unit: 'days per person',
        benefit_description: 'Maximum benefit period per family member'
      },
      {
        package_id: 'HCP_FAMILY',
        benefit_type: 'Family Members',
        benefit_value: '6',
        benefit_unit: 'max members',
        benefit_description: 'Maximum family members covered'
      }
    ]);

    console.log('✅ HCP benefits inserted');

    // Insert package limits
    console.log('📏 Inserting package limits...');
    await knex('fcb_package_limits').insert([
      // HCP Limits
      {
        package_id: 'HCP_INDIVIDUAL',
        min_age: 18,
        max_age: 65,
        min_family_size: 1,
        max_family_size: 1
      },
      {
        package_id: 'HCP_FAMILY',
        min_age: 18,
        max_age: 65,
        min_family_size: 2,
        max_family_size: 6
      },
      // PA Limits
      {
        package_id: 'PA_STANDARD',
        min_age: 18,
        max_age: 70
      },
      {
        package_id: 'PA_PRESTIGE',
        min_age: 18,
        max_age: 70
      },
      {
        package_id: 'PA_PREMIER',
        min_age: 18,
        max_age: 70
      },
      // Domestic Limits
      {
        package_id: 'DOMESTIC_STANDARD',
        min_sum_insured: 1000,
        max_sum_insured: 100000
      },
      {
        package_id: 'DOMESTIC_ENHANCED',
        min_sum_insured: 1000,
        max_sum_insured: 200000
      },
      {
        package_id: 'DOMESTIC_COMPREHENSIVE',
        min_sum_insured: 1000,
        max_sum_insured: 500000
      }
    ]);

    console.log('✅ Package limits inserted');

    // Insert rating factors
    console.log('⚖️ Inserting rating factors...');
    await knex('fcb_rating_factors').insert([
      // Age-based factors for Personal Accident
      {
        product_id: 'PA',
        factor_type: 'AGE_BAND',
        factor_key: '18-30',
        factor_multiplier: 1.0,
        factor_description: 'Standard rate for ages 18-30',
        is_active: true
      },
      {
        product_id: 'PA',
        factor_type: 'AGE_BAND',
        factor_key: '31-45',
        factor_multiplier: 1.2,
        factor_description: '20% increase for ages 31-45',
        is_active: true
      },
      {
        product_id: 'PA',
        factor_type: 'AGE_BAND',
        factor_key: '46-60',
        factor_multiplier: 1.5,
        factor_description: '50% increase for ages 46-60',
        is_active: true
      },
      {
        product_id: 'PA',
        factor_type: 'AGE_BAND',
        factor_key: '61-70',
        factor_multiplier: 2.0,
        factor_description: '100% increase for ages 61-70',
        is_active: true
      },
      // Family size factors for HCP
      {
        product_id: 'HCP',
        factor_type: 'FAMILY_SIZE',
        factor_key: 'EXTRA_MEMBER',
        factor_addition: 1.0,
        factor_description: '$1 per additional family member above 2',
        is_active: true
      },
      // Cover type factors for Domestic
      {
        product_id: 'DOMESTIC',
        factor_type: 'COVER_TYPE',
        factor_key: 'HOMEOWNERS',
        factor_multiplier: 1.0,
        factor_description: 'Standard rate for homeowners',
        is_active: true
      },
      {
        product_id: 'DOMESTIC',
        factor_type: 'COVER_TYPE',
        factor_key: 'HOUSEHOLDERS',
        factor_multiplier: 0.8,
        factor_description: '20% discount for contents only',
        is_active: true
      }
    ]);

    console.log('✅ Rating factors inserted');

    // Insert partner data
    console.log('🤝 Inserting partners...');
    await knex('fcb_partners').insert([
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

    console.log('✅ Partners inserted');
    console.log('🎉 FCB rating data seeded successfully!');
    
    // Summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log('==================');
    console.log('✅ 5 Products inserted');
    console.log('✅ 8 Packages inserted (3 PA + 2 HCP + 3 Domestic)');
    console.log('✅ Package benefits inserted');
    console.log('✅ Package limits inserted');
    console.log('✅ Rating factors inserted');
    console.log('✅ 3 Partners inserted');
    console.log('\n🚀 Database is ready for use!');

  } catch (error) {
    console.error('❌ Error seeding rating data:', error);
    throw error;
  }
};

// ===================================================================
// QUICK COMMANDS TO RUN THIS SEED
// ===================================================================

/*
1. Replace your current seed file:
   cp this_file.js src/db/seeds/001_rating_data.js

2. Run the seed:
   npx knex seed:run --specific=001_rating_data.js

3. Verify data was inserted:
   psql -d fcb_gateway -c "SELECT COUNT(*) FROM fcb_products;"
   psql -d fcb_gateway -c "SELECT COUNT(*) FROM fcb_packages;"
   psql -d fcb_gateway -c "SELECT package_id, package_name, rate FROM fcb_packages;"

4. Test your API endpoints:
   curl -H "X-API-Key: fcb-api-key-12345" http://localhost:3000/api/hcp/packages
*/