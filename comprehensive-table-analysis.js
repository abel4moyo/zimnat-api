// comprehensive-table-analysis.js - Analyze ALL FCB tables and generate fixes
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'FCBDatabase'
});

async function analyzeAllFCBTables() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 COMPREHENSIVE FCB TABLES ANALYSIS');
    console.log('=====================================\n');
    
    // Get all FCB tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'fcb_%'
      ORDER BY table_name;
    `);
    
    const fcbTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('📋 FCB Tables Found:');
    console.log('====================');
    fcbTables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });
    
    console.log('\n📊 DETAILED TABLE STRUCTURES:');
    console.log('==============================\n');
    
    const tableStructures = {};
    
    // Analyze each table
    for (const tableName of fcbTables) {
      console.log(`📊 ${tableName.toUpperCase()}`);
      console.log('='.repeat(tableName.length + 4));
      
      // Get column structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);
      
      const columns = columnsResult.rows;
      tableStructures[tableName] = columns;
      
      // Display columns
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT: ${col.column_default}` : '';
        console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${nullable}${defaultVal}`);
      });
      
      // Get sample data count
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`  📊 Total records: ${countResult.rows[0].count}`);
        
        if (parseInt(countResult.rows[0].count) > 0) {
          const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 1`);
          if (sampleResult.rows.length > 0) {
            console.log('  📄 Sample record:');
            const sample = sampleResult.rows[0];
            Object.keys(sample).slice(0, 5).forEach(key => {
              const value = typeof sample[key] === 'string' && sample[key].length > 30 
                ? sample[key].substring(0, 30) + '...' 
                : sample[key];
              console.log(`    ${key}: ${value}`);
            });
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Could not access data: ${error.message}`);
      }
      
      console.log('');
    }
    
    // Analyze relationships
    console.log('🔗 TABLE RELATIONSHIPS ANALYSIS:');
    console.log('=================================\n');
    
    const relationships = analyzeRelationships(tableStructures);
    relationships.forEach(rel => {
      console.log(`${rel.from_table}.${rel.from_column} → ${rel.to_table}.${rel.to_column}`);
    });
    
    // Generate model templates
    console.log('\n🏗️  GENERATING MODEL TEMPLATES:');
    console.log('===============================\n');
    
    for (const tableName of fcbTables) {
      const modelName = generateModelName(tableName);
      const modelCode = generateModelTemplate(tableName, tableStructures[tableName]);
      
      console.log(`📄 Generated: ${modelName}.js`);
      
      // Save to file
      const modelsDir = path.join(__dirname, 'src', 'models', 'generated');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      
      const filePath = path.join(modelsDir, `${modelName}.js`);
      fs.writeFileSync(filePath, modelCode);
    }
    
    // Generate master model index
    const indexCode = generateMasterIndex(fcbTables);
    const indexPath = path.join(__dirname, 'src', 'models', 'generated', 'index.js');
    fs.writeFileSync(indexPath, indexCode);
    
    console.log('\n✅ All models generated in src/models/generated/');
    
    // Generate table mapping
    console.log('\n📋 TABLE MAPPING REFERENCE:');
    console.log('============================');
    
    const mapping = generateTableMapping(tableStructures);
    console.log(mapping);
    
    // Save mapping to file
    const mappingPath = path.join(__dirname, 'FCB_TABLE_MAPPING.md');
    fs.writeFileSync(mappingPath, mapping);
    console.log(`\n📄 Table mapping saved to: FCB_TABLE_MAPPING.md`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

function analyzeRelationships(tableStructures) {
  const relationships = [];
  
  for (const [tableName, columns] of Object.entries(tableStructures)) {
    columns.forEach(column => {
      // Look for foreign key patterns
      if (column.column_name.endsWith('_id') && column.column_name !== 'id') {
        const referencedTable = column.column_name.replace('_id', '');
        const fcbReferencedTable = `fcb_${referencedTable}`;
        
        if (tableStructures[fcbReferencedTable] || tableStructures[referencedTable]) {
          relationships.push({
            from_table: tableName,
            from_column: column.column_name,
            to_table: tableStructures[fcbReferencedTable] ? fcbReferencedTable : referencedTable,
            to_column: 'id'
          });
        }
      }
    });
  }
  
  return relationships;
}

function generateModelName(tableName) {
  // Convert fcb_partners -> PartnerModel
  // Convert fcb_payment_transactions -> PaymentTransactionModel
  const withoutPrefix = tableName.replace('fcb_', '');
  const words = withoutPrefix.split('_');
  const pascalCase = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  return `${pascalCase}Model`;
}

function generateModelTemplate(tableName, columns) {
  const modelName = generateModelName(tableName);
  const withoutPrefix = tableName.replace('fcb_', '');
  
  const columnNames = columns.map(col => col.column_name);
  const hasId = columnNames.includes('id');
  const hasCreatedAt = columnNames.includes('created_at');
  const hasUpdatedAt = columnNames.includes('updated_at');
  const hasIsActive = columnNames.includes('is_active');
  
  return `// src/models/generated/${modelName}.js - Auto-generated model for ${tableName}
const logger = require('../../utils/logger');

// Try to load database pool
let pool;
try {
  const db = require('../../db');
  pool = db.pool;
} catch (error) {
  console.warn('Database not available for ${modelName}');
}

class ${modelName} {
  
  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Array} Array of records
   */
  static async findAll(options = {}) {
    if (!pool) {
      logger.warn('Database not available for ${modelName}.findAll');
      return [];
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM ${tableName}';
      const conditions = [];
      const values = [];
      
      ${hasIsActive ? `
      // Filter by active status if not specified otherwise
      if (options.includeInactive !== true) {
        conditions.push('is_active = $' + (values.length + 1));
        values.push(true);
      }` : ''}
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      ${hasCreatedAt ? "query += ' ORDER BY created_at DESC';" : "query += ' ORDER BY id DESC';"}
      
      if (options.limit) {
        query += ' LIMIT $' + (values.length + 1);
        values.push(options.limit);
      }
      
      const result = await client.query(query, values);
      
      logger.debug('${modelName}.findAll', { 
        count: result.rows.length,
        options 
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error in ${modelName}.findAll', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  ${hasId ? `
  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Object|null} Record object or null
   */
  static async findById(id) {
    if (!pool) {
      return null;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ${tableName} WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } catch (error) {
      logger.error('Error in ${modelName}.findById', { 
        error: error.message, 
        id 
      });
      throw error;
    } finally {
      client.release();
    }
  }` : ''}

  /**
   * Create new record
   * @param {Object} data - Record data
   * @returns {Object} Created record
   */
  static async create(data) {
    if (!pool) {
      throw new Error('Database not available for ${modelName}.create');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ');
      
      const query = \`
        INSERT INTO ${tableName} (\${fields.join(', ')})
        VALUES (\${placeholders})
        RETURNING *
      \`;
      
      const result = await client.query(query, values);
      
      logger.info('${modelName}.create', { 
        ${hasId ? 'id: result.rows[0].id,' : ''}
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in ${modelName}.create', { 
        error: error.message,
        data 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  ${hasId ? `
  /**
   * Update record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated record
   */
  static async update(id, data) {
    if (!pool) {
      throw new Error('Database not available for ${modelName}.update');
    }

    const client = await pool.connect();
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field, index) => 
        \`\${field} = $\${index + 1}\`
      ).join(', ');
      
      ${hasUpdatedAt ? `
      // Add updated_at timestamp
      const updateQuery = \`
        UPDATE ${tableName} 
        SET \${setClause}, updated_at = NOW()
        WHERE id = $\${values.length + 1}
        RETURNING *
      \`;` : `
      const updateQuery = \`
        UPDATE ${tableName} 
        SET \${setClause}
        WHERE id = $\${values.length + 1}
        RETURNING *
      \`;`}
      
      const result = await client.query(updateQuery, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error(\`${withoutPrefix} with ID \${id} not found\`);
      }
      
      logger.info('${modelName}.update', { 
        id,
        fields: fields.length 
      });
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error in ${modelName}.update', { 
        error: error.message,
        id,
        data 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete record by ID
   * @param {number} id - Record ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    if (!pool) {
      throw new Error('Database not available for ${modelName}.delete');
    }

    const client = await pool.connect();
    try {
      ${hasIsActive ? `
      // Soft delete - set is_active to false
      const result = await client.query(
        'UPDATE ${tableName} SET is_active = false WHERE id = $1 RETURNING id',
        [id]
      );` : `
      // Hard delete
      const result = await client.query(
        'DELETE FROM ${tableName} WHERE id = $1 RETURNING id',
        [id]
      );`}
      
      if (result.rows.length === 0) {
        throw new Error(\`${withoutPrefix} with ID \${id} not found\`);
      }
      
      logger.info('${modelName}.delete', { id });
      
      return true;
      
    } catch (error) {
      logger.error('Error in ${modelName}.delete', { 
        error: error.message,
        id 
      });
      throw error;
    } finally {
      client.release();
    }
  }` : ''}

  /**
   * Count records
   * @param {Object} conditions - Query conditions
   * @returns {number} Record count
   */
  static async count(conditions = {}) {
    if (!pool) {
      return 0;
    }

    const client = await pool.connect();
    try {
      let query = 'SELECT COUNT(*) FROM ${tableName}';
      const whereConditions = [];
      const values = [];
      
      ${hasIsActive ? `
      if (conditions.includeInactive !== true) {
        whereConditions.push('is_active = $' + (values.length + 1));
        values.push(true);
      }` : ''}
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await client.query(query, values);
      
      return parseInt(result.rows[0].count);
      
    } catch (error) {
      logger.error('Error in ${modelName}.count', { 
        error: error.message,
        conditions 
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ${modelName};
`;
}

function generateMasterIndex(fcbTables) {
  const imports = fcbTables.map(tableName => {
    const modelName = generateModelName(tableName);
    return `const ${modelName} = require('./${modelName}');`;
  }).join('\n');
  
  const exports = fcbTables.map(tableName => {
    const modelName = generateModelName(tableName);
    const exportName = modelName.replace('Model', '');
    return `  ${exportName}: ${modelName},`;
  }).join('\n');
  
  return `// src/models/generated/index.js - Auto-generated model index
${imports}

module.exports = {
${exports}
};

// Usage examples:
// const { Partner, Product, Policy } = require('./models/generated');
// const partners = await Partner.findAll();
// const partner = await Partner.findById(1);
`;
}

function generateTableMapping(tableStructures) {
  let mapping = `# FCB Database Table Mapping Reference

Generated: ${new Date().toISOString()}

## Table Overview

| Table Name | Purpose | Records | Key Columns |
|------------|---------|---------|-------------|
`;

  for (const [tableName, columns] of Object.entries(tableStructures)) {
    const purpose = guessPurpose(tableName);
    const keyColumns = columns
      .filter(col => ['id', 'code', 'name', 'type'].some(key => col.column_name.includes(key)))
      .map(col => col.column_name)
      .slice(0, 3)
      .join(', ');
    
    mapping += `| ${tableName} | ${purpose} | - | ${keyColumns} |\n`;
  }

  mapping += `\n## Detailed Column Information\n\n`;

  for (const [tableName, columns] of Object.entries(tableStructures)) {
    mapping += `### ${tableName}\n\n`;
    mapping += `| Column | Type | Nullable | Default |\n`;
    mapping += `|--------|------|----------|----------|\n`;
    
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'Yes' : 'No';
      const defaultVal = col.column_default || '-';
      mapping += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${defaultVal} |\n`;
    });
    
    mapping += `\n`;
  }

  return mapping;
}

function guessPurpose(tableName) {
  const purposeMap = {
    'fcb_partners': 'Partner/client management',
    'fcb_products': 'Insurance products catalog',
    'fcb_packages': 'Insurance packages/plans',
    'fcb_policies': 'Policy management',
    'fcb_quotes': 'Quote generation',
    'fcb_payment_transactions': 'Payment processing',
    'fcb_package_benefits': 'Package benefits definition',
    'fcb_package_limits': 'Package coverage limits',
    'fcb_rating_factors': 'Premium calculation factors'
  };
  
  return purposeMap[tableName] || 'Data storage';
}

// Run the analysis
analyzeAllFCBTables();