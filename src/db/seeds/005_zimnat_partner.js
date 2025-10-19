/**
 * Seed file for ZIMNAT partner
 * Adds the ZIMNAT Motor Insurance partner for motor quotes
 */

exports.seed = async function(knex) {
  const crypto = require('crypto');

  // Check if ZIMNAT partner already exists
  const existing = await knex('fcb_partners')
    .where('partner_code', '20117846')
    .first();

  if (existing) {
    console.log('✅ ZIMNAT partner already exists');
    return;
  }

  // Insert ZIMNAT Motor Insurance partner
  await knex('fcb_partners').insert({
    partner_code: '20117846',
    partner_name: 'ZIMNAT Motor Insurance',
    api_key: '607914519953940821885067',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('✅ ZIMNAT Motor Insurance partner added successfully');
};
