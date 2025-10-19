/**
 * ===================================================================
 * RSA Key Pair Generator for ZIMNAT API v2.1
 * File: scripts/generate-rsa-keys.js
 * ===================================================================
 *
 * Run this script once to generate RSA key pair for JWT RS256 signing
 * Usage: node scripts/generate-rsa-keys.js
 */

const JWTService = require('../src/services/jwtService');
const logger = require('../src/utils/logger');

async function generateKeys() {
  try {
    console.log('🔑 Generating RSA key pair for JWT RS256...\n');

    const result = await JWTService.generateKeyPair();

    console.log('✅ RSA key pair generated successfully!\n');
    console.log('📁 Private Key:', result.privateKeyPath);
    console.log('📁 Public Key:', result.publicKeyPath);
    console.log('\n⚠️  IMPORTANT: Keep your private key secure and never commit it to version control!');
    console.log('📝 Add config/keys/ to your .gitignore file\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to generate RSA keys:', error.message);
    logger.error('RSA key generation failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

generateKeys();
