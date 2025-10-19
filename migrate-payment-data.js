// =============================================================================
// PAYMENT DATA MIGRATION SCRIPT
// Migrates payment data from 'fcb' database to 'FCB' database
// =============================================================================

const { Pool } = require('pg');

// Database configurations
const sourceDatabaseConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: 'fcb', // Source database
  password: process.env.POSTGRES_PASSWORD || 'S@turday123',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
};

const targetDatabaseConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: 'FCB', // Target database
  password: process.env.POSTGRES_PASSWORD || 'S@turday123',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
};

async function migratePaymentData() {
  console.log('🔄 MIGRATING PAYMENT DATA');
  console.log('========================');
  console.log(`Source: ${sourceDatabaseConfig.database}`);
  console.log(`Target: ${targetDatabaseConfig.database}\n`);

  const sourcePool = new Pool(sourceDatabaseConfig);
  const targetPool = new Pool(targetDatabaseConfig);

  try {
    // Check source database tables
    console.log('🔍 Checking source database...');
    const sourceTablesResult = await sourcePool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('policy_payments', 'payment_status_log')
    `);
    
    const sourceTables = sourceTablesResult.rows.map(row => row.tablename);
    console.log(`   Found tables: ${sourceTables.join(', ')}`);

    if (sourceTables.length === 0) {
      console.log('✅ No payment data to migrate - source tables don\'t exist');
      return;
    }

    // Check target database tables
    console.log('🔍 Checking target database...');
    const targetTablesResult = await targetPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('policy_payments', 'payment_status_log')
    `);
    
    const targetTables = targetTablesResult.rows.map(row => row.tablename);
    console.log(`   Found tables: ${targetTables.join(', ')}\n`);

    // Migrate policy_payments table
    if (sourceTables.includes('policy_payments') && targetTables.includes('policy_payments')) {
      console.log('💳 Migrating policy_payments...');
      
      // Get data from source
      const paymentsResult = await sourcePool.query('SELECT * FROM policy_payments ORDER BY id');
      console.log(`   Source records: ${paymentsResult.rows.length}`);

      if (paymentsResult.rows.length > 0) {
        // Get current max ID in target to avoid conflicts
        const maxIdResult = await targetPool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM policy_payments');
        const startId = maxIdResult.rows[0].max_id + 1;

        // Insert into target database
        const targetClient = await targetPool.connect();
        
        try {
          await targetClient.query('BEGIN');
          
          let migratedCount = 0;
          for (let i = 0; i < paymentsResult.rows.length; i++) {
            const payment = paymentsResult.rows[i];
            
            // Check if payment already exists (by payment_reference)
            const existingResult = await targetClient.query(
              'SELECT id FROM policy_payments WHERE payment_reference = $1',
              [payment.payment_reference]
            );
            
            if (existingResult.rows.length === 0) {
              // Insert new payment (without id to let it auto-generate)
              const insertQuery = `
                INSERT INTO policy_payments (
                  policy_number, policy_holder_name, product_category, insurance_type,
                  payment_reference, transaction_id, amount, currency, payment_method,
                  payment_status, customer_name, customer_email, customer_phone,
                  database_source, partner_id, return_url, callback_url,
                  payment_gateway, gateway_reference, gateway_response,
                  initiated_at, paid_at, callback_received_at, expires_at,
                  created_at, updated_at, created_by, notes, metadata
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                  $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
                )
              `;
              
              await targetClient.query(insertQuery, [
                payment.policy_number, payment.policy_holder_name, payment.product_category,
                payment.insurance_type, payment.payment_reference, payment.transaction_id,
                payment.amount, payment.currency, payment.payment_method, payment.payment_status,
                payment.customer_name, payment.customer_email, payment.customer_phone,
                payment.database_source, payment.partner_id, payment.return_url,
                payment.callback_url, payment.payment_gateway, payment.gateway_reference,
                payment.gateway_response, payment.initiated_at, payment.paid_at,
                payment.callback_received_at, payment.expires_at, payment.created_at,
                payment.updated_at, payment.created_by, payment.notes, payment.metadata
              ]);
              
              migratedCount++;
            } else {
              console.log(`   Skipped duplicate: ${payment.payment_reference}`);
            }
          }
          
          await targetClient.query('COMMIT');
          console.log(`   ✅ Migrated ${migratedCount} payment records\n`);
          
        } catch (error) {
          await targetClient.query('ROLLBACK');
          throw error;
        } finally {
          targetClient.release();
        }
      }
    }

    // Migrate payment_status_log table
    if (sourceTables.includes('payment_status_log') && targetTables.includes('payment_status_log')) {
      console.log('📋 Migrating payment_status_log...');
      
      // Get data from source
      const logsResult = await sourcePool.query(`
        SELECT psl.*, pp_target.id as target_payment_id 
        FROM payment_status_log psl
        JOIN policy_payments pp_source ON psl.payment_id = pp_source.id
        JOIN policy_payments pp_target ON pp_source.payment_reference = pp_target.payment_reference
        WHERE pp_target.payment_reference IS NOT NULL
        ORDER BY psl.id
      `);
      
      console.log(`   Source log records: ${logsResult.rows.length}`);

      if (logsResult.rows.length > 0) {
        const targetClient = await targetPool.connect();
        
        try {
          await targetClient.query('BEGIN');
          
          let migratedLogCount = 0;
          for (const log of logsResult.rows) {
            // Check if log entry already exists
            const existingLogResult = await targetClient.query(`
              SELECT id FROM payment_status_log 
              WHERE payment_id = $1 AND changed_at = $2 AND old_status = $3 AND new_status = $4
            `, [log.target_payment_id, log.changed_at, log.old_status, log.new_status]);
            
            if (existingLogResult.rows.length === 0) {
              await targetClient.query(`
                INSERT INTO payment_status_log (
                  payment_id, old_status, new_status, change_reason,
                  changed_by, changed_at, additional_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [
                log.target_payment_id, log.old_status, log.new_status,
                log.change_reason, log.changed_by, log.changed_at, log.additional_data
              ]);
              
              migratedLogCount++;
            }
          }
          
          await targetClient.query('COMMIT');
          console.log(`   ✅ Migrated ${migratedLogCount} log records\n`);
          
        } catch (error) {
          await targetClient.query('ROLLBACK');
          throw error;
        } finally {
          targetClient.release();
        }
      }
    }

    // Show summary
    console.log('📊 MIGRATION SUMMARY');
    console.log('===================');
    
    const finalStatsResult = await targetPool.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) as successful_payments,
        SUM(amount) as total_amount,
        COUNT(DISTINCT currency) as currencies
      FROM policy_payments
    `);
    
    const stats = finalStatsResult.rows[0];
    console.log(`✅ Total payments in FCB database: ${stats.total_payments}`);
    console.log(`✅ Successful payments: ${stats.successful_payments}`);
    console.log(`✅ Total amount: $${parseFloat(stats.total_amount || 0).toFixed(2)}`);
    console.log(`✅ Currencies: ${stats.currencies}`);

    const logStatsResult = await targetPool.query('SELECT COUNT(*) as total_logs FROM payment_status_log');
    console.log(`✅ Total log entries: ${logStatsResult.rows[0].total_logs}\n`);

    console.log('🎉 Migration completed successfully!');
    console.log('💡 You can now safely remove the old fcb database or keep it as backup');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run migration
migratePaymentData().then(() => {
  console.log('🏁 Migration script completed');
}).catch(error => {
  console.error('💥 Migration script failed:', error.message);
  process.exit(1);
});