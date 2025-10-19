// ===================================================================
// ULTRA-SIMPLE MIGRATION FILE (NO INDEX ISSUES)
// File: src/db/migrations/001_create_fcb_rating_tables.js
// ===================================================================

exports.up = function(knex) {
  return knex.schema
    // Products table
    .createTable('fcb_products', table => {
      table.string('product_id', 50).primary();
      table.string('product_name', 255).notNullable();
      table.string('product_category', 100).notNullable();
      table.enum('rating_type', ['FLAT_RATE', 'PERCENTAGE', 'TIERED']).defaultTo('FLAT_RATE');
      table.text('description');
      table.enum('status', ['ACTIVE', 'INACTIVE', 'DISCONTINUED']).defaultTo('ACTIVE');
      table.timestamps(true, true);
    })
    
    // Packages table
    .createTable('fcb_packages', table => {
      table.increments('id').primary();
      table.string('package_id', 100).unique().notNullable();
      table.string('product_id', 50).notNullable();
      table.string('package_name', 255).notNullable();
      table.decimal('rate', 10, 4).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.decimal('minimum_premium', 10, 2);
      table.decimal('maximum_premium', 10, 2);
      table.text('description');
      table.integer('sort_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Package benefits table
    .createTable('fcb_package_benefits', table => {
      table.increments('id').primary();
      table.string('package_id', 100).notNullable();
      table.string('benefit_type', 100).notNullable();
      table.string('benefit_value', 255).notNullable();
      table.string('benefit_unit', 50);
      table.text('benefit_description');
      table.timestamps(true, true);
    })
    
    // Package limits table
    .createTable('fcb_package_limits', table => {
      table.increments('id').primary();
      table.string('package_id', 100).notNullable();
      table.integer('min_age');
      table.integer('max_age');
      table.integer('min_family_size');
      table.integer('max_family_size');
      table.decimal('min_sum_insured', 15, 2);
      table.decimal('max_sum_insured', 15, 2);
      table.json('additional_limits');
      table.timestamps(true, true);
    })
    
    // Rating factors table
    .createTable('fcb_rating_factors', table => {
      table.increments('id').primary();
      table.string('product_id', 50).notNullable();
      table.enum('factor_type', ['AGE_BAND', 'FAMILY_SIZE', 'COVER_TYPE', 'OCCUPATION', 'LOCATION']).notNullable();
      table.string('factor_key', 100).notNullable();
      table.decimal('factor_multiplier', 5, 4);
      table.decimal('factor_addition', 10, 2);
      table.text('factor_description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Quotes table
    .createTable('fcb_quotes', table => {
      table.increments('quote_id').primary();
      table.string('quote_number', 50).unique().notNullable();
      table.string('product_id', 50).notNullable();
      table.string('package_id', 100).notNullable();
      table.json('customer_info').notNullable();
      table.json('risk_factors');
      table.integer('duration_months').defaultTo(12);
      table.decimal('base_premium', 10, 2).notNullable();
      table.decimal('monthly_premium', 10, 2).notNullable();
      table.decimal('total_premium', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.json('calculation_breakdown');
      table.json('rating_factors_applied');
      table.enum('status', ['ACTIVE', 'EXPIRED', 'ACCEPTED', 'REJECTED']).defaultTo('ACTIVE');
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
    })
    
    // Policies table
    .createTable('fcb_policies', table => {
      table.increments('policy_id').primary();
      table.string('policy_number', 50).unique().notNullable();
      table.integer('quote_id');
      table.string('product_id', 50).notNullable();
      table.string('package_id', 100).notNullable();
      table.json('customer_info').notNullable();
      table.decimal('premium_amount', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.date('effective_date').notNullable();
      table.date('expiry_date').notNullable();
      table.enum('status', ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED']).defaultTo('ACTIVE');
      table.string('payment_reference', 255);
      table.text('notes');
      table.timestamps(true, true);
    })
    
    // Payment transactions table
    .createTable('fcb_payment_transactions', table => {
      table.increments('id').primary();
      table.string('transaction_id', 100).unique().notNullable();
      table.integer('policy_id');
      table.integer('quote_id');
      table.enum('payment_method', ['ICECASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD']).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.enum('status', ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).defaultTo('PENDING');
      table.string('payment_reference', 255);
      table.string('external_reference', 255);
      table.json('payment_details');
      table.timestamp('processed_at');
      table.timestamps(true, true);
    })
    
    // Partners table (for API authentication)
    .createTable('fcb_partners', table => {
      table.increments('partner_id').primary();
      table.string('partner_code', 50).unique().notNullable();
      table.string('partner_name', 255).notNullable();
      table.string('api_key', 255).unique().notNullable();
      table.json('allowed_products');
      table.decimal('commission_rate', 5, 4).defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.json('settings');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('fcb_payment_transactions')
    .dropTableIfExists('fcb_policies')
    .dropTableIfExists('fcb_quotes')
    .dropTableIfExists('fcb_rating_factors')
    .dropTableIfExists('fcb_package_limits')
    .dropTableIfExists('fcb_package_benefits')
    .dropTableIfExists('fcb_packages')
    .dropTableIfExists('fcb_products')
    .dropTableIfExists('fcb_partners');
};

// ===================================================================
// STEP-BY-STEP TROUBLESHOOTING COMMANDS
// ===================================================================

/*
Follow these exact steps to fix your migration:

1. ROLLBACK THE FAILED MIGRATION:
   npx knex migrate:rollback

2. CHECK CURRENT STATUS:
   npx knex migrate:status

3. CLEAR ANY EXISTING TABLES (if needed):
   psql -d your_database -c "DROP TABLE IF EXISTS fcb_payment_transactions, fcb_policies, fcb_quotes, fcb_rating_factors, fcb_package_limits, fcb_package_benefits, fcb_packages, fcb_products, fcb_partners CASCADE;"

4. REPLACE YOUR MIGRATION FILE:
   Replace the content of src/db/migrations/001_create_fcb_rating_tables.js with the content above

5. RUN THE MIGRATION:
   npx knex migrate:latest

6. VERIFY TABLES WERE CREATED:
   psql -d your_database -c "\dt fcb_*"

7. RUN THE SEEDS:
   npx knex seed:run

8. VERIFY DATA WAS INSERTED:
   psql -d your_database -c "SELECT COUNT(*) FROM fcb_packages;"

If you get any errors at step 5, try these debugging steps:

DEBUG STEP A - Check PostgreSQL connection:
psql -d your_database -c "SELECT 1;"

DEBUG STEP B - Check Knex configuration:
node -e "const knex = require('knex'); const config = require('./knexfile.js'); console.log(config.development);"

DEBUG STEP C - Try creating a single table manually:
psql -d your_database -c "CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));"

If none of the above work, the issue might be with your PostgreSQL setup or Knex configuration.
*/

// ===================================================================
// ALTERNATIVE: MANUAL TABLE CREATION (if migration keeps failing)
// ===================================================================

/*
If the Knex migration continues to fail, you can create the tables manually with SQL:

psql -d your_database << 'EOF'

-- Products table
CREATE TABLE fcb_products (
    product_id VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    rating_type VARCHAR(20) DEFAULT 'FLAT_RATE',
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages table
CREATE TABLE fcb_packages (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(100) UNIQUE NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    minimum_premium DECIMAL(10,2),
    maximum_premium DECIMAL(10,2),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Package benefits table
CREATE TABLE fcb_package_benefits (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(100) NOT NULL,
    benefit_type VARCHAR(100) NOT NULL,
    benefit_value VARCHAR(255) NOT NULL,
    benefit_unit VARCHAR(50),
    benefit_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Package limits table
CREATE TABLE fcb_package_limits (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(100) NOT NULL,
    min_age INTEGER,
    max_age INTEGER,
    min_family_size INTEGER,
    max_family_size INTEGER,
    min_sum_insured DECIMAL(15,2),
    max_sum_insured DECIMAL(15,2),
    additional_limits JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rating factors table
CREATE TABLE fcb_rating_factors (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    factor_type VARCHAR(50) NOT NULL,
    factor_key VARCHAR(100) NOT NULL,
    factor_multiplier DECIMAL(5,4),
    factor_addition DECIMAL(10,2),
    factor_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table
CREATE TABLE fcb_quotes (
    quote_id SERIAL PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    package_id VARCHAR(100) NOT NULL,
    customer_info JSON NOT NULL,
    risk_factors JSON,
    duration_months INTEGER DEFAULT 12,
    base_premium DECIMAL(10,2) NOT NULL,
    monthly_premium DECIMAL(10,2) NOT NULL,
    total_premium DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    calculation_breakdown JSON,
    rating_factors_applied JSON,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies table
CREATE TABLE fcb_policies (
    policy_id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    quote_id INTEGER,
    product_id VARCHAR(50) NOT NULL,
    package_id VARCHAR(100) NOT NULL,
    customer_info JSON NOT NULL,
    premium_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions table
CREATE TABLE fcb_payment_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    policy_id INTEGER,
    quote_id INTEGER,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'PENDING',
    payment_reference VARCHAR(255),
    external_reference VARCHAR(255),
    payment_details JSON,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partners table
CREATE TABLE fcb_partners (
    partner_id SERIAL PRIMARY KEY,
    partner_code VARCHAR(50) UNIQUE NOT NULL,
    partner_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    allowed_products JSON,
    commission_rate DECIMAL(5,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

EOF

Then mark the migration as complete:
npx knex migrate:up

And run seeds:
npx knex seed:run
*/