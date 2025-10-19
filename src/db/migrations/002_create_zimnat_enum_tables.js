/**
 * ===================================================================
 * ZIMNAT API v2.1 - Enum/Reference Data Tables Migration
 * File: src/db/migrations/002_create_zimnat_enum_tables.js
 * ===================================================================
 *
 * Creates all enumeration and reference data tables required for
 * ZIMNAT API v2.1 specification and ICEcash Insurance/License integration
 */

exports.up = function(knex) {
  return knex.schema
    // 1. Vehicle Types (37 types)
    .createTable('enum_vehicle_types', table => {
      table.integer('code').primary();
      table.string('type', 100).notNullable();
      table.string('use', 200).notNullable();
      table.timestamps(true, true);
    })

    // 2. Payment Methods (13 methods)
    .createTable('enum_payment_methods', table => {
      table.integer('code').primary();
      table.string('description', 100).notNullable();
      table.string('approval', 50).notNullable();
      table.timestamps(true, true);
    })

    // 3. Insurance Types (4 types)
    .createTable('enum_insurance_types', table => {
      table.integer('code').primary();
      table.string('type_code', 10).notNullable();
      table.string('description', 100).notNullable();
      table.timestamps(true, true);
    })

    // 4. Delivery Methods (2 methods)
    .createTable('enum_delivery_methods', table => {
      table.integer('code').primary();
      table.string('description', 100).notNullable();
      table.timestamps(true, true);
    })

    // 5. Tax Classes (102 classes)
    .createTable('enum_tax_classes', table => {
      table.integer('tax_class').primary();
      table.string('description', 200).notNullable();
      table.integer('vehicle_type').notNullable();
      table.string('type', 100);
      table.string('use', 200);
      table.timestamps(true, true);
    })

    // 6. Client ID Types (2 types)
    .createTable('enum_client_id_types', table => {
      table.integer('code').primary();
      table.string('description', 100).notNullable();
      table.timestamps(true, true);
    })

    // 7. Radio/TV Usage (3 types)
    .createTable('enum_radio_tv_usage', table => {
      table.integer('code').primary();
      table.string('description', 100).notNullable();
      table.timestamps(true, true);
    })

    // 8. Frequencies (12 options)
    .createTable('enum_frequencies', table => {
      table.integer('code').primary();
      table.string('description', 50).notNullable();
      table.integer('months').notNullable();
      table.timestamps(true, true);
    })

    // 9. Suburbs and Towns (384 combinations)
    .createTable('enum_suburbs_towns', table => {
      table.integer('suburb_id').primary();
      table.string('town', 100).notNullable();
      table.string('suburb', 100).notNullable();
      table.timestamps(true, true);
    })

    // 10. Insurance Companies
    .createTable('enum_insurance_companies', table => {
      table.integer('company_id').primary();
      table.string('organisation', 200).notNullable();
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('enum_insurance_companies')
    .dropTableIfExists('enum_suburbs_towns')
    .dropTableIfExists('enum_frequencies')
    .dropTableIfExists('enum_radio_tv_usage')
    .dropTableIfExists('enum_client_id_types')
    .dropTableIfExists('enum_tax_classes')
    .dropTableIfExists('enum_delivery_methods')
    .dropTableIfExists('enum_insurance_types')
    .dropTableIfExists('enum_payment_methods')
    .dropTableIfExists('enum_vehicle_types');
};
