const crypto = require('crypto');

// Generate encryption key from environment - REQUIRED in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key is present and secure
if (!ENCRYPTION_KEY) {
    console.error('❌ CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is required');
    console.error('   Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

if (ENCRYPTION_KEY.length < 32) {
    console.error('❌ CRITICAL SECURITY ERROR: ENCRYPTION_KEY must be at least 32 characters');
    console.error('   Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

if (ENCRYPTION_KEY === 'afraponix-default-key-change-in-production-32' || 
    ENCRYPTION_KEY.includes('default') || 
    ENCRYPTION_KEY.includes('change')) {
    console.error('❌ CRITICAL SECURITY ERROR: Default encryption key detected - use a secure random key');
    console.error('   Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}
const ALGORITHM = 'aes-256-cbc';

// Ensure key is exactly 32 bytes for AES-256
function getKey() {
    const key = ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
    return Buffer.from(key, 'utf8');
}

class CredentialEncryption {
    static encrypt(text) {
        if (!text) return null;
        
        try {
            const key = getKey();
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Return IV + encrypted data as base64
            return Buffer.from(iv.toString('hex') + ':' + encrypted).toString('base64');
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt credential');
        }
    }
    
    static decrypt(encryptedData) {
        if (!encryptedData) return null;
        
        try {
            // Decode from base64 and split IV from data
            const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
            const [ivHex, encrypted] = decoded.split(':');
            
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted data format');
            }
            
            const key = getKey();
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt credential');
        }
    }
    
    static generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = { CredentialEncryption };