/**
 * ===================================================================
 * ZIMNAT API v2.1 - Enum Data Seeding
 * File: src/db/seeds/002_zimnat_enum_data.js
 * ===================================================================
 *
 * Seeds all enumeration tables with data from ICEcash Insurance/License
 * API Appendix 2025 and ZIMNAT API Specification v2.1
 */

exports.seed = async function(knex) {
  // Clear existing data (in correct order due to foreign keys)
  await knex('enum_tax_classes').del();
  await knex('enum_suburbs_towns').del();
  await knex('enum_frequencies').del();
  await knex('enum_radio_tv_usage').del();
  await knex('enum_client_id_types').del();
  await knex('enum_delivery_methods').del();
  await knex('enum_insurance_types').del();
  await knex('enum_payment_methods').del();
  await knex('enum_vehicle_types').del();
  await knex('enum_insurance_companies').del();

  // 1. Insert Vehicle Types (37 types)
  await knex('enum_vehicle_types').insert([
    { code: 1, type: 'Private Car', use: 'Private Use' },
    { code: 2, type: 'Private Car', use: 'Private Use' },
    { code: 3, type: 'Private Car', use: 'Private Use' },
    { code: 4, type: 'Private Car', use: 'Private Use' },
    { code: 5, type: 'Private Car', use: 'Driving School' },
    { code: 6, type: 'Trailer', use: 'Domestic Trailers' },
    { code: 7, type: 'Trailer', use: 'Caravans' },
    { code: 8, type: 'Commercial Vehicle', use: 'Own use' },
    { code: 9, type: 'Commercial Vehicle', use: 'Hire and Reward' },
    { code: 10, type: 'Commercial Vehicle', use: 'Fleet - Own use' },
    { code: 11, type: 'Commercial Vehicle', use: 'Fleet - Hire and Reward' },
    { code: 12, type: 'Commercial Vehicle', use: 'Driving School' },
    { code: 13, type: 'Taxis', use: 'Public Hire' },
    { code: 14, type: 'Commercial Trailers', use: 'Own use' },
    { code: 15, type: 'Commercial Trailers', use: 'Hire and Reward' },
    { code: 16, type: 'Commercial Trailers', use: 'Fleet - Own use' },
    { code: 17, type: 'Commercial Trailers', use: 'Fleet - Hire and Reward' },
    { code: 18, type: 'Commercial Trailers', use: 'Agriculture' },
    { code: 19, type: 'Motor Cycles', use: 'SD&P use' },
    { code: 20, type: 'Motor Cycles', use: 'Business use' },
    { code: 21, type: 'Motor Cycles', use: 'Fleet' },
    { code: 22, type: 'Omnibus and Commuters', use: 'Up to 30 seats' },
    { code: 23, type: 'Omnibus and Commuters', use: 'Between 31 - 60 seats' },
    { code: 24, type: 'Omnibus and Commuters', use: 'More than 60 seats' },
    { code: 25, type: 'School Bus', use: 'Up to 30 seats' },
    { code: 26, type: 'School Bus', use: 'Between 31 - 60 seats' },
    { code: 27, type: 'School Bus', use: 'More than 60 seats' },
    { code: 28, type: 'Staff Bus', use: 'Up to 30 seats' },
    { code: 29, type: 'Staff Bus', use: 'Between 31 - 60 seats' },
    { code: 30, type: 'Staff Bus', use: 'More than 60 seats' },
    { code: 31, type: 'Tractors/Fork Lifts', use: 'Own use' },
    { code: 32, type: 'Tractors', use: 'Hire and Reward' },
    { code: 33, type: 'Tractors/Combines', use: 'Agriculture - Own use' },
    { code: 34, type: 'Tractors/Combines', use: 'Agriculture - Hire & Reward' },
    { code: 35, type: 'Ambulance, Fire Engine, Hearse', use: 'Various' },
    { code: 36, type: 'Agricultural Implements', use: 'Various' },
    { code: 37, type: 'Special Types', use: 'Contractors Plant and Equipment (Dozers, Graders and the like)' }
  ]);

  // 2. Insert Payment Methods (13 methods)
  await knex('enum_payment_methods').insert([
    { code: 1, description: 'Cash', approval: 'None' },
    { code: 2, description: 'ICEcash', approval: 'Client OTP' },
    { code: 3, description: 'EcoCash', approval: 'Third Party' },
    { code: 4, description: 'Airtime', approval: 'Third Party' },
    { code: 5, description: 'Netone', approval: 'Third Party' },
    { code: 6, description: 'Telecel', approval: 'Third Party' },
    { code: 7, description: 'Master or Visa Card', approval: 'Payment Gateway' },
    { code: 8, description: 'Zimswitch', approval: 'None' },
    { code: 9, description: 'iVeri', approval: 'None' },
    { code: 10, description: 'FBC', approval: 'None' },
    { code: 11, description: 'Prepaid', approval: 'None' },
    { code: 12, description: 'PDS', approval: 'None' },
    { code: 13, description: 'Zipit', approval: 'None' }
  ]);

  // 3. Insert Insurance Types (4 types)
  await knex('enum_insurance_types').insert([
    { code: 1, type_code: 'RTA', description: 'Road Traffic Act' },
    { code: 2, type_code: 'FTP', description: 'Full Third Party' },
    { code: 3, type_code: 'FTPF', description: 'Full Third Party, Fire and Theft' },
    { code: 4, type_code: 'FTPFT', description: 'Comprehensive Cover' }
  ]);

  // 4. Insert Delivery Methods (4 methods)
  await knex('enum_delivery_methods').insert([
    { code: 1, description: 'POSTAL' },
    { code: 2, description: 'OFFICE COLLECTION' },
    { code: 3, description: 'EMAIL' },
    { code: 4, description: 'SMS' }
  ]);

  // 5. Insert Client ID Types (2 types)
  await knex('enum_client_id_types').insert([
    { code: 1, description: 'NATIONAL IDENTIFICATION' },
    { code: 2, description: 'BUSINESS REGISTRATION CERTIFICATE' }
  ]);

  // 6. Insert Radio/TV Usage (3 types)
  await knex('enum_radio_tv_usage').insert([
    { code: 1, description: 'PRIVATE VEHICLE' },
    { code: 2, description: 'COMPANY VEHICLE' },
    { code: 3, description: 'VEHICLE WITH TV' }
  ]);

  // 7. Insert Frequencies (12 options)
  await knex('enum_frequencies').insert([
    { code: 1, description: '4 MONTHS', months: 4 },
    { code: 2, description: '6 MONTHS', months: 6 },
    { code: 3, description: '12 MONTHS', months: 12 },
    { code: 4, description: '5 MONTHS', months: 5 },
    { code: 5, description: '7 MONTHS', months: 7 },
    { code: 6, description: '8 MONTHS', months: 8 },
    { code: 7, description: '9 MONTHS', months: 9 },
    { code: 8, description: '10 MONTHS', months: 10 },
    { code: 9, description: '11 MONTHS', months: 11 },
    { code: 10, description: '1 MONTH', months: 1 },
    { code: 11, description: '2 MONTHS', months: 2 },
    { code: 12, description: '3 MONTHS', months: 3 }
  ]);

  // 8. Insert Insurance Companies
  await knex('enum_insurance_companies').insert([
    { company_id: 2, organisation: 'ALLIANCE INSURANCE COMPANY' },
    { company_id: 3, organisation: 'ALLIED INSURANCE COMPANY' },
    { company_id: 5, organisation: 'CELL INSURANCE COMPANY' },
    { company_id: 6, organisation: 'CHAMPIONS INSURANCE COMPANY' },
    { company_id: 7, organisation: 'CLARION INSURANCE COMPANY' },
    { company_id: 8, organisation: 'CREDIT INSURANCE ZIMBABWE LIMITED' },
    { company_id: 9, organisation: 'FBC INSURANCE COMPANY' },
    { company_id: 10, organisation: 'EVOLUTION INSURANCE COMPANY' },
    { company_id: 12, organisation: 'EXPORT CREDIT GUARANTEE COMPANY OF ZIM' },
    { company_id: 17, organisation: 'NICOZ DIAMOND INSURANCE COMPANY' },
    { company_id: 19, organisation: 'QUALITY INSURANCE COMPANY' },
    { company_id: 21, organisation: 'OLD MUTUAL INSURANCE COMPANY' },
    { company_id: 24, organisation: 'ZIMNAT LION INSURANCE COMPANY' },
    { company_id: 26, organisation: 'HAMILTON INSURANCE COMPANY' },
    { company_id: 27, organisation: 'SANCTUARY INSURANCE COMPANY' },
    { company_id: 28, organisation: 'CBZ (OPTIMAL) INSURANCE COMPANY' },
    { company_id: 29, organisation: 'T.H.I INSURANCE COMPANY' },
    { company_id: 30, organisation: 'SAFEL INSURANCE COMPANY' },
    { company_id: 44, organisation: 'ECONET INSURANCE COMPANY' },
    { company_id: 56, organisation: 'EMPAYA' },
    { company_id: 70, organisation: 'AFC INSURANCE' }
  ]);

  console.log('✓ Enum data seeded successfully');
};
