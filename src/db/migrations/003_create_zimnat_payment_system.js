/**
 * ===================================================================
 * ZIMNAT API v2.1 - Payment System Tables Migration
 * File: src/db/migrations/003_create_zimnat_payment_system.js
 * ===================================================================
 *
 * Creates payment processing, receipts, reversals, and reconciliation tables
 * for ZIMNAT API v2.1 specification
 */

exports.up = function(knex) {
  return knex.schema
    // 1. Enhance existing payment_transactions table or create new one
    .createTable('zimnat_payment_transactions', table => {
      table.increments('id').primary();
      table.string('external_reference', 100).unique().notNullable().comment('Partner unique reference');
      table.string('txn_reference', 100).unique().notNullable().comment('System generated transaction reference');
      table.string('gateway_reference', 100).comment('Payment gateway reference');

      // Policy and customer info
      table.string('policy_holder_id', 100);
      table.string('policy_number', 100);
      table.integer('policy_id').unsigned();
      table.string('insurance_type', 50);
      table.string('policy_type', 50);

      // Payment details
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency', 3).notNullable().comment('ISO 4217 code: USD, ZWG');
      table.string('payment_method', 50).notNullable();
      table.enum('status', ['pending', 'completed', 'failed', 'cancelled', 'reversed']).defaultTo('pending');

      // Customer details
      table.string('customer_name', 200);
      table.string('customer_email', 200);
      table.string('customer_mobile', 20);

      // URLs for callbacks
      table.text('return_url');
      table.text('callback_url');

      // Payment gateway details
      table.jsonb('payment_details');
      table.jsonb('gateway_response');

      // Reconciliation
      table.enum('reconciliation_status', ['pending', 'matched', 'unmatched', 'disputed']).defaultTo('pending');
      table.timestamp('reconciliation_date');

      // Timestamps
      table.timestamp('processed_at');
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('policy_id').references('fcb_policies.policy_id').onDelete('SET NULL');
    })

    // 2. Payment receipts table
    .createTable('zimnat_payment_receipts', table => {
      table.increments('id').primary();
      table.string('receipt_number', 100).unique().notNullable();
      table.integer('payment_transaction_id').unsigned().notNullable();
      table.integer('policy_id').unsigned();

      // Receipt details
      table.timestamp('allocated_at');
      table.enum('status', ['pending', 'applied', 'reversed']).defaultTo('pending');

      // Reversal info
      table.text('reversal_reason');
      table.timestamp('reversed_at');
      table.string('reversed_by', 100);

      table.timestamps(true, true);

      // Foreign keys
      table.foreign('payment_transaction_id').references('zimnat_payment_transactions.id').onDelete('CASCADE');
      table.foreign('policy_id').references('fcb_policies.policy_id').onDelete('SET NULL');
    })

    // 3. Payment reversals table
    .createTable('zimnat_payment_reversals', table => {
      table.increments('id').primary();
      table.string('reversal_reference', 100).unique().notNullable();
      table.integer('original_payment_id').unsigned().notNullable();
      table.string('original_external_reference', 100).notNullable();
      table.string('receipt_number', 100);

      // Reversal details
      table.text('reason').notNullable();
      table.string('initiated_by', 100).notNullable();
      table.timestamp('requested_at').notNullable();
      table.timestamp('processed_at');
      table.enum('status', ['pending', 'approved', 'rejected', 'completed']).defaultTo('pending');
      table.decimal('reversal_amount', 10, 2);

      table.timestamps(true, true);

      // Foreign keys
      table.foreign('original_payment_id').references('zimnat_payment_transactions.id').onDelete('RESTRICT');
    })

    // 4. API access tokens table
    .createTable('zimnat_api_tokens', table => {
      table.increments('id').primary();
      table.integer('partner_id').unsigned().notNullable();
      table.string('token_hash', 255).unique().notNullable();
      table.string('api_key_hash', 255).notNullable();
      table.string('scope', 200);
      table.timestamp('expires_at').notNullable();
      table.boolean('revoked').defaultTo(false);
      table.timestamp('revoked_at');
      table.timestamp('last_used_at');
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('partner_id').references('fcb_partners.partner_id').onDelete('CASCADE');
    })

    // 5. Motor quotes table (enhanced version)
    .createTable('zimnat_motor_quotes', table => {
      table.increments('id').primary();
      table.string('reference_id', 100).unique().notNullable();
      table.string('external_reference', 100);
      table.integer('partner_id').unsigned();

      // Quote type
      table.enum('quote_type', ['insurance', 'license', 'combined']).notNullable();
      table.string('currency', 3).defaultTo('USD');

      // Vehicle details
      table.string('vrn', 20).comment('Vehicle Registration Number');
      table.integer('vehicle_type').unsigned();
      table.decimal('vehicle_value', 10, 2);
      table.integer('duration_months');
      table.date('end_date');
      table.integer('insurance_type');

      // License details
      table.integer('lic_frequency');
      table.integer('radio_tv_usage');
      table.integer('radio_tv_frequency');

      // Payment and delivery
      table.integer('payment_method');
      table.integer('delivery_method');

      // Client information (stored as JSON)
      table.jsonb('client_data');

      // Quote amounts
      table.decimal('insurance_premium', 10, 2);
      table.decimal('license_fee', 10, 2);
      table.decimal('radio_fee', 10, 2);
      table.decimal('total_amount', 10, 2);

      // Status and references
      table.enum('status', ['pending', 'approved', 'rejected', 'expired', 'paid']).defaultTo('pending');
      table.string('policy_number', 100);
      table.string('receipt_id', 100);

      // Timestamps
      table.timestamp('requested_at');
      table.timestamp('expires_at').comment('Quotes expire after 24 hours');
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('partner_id').references('fcb_partners.partner_id').onDelete('SET NULL');
      table.foreign('vehicle_type').references('enum_vehicle_types.code');
      table.foreign('insurance_type').references('enum_insurance_types.code');
      table.foreign('lic_frequency').references('enum_frequencies.code');
      table.foreign('radio_tv_usage').references('enum_radio_tv_usage.code');
      table.foreign('radio_tv_frequency').references('enum_frequencies.code');
      table.foreign('payment_method').references('enum_payment_methods.code');
      table.foreign('delivery_method').references('enum_delivery_methods.code');
    })

    // 6. Enhance fcb_policies table with new fields
    .table('fcb_policies', table => {
      table.string('policy_type', 50);
      table.string('rating_type', 50);
      table.string('renewal_frequency', 50);
      table.string('payment_frequency', 50);
      table.date('latest_cover_start');
      table.date('latest_cover_end');
      table.string('latest_cover_status', 50);
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('fcb_policies', table => {
      table.dropColumn('policy_type');
      table.dropColumn('rating_type');
      table.dropColumn('renewal_frequency');
      table.dropColumn('payment_frequency');
      table.dropColumn('latest_cover_start');
      table.dropColumn('latest_cover_end');
      table.dropColumn('latest_cover_status');
    })
    .dropTableIfExists('zimnat_motor_quotes')
    .dropTableIfExists('zimnat_api_tokens')
    .dropTableIfExists('zimnat_payment_reversals')
    .dropTableIfExists('zimnat_payment_receipts')
    .dropTableIfExists('zimnat_payment_transactions');
};
