/**
 * ===================================================================
 * ZIMNAT API v2.1 - Tax Classes Data Seeding
 * File: src/db/seeds/003_zimnat_tax_classes.js
 * ===================================================================
 *
 * Seeds tax classes table with 102 tax class mappings
 */

exports.seed = async function(knex) {
  // Clear existing data
  await knex('enum_tax_classes').del();

  // Insert Tax Classes (102 classes) - from ICEcash Appendix
  const taxClasses = [
    { tax_class: 1, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 1, type: 'Private Car', use: 'Private Use' },
    { tax_class: 2, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 1, type: 'Private Car', use: 'Private Use' },
    { tax_class: 3, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 1, type: 'Private Car', use: 'Private Use' },
    { tax_class: 4, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 1, type: 'Private Car', use: 'Private Use' },
    { tax_class: 5, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 2, type: 'Private Car', use: 'Private Use' },
    { tax_class: 6, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 2, type: 'Private Car', use: 'Business use' },
    { tax_class: 7, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 2, type: 'Private Car', use: 'Business use' },
    { tax_class: 8, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 2, type: 'Private Car', use: 'Business use' },
    { tax_class: 9, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 3, type: 'Private Car', use: 'Fleet' },
    { tax_class: 10, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 3, type: 'Private Car', use: 'Fleet' },
    { tax_class: 11, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 3, type: 'Private Car', use: 'Fleet' },
    { tax_class: 12, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 3, type: 'Private Car', use: 'Fleet' },
    { tax_class: 13, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 4, type: 'Private Car', use: 'Private Hire (Car Hire)' },
    { tax_class: 14, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 4, type: 'Private Car', use: 'Private Hire (Car Hire)' },
    { tax_class: 15, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 4, type: 'Private Car', use: 'Private Hire (Car Hire)' },
    { tax_class: 16, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 4, type: 'Private Car', use: 'Private Hire (Car Hire)' },
    { tax_class: 17, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 5, type: 'Private Car', use: 'Driving School' },
    { tax_class: 18, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 5, type: 'Private Car', use: 'Driving School' },
    { tax_class: 19, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 5, type: 'Private Car', use: 'Driving School' },
    { tax_class: 20, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 5, type: 'Private Car', use: 'Driving School' },
    { tax_class: 21, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 6, type: 'Trailer', use: 'Domestic Trailers' },
    { tax_class: 22, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 6, type: 'Trailer', use: 'Domestic Trailers' },
    { tax_class: 23, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 7, type: 'Trailer', use: 'Caravans' },
    { tax_class: 24, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 7, type: 'Trailer', use: 'Caravans' },
    { tax_class: 25, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 8, type: 'Commercial Vehicle', use: 'Own use' },
    { tax_class: 26, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 8, type: 'Commercial Vehicle', use: 'Own use' },
    { tax_class: 27, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 8, type: 'Commercial Vehicle', use: 'Own use' },
    { tax_class: 28, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 8, type: 'Commercial Vehicle', use: 'Own use' },
    { tax_class: 29, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 9, type: 'Commercial Vehicle', use: 'Hire and Reward' },
    { tax_class: 30, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 9, type: 'Commercial Vehicle', use: 'Hire and Reward' },
    { tax_class: 31, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 9, type: 'Commercial Vehicle', use: 'Hire and Reward' },
    { tax_class: 32, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 9, type: 'Commercial Vehicle', use: 'Hire and Reward' },
    { tax_class: 33, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 10, type: 'Commercial Vehicle', use: 'Fleet - Own use' },
    { tax_class: 34, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 10, type: 'Commercial Vehicle', use: 'Fleet - Own use' },
    { tax_class: 35, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 10, type: 'Commercial Vehicle', use: 'Fleet - Own use' },
    { tax_class: 36, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 10, type: 'Commercial Vehicle', use: 'Fleet - Own use' },
    { tax_class: 37, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 11, type: 'Commercial Vehicle', use: 'Fleet - Hire and Reward' },
    { tax_class: 38, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 11, type: 'Commercial Vehicle', use: 'Fleet - Hire and Reward' },
    { tax_class: 39, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 11, type: 'Commercial Vehicle', use: 'Fleet - Hire and Reward' },
    { tax_class: 40, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 11, type: 'Commercial Vehicle', use: 'Fleet - Hire and Reward' },
    { tax_class: 41, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 29, type: 'Staff Bus', use: 'Between 31 - 60 seats' },
    { tax_class: 42, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 29, type: 'Staff Bus', use: 'Between 31 - 60 seats' },
    { tax_class: 43, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 30, type: 'Staff Bus', use: 'More than 60 seats' },
    { tax_class: 44, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 30, type: 'Staff Bus', use: 'More than 60 seats' },
    { tax_class: 45, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 30, type: 'Staff Bus', use: 'More than 60 seats' },
    { tax_class: 46, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 31, type: 'Tractors/Fork Lifts', use: 'Own use' },
    { tax_class: 47, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 32, type: 'Tractors', use: 'Hire and Reward' },
    { tax_class: 48, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 33, type: 'Tractors/Combines', use: 'Agriculture - Own use' },
    { tax_class: 49, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 34, type: 'Tractors/Combines', use: 'Agric - Hire & Reward' },
    { tax_class: 50, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 35, type: 'Ambulance, Fire Engine, Hearse', use: 'Various' },
    { tax_class: 51, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 35, type: 'Ambulance, Fire Engine, Hearse', use: 'Various' },
    { tax_class: 52, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 35, type: 'Ambulance, Fire Engine, Hearse', use: 'Various' },
    { tax_class: 53, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 36, type: 'Agricultural Implements', use: 'Various' },
    { tax_class: 54, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 36, type: 'Agricultural Implements', use: 'Various' },
    { tax_class: 55, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 37, type: 'Special Types', use: 'Contractors Plant and Equipment (Dozers, Graders and the like)' },
    { tax_class: 56, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 37, type: 'Special Types', use: 'Contractors Plant and Equipment (Dozers, Graders and the like)' },
    { tax_class: 57, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 37, type: 'Special Types', use: 'Contractors Plant and Equipment (Dozers, Graders and the like)' },
    { tax_class: 58, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 22, type: 'Omnibus and Commuters', use: 'Up to 30 seats' },
    { tax_class: 59, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 35, type: 'Ambulance, Fire Engine, Hearse', use: 'Various' },
    { tax_class: 60, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 12, type: 'Commercial Vehicle', use: 'Driving School' },
    { tax_class: 61, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 12, type: 'Commercial Vehicle', use: 'Driving School' },
    { tax_class: 62, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 12, type: 'Commercial Vehicle', use: 'Driving School' },
    { tax_class: 63, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 12, type: 'Commercial Vehicle', use: 'Driving School' },
    { tax_class: 64, description: 'LIGHT MOTOR VEHICLE (1-2300KG)', vehicle_type: 13, type: 'Taxis', use: 'Public Hire' },
    { tax_class: 65, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 13, type: 'Taxis', use: 'Public Hire' },
    { tax_class: 66, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 13, type: 'Taxis', use: 'Public Hire' },
    { tax_class: 67, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 13, type: 'Taxis', use: 'Public Hire' },
    { tax_class: 68, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 14, type: 'Commercial Trailers', use: 'Own use' },
    { tax_class: 69, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 14, type: 'Commercial Trailers', use: 'Own use' },
    { tax_class: 70, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 15, type: 'Commercial Trailers', use: 'Hire and Reward' },
    { tax_class: 71, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 15, type: 'Commercial Trailers', use: 'Hire and Reward' },
    { tax_class: 72, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 16, type: 'Commercial Trailers', use: 'Fleet - Own use' },
    { tax_class: 73, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 16, type: 'Commercial Trailers', use: 'Fleet - Own use' },
    { tax_class: 74, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 17, type: 'Commercial Trailers', use: 'Fleet - Hire and Reward' },
    { tax_class: 75, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 17, type: 'Commercial Trailers', use: 'Fleet - Hire and Reward' },
    { tax_class: 76, description: 'TRAILERS SMALL (1-500KG)', vehicle_type: 18, type: 'Commercial Trailers', use: 'Agriculture' },
    { tax_class: 77, description: 'TRAILERS BIG (> 500KG)', vehicle_type: 18, type: 'Commercial Trailers', use: 'Agriculture' },
    { tax_class: 78, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 19, type: 'Motor Cycles', use: 'SD&P use' },
    { tax_class: 79, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 20, type: 'Motor Cycles', use: 'Business use' },
    { tax_class: 80, description: 'MOTOR BIKES, TRACTORS', vehicle_type: 21, type: 'Motor Cycles', use: 'Fleet' },
    { tax_class: 81, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 22, type: 'Omnibus and Commuters', use: 'Up to 30 seats' },
    { tax_class: 82, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 22, type: 'Omnibus and Commuters', use: 'Up to 30 seats' },
    { tax_class: 83, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 22, type: 'Omnibus and Commuters', use: 'Up to 30 seats' },
    { tax_class: 84, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 23, type: 'Omnibus and Commuters', use: 'Between 31 - 60 seats' },
    { tax_class: 85, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 23, type: 'Omnibus and Commuters', use: 'Between 31 - 60 seats' },
    { tax_class: 86, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 23, type: 'Omnibus and Commuters', use: 'Between 31 - 60 seats' },
    { tax_class: 87, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 24, type: 'Omnibus and Commuters', use: 'More than 60 seats' },
    { tax_class: 88, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 24, type: 'Omnibus and Commuters', use: 'More than 60 seats' },
    { tax_class: 89, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 24, type: 'Omnibus and Commuters', use: 'More than 60 seats' },
    { tax_class: 90, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 25, type: 'School Bus', use: 'Up to 30 seats' },
    { tax_class: 91, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 25, type: 'School Bus', use: 'Up to 30 seats' },
    { tax_class: 92, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 25, type: 'School Bus', use: 'Up to 30 seats' },
    { tax_class: 93, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 26, type: 'School Bus', use: 'Between 31 - 60 seats' },
    { tax_class: 94, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 26, type: 'School Bus', use: 'Between 31 - 60 seats' },
    { tax_class: 95, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 26, type: 'School Bus', use: 'Between 31 - 60 seats' },
    { tax_class: 96, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 27, type: 'School Bus', use: 'More than 60 seats' },
    { tax_class: 97, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 27, type: 'School Bus', use: 'More than 60 seats' },
    { tax_class: 98, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 27, type: 'School Bus', use: 'More than 60 seats' },
    { tax_class: 99, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 28, type: 'Staff Bus', use: 'Up to 30 seats' },
    { tax_class: 100, description: 'HEAVY VEHICLE (4601-9000KG)', vehicle_type: 28, type: 'Staff Bus', use: 'Up to 30 seats' },
    { tax_class: 101, description: 'HEAVY VEHICLE (> 9000KG)', vehicle_type: 28, type: 'Staff Bus', use: 'Up to 30 seats' },
    { tax_class: 102, description: 'HEAVY VEHICLE (2301-4600KG)', vehicle_type: 29, type: 'Staff Bus', use: 'Between 31 - 60 seats' }
  ];

  // Insert in batches of 50 to avoid query size limits
  const batchSize = 50;
  for (let i = 0; i < taxClasses.length; i += batchSize) {
    const batch = taxClasses.slice(i, i + batchSize);
    await knex('enum_tax_classes').insert(batch);
  }

  console.log('✓ Tax classes seeded successfully (102 classes)');
};
