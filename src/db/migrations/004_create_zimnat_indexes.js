/**
 * ===================================================================
 * ZIMNAT API v2.1 - Database Indexes for Performance
 * File: src/db/migrations/004_create_zimnat_indexes.js
 * ===================================================================
 *
 * Creates indexes on frequently queried columns for optimal performance
 */

exports.up = function(knex) {
  return knex.schema
    // Indexes for zimnat_payment_transactions
    .table('zimnat_payment_transactions', table => {
      table.index('external_reference', 'idx_payment_external_ref');
      table.index('txn_reference', 'idx_payment_txn_ref');
      table.index('gateway_reference', 'idx_payment_gateway_ref');
      table.index('policy_number', 'idx_payment_policy_number');
      table.index('status', 'idx_payment_status');
      table.index('processed_at', 'idx_payment_processed_date');
      table.index('reconciliation_status', 'idx_payment_reconciliation');
      table.index(['currency', 'status'], 'idx_payment_currency_status');
      table.index(['processed_at', 'status'], 'idx_payment_date_status');
    })

    // Indexes for zimnat_payment_receipts
    .table('zimnat_payment_receipts', table => {
      table.index('receipt_number', 'idx_receipt_number');
      table.index('payment_transaction_id', 'idx_receipt_payment_id');
      table.index('status', 'idx_receipt_status');
      table.index('allocated_at', 'idx_receipt_allocated_date');
    })

    // Indexes for zimnat_payment_reversals
    .table('zimnat_payment_reversals', table => {
      table.index('reversal_reference', 'idx_reversal_ref');
      table.index('original_external_reference', 'idx_reversal_original_ref');
      table.index('status', 'idx_reversal_status');
      table.index('requested_at', 'idx_reversal_requested_date');
    })

    // Indexes for zimnat_api_tokens
    .table('zimnat_api_tokens', table => {
      table.index('token_hash', 'idx_token_hash');
      table.index('partner_id', 'idx_token_partner');
      table.index('expires_at', 'idx_token_expires');
      table.index(['partner_id', 'revoked'], 'idx_token_partner_active');
    })

    // Indexes for zimnat_motor_quotes
    .table('zimnat_motor_quotes', table => {
      table.index('reference_id', 'idx_quote_reference');
      table.index('external_reference', 'idx_quote_external_ref');
      table.index('vrn', 'idx_quote_vrn');
      table.index('status', 'idx_quote_status');
      table.index('quote_type', 'idx_quote_type');
      table.index('policy_number', 'idx_quote_policy_number');
      table.index('expires_at', 'idx_quote_expires');
      table.index(['status', 'expires_at'], 'idx_quote_status_expires');
      table.index('requested_at', 'idx_quote_requested_date');
    })

    // Indexes for enum tables (for lookups)
    .table('enum_suburbs_towns', table => {
      table.index('town', 'idx_suburbs_town');
      table.index('suburb', 'idx_suburbs_suburb');
      table.index(['town', 'suburb'], 'idx_suburbs_town_suburb');
    })

    .table('enum_tax_classes', table => {
      table.index('vehicle_type', 'idx_tax_vehicle_type');
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('zimnat_payment_transactions', table => {
      table.dropIndex('external_reference', 'idx_payment_external_ref');
      table.dropIndex('txn_reference', 'idx_payment_txn_ref');
      table.dropIndex('gateway_reference', 'idx_payment_gateway_ref');
      table.dropIndex('policy_number', 'idx_payment_policy_number');
      table.dropIndex('status', 'idx_payment_status');
      table.dropIndex('processed_at', 'idx_payment_processed_date');
      table.dropIndex('reconciliation_status', 'idx_payment_reconciliation');
      table.dropIndex(['currency', 'status'], 'idx_payment_currency_status');
      table.dropIndex(['processed_at', 'status'], 'idx_payment_date_status');
    })

    .table('zimnat_payment_receipts', table => {
      table.dropIndex('receipt_number', 'idx_receipt_number');
      table.dropIndex('payment_transaction_id', 'idx_receipt_payment_id');
      table.dropIndex('status', 'idx_receipt_status');
      table.dropIndex('allocated_at', 'idx_receipt_allocated_date');
    })

    .table('zimnat_payment_reversals', table => {
      table.dropIndex('reversal_reference', 'idx_reversal_ref');
      table.dropIndex('original_external_reference', 'idx_reversal_original_ref');
      table.dropIndex('status', 'idx_reversal_status');
      table.dropIndex('requested_at', 'idx_reversal_requested_date');
    })

    .table('zimnat_api_tokens', table => {
      table.dropIndex('token_hash', 'idx_token_hash');
      table.dropIndex('partner_id', 'idx_token_partner');
      table.dropIndex('expires_at', 'idx_token_expires');
      table.dropIndex(['partner_id', 'revoked'], 'idx_token_partner_active');
    })

    .table('zimnat_motor_quotes', table => {
      table.dropIndex('reference_id', 'idx_quote_reference');
      table.dropIndex('external_reference', 'idx_quote_external_ref');
      table.dropIndex('vrn', 'idx_quote_vrn');
      table.dropIndex('status', 'idx_quote_status');
      table.dropIndex('quote_type', 'idx_quote_type');
      table.dropIndex('policy_number', 'idx_quote_policy_number');
      table.dropIndex('expires_at', 'idx_quote_expires');
      table.dropIndex(['status', 'expires_at'], 'idx_quote_status_expires');
      table.dropIndex('requested_at', 'idx_quote_requested_date');
    })

    .table('enum_suburbs_towns', table => {
      table.dropIndex('town', 'idx_suburbs_town');
      table.dropIndex('suburb', 'idx_suburbs_suburb');
      table.dropIndex(['town', 'suburb'], 'idx_suburbs_town_suburb');
    })

    .table('enum_tax_classes', table => {
      table.dropIndex('vehicle_type', 'idx_tax_vehicle_type');
    });
};
