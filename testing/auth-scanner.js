#!/usr/bin/env node

/**
 * Authentication Scanner
 * Scans the entire codebase for API calls missing authentication headers
 */

const fs = require('fs');
const path = require('path');

class AuthScanner {
    constructor() {
        this.results = {
            totalFiles: 0,
            filesWithFetch: 0,
            missingAuth: [],
            hasAuth: [],
            suspicious: []
        };
        
        this.authPatterns = [
            /getAuthHeaders/i,
            /Authorization.*Bearer/i,
            /localStorage\.getItem.*token/i,
            /headers.*Authorization/i,
            /this\.authToken/i,
            /authToken.*Bearer/i
        ];
        
        // Public read-only endpoints that don't need authentication
        this.publicEndpoints = [
            '/api/crop-knowledge/crops',
            '/api/crop-knowledge/nutrients',
            '/api/crop-knowledge/stages',
            '/api/crop-knowledge/crops/',  // with parameters
            '/api/auth/resend-verification',
            '/api/auth/forgot-password',
            '/api/auth/check-username'
        ];
        
        this.apiPatterns = [
            /fetch\s*\(\s*[`'"]\/api\//,
            /fetch\s*\(\s*[`'"][^'"`]*\/api\//,
            /fetch\s*\(\s*.*\/api\//
        ];
    }

    scanDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.scanDirectory(fullPath);
            } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
                this.scanFile(fullPath);
            }
        }
    }

    scanFile(filePath) {
        this.results.totalFiles++;
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            const apiCalls = [];
            const authUsage = [];
            
            // Find API calls
            lines.forEach((line, index) => {
                for (const pattern of this.apiPatterns) {
                    if (pattern.test(line)) {
                        apiCalls.push({
                            line: index + 1,
                            content: line.trim(),
                            context: this.getContext(lines, index)
                        });
                        break;
                    }
                }
                
                // Find auth usage
                for (const pattern of this.authPatterns) {
                    if (pattern.test(line)) {
                        authUsage.push({
                            line: index + 1,
                            content: line.trim()
                        });
                        break;
                    }
                }
            });
            
            if (apiCalls.length > 0) {
                this.results.filesWithFetch++;
                
                const fileInfo = {
                    path: filePath.replace(process.cwd(), ''),
                    apiCalls,
                    authUsage,
                    hasAuth: authUsage.length > 0
                };
                
                // Filter out public endpoints from missing auth
                const privateApiCalls = apiCalls.filter(call => !this.isPublicEndpoint(call.content));
                const publicApiCalls = apiCalls.filter(call => this.isPublicEndpoint(call.content));
                
                fileInfo.privateApiCalls = privateApiCalls.length;
                fileInfo.publicApiCalls = publicApiCalls.length;
                
                if (privateApiCalls.length === 0) {
                    // All calls are public, no auth needed
                    this.results.hasAuth.push(fileInfo);
                } else if (authUsage.length === 0) {
                    // Has private calls but no auth
                    this.results.missingAuth.push(fileInfo);
                } else if (authUsage.length < privateApiCalls.length) {
                    // Has some auth but not enough for all private calls
                    this.results.suspicious.push(fileInfo);
                } else {
                    // Has adequate auth for all private calls
                    this.results.hasAuth.push(fileInfo);
                }
            }
        } catch (error) {
            console.error(`Error scanning ${filePath}:`, error.message);
        }
    }

    isPublicEndpoint(fetchLine) {
        // Extract URL from fetch call
        const urlMatch = fetchLine.match(/fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/);
        if (!urlMatch) return false;
        
        const url = urlMatch[1];
        
        // Check if it matches any public endpoint
        return this.publicEndpoints.some(endpoint => {
            if (endpoint.endsWith('/')) {
                // For patterns like '/api/crop-knowledge/crops/' match anything starting with it
                return url.startsWith(endpoint) || url.includes(endpoint);
            }
            return url === endpoint || url.startsWith(endpoint + '?') || url.startsWith(endpoint + '/');
        });
    }

    getContext(lines, lineIndex, contextSize = 2) {
        const start = Math.max(0, lineIndex - contextSize);
        const end = Math.min(lines.length, lineIndex + contextSize + 1);
        
        return lines.slice(start, end).map((line, idx) => ({
            lineNum: start + idx + 1,
            content: line,
            isTarget: start + idx === lineIndex
        }));
    }

    generateReport() {
        console.log('\n🔍 AUTHENTICATION SCAN RESULTS');
        console.log('================================');
        console.log(`📁 Total files scanned: ${this.results.totalFiles}`);
        console.log(`🌐 Files with API calls: ${this.results.filesWithFetch}`);
        console.log(`❌ Missing authentication: ${this.results.missingAuth.length}`);
        console.log(`⚠️  Suspicious (partial auth): ${this.results.suspicious.length}`);
        console.log(`✅ Has authentication: ${this.results.hasAuth.length}`);

        if (this.results.missingAuth.length > 0) {
            console.log('\n❌ FILES MISSING AUTHENTICATION:');
            console.log('================================');
            
            this.results.missingAuth.forEach(file => {
                console.log(`\n📄 ${file.path}`);
                file.apiCalls.forEach(call => {
                    console.log(`   Line ${call.line}: ${call.content}`);
                });
            });
        }

        if (this.results.suspicious.length > 0) {
            console.log('\n⚠️  SUSPICIOUS FILES (Partial Auth):');
            console.log('===================================');
            
            this.results.suspicious.forEach(file => {
                console.log(`\n📄 ${file.path}`);
                console.log(`   API calls: ${file.apiCalls.length}, Auth usage: ${file.authUsage.length}`);
                file.apiCalls.forEach(call => {
                    console.log(`   Line ${call.line}: ${call.content}`);
                });
            });
        }

        console.log('\n✅ FILES WITH PROPER AUTH:');
        console.log('==========================');
        this.results.hasAuth.forEach(file => {
            console.log(`✓ ${file.path} (${file.apiCalls.length} API calls, ${file.authUsage.length} auth)`);
        });

        return this.results;
    }

    generateFixSuggestions() {
        console.log('\n🔧 FIX SUGGESTIONS:');
        console.log('===================');
        
        this.results.missingAuth.forEach(file => {
            console.log(`\n📄 ${file.path}:`);
            console.log('   1. Add auth header helper function:');
            console.log('      function getAuthHeaders(includeContentType = true) {');
            console.log('          const headers = {};');
            console.log('          const token = localStorage.getItem("auth_token");');
            console.log('          if (includeContentType) headers["Content-Type"] = "application/json";');
            console.log('          if (token) headers["Authorization"] = `Bearer ${token}`;');
            console.log('          return headers;');
            console.log('      }');
            console.log('   2. Update fetch calls to use: { headers: getAuthHeaders() }');
        });
    }
}

// Run the scanner
const scanner = new AuthScanner();

// Scan the main directories
const dirsToScan = [
    './public/js/modules/api',
    './public/js/modules/components',
    './public/js/modules/services',
    './script.js'
];

dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
        if (fs.statSync(dir).isDirectory()) {
            scanner.scanDirectory(dir);
        } else {
            scanner.scanFile(dir);
        }
    }
});

const results = scanner.generateReport();
scanner.generateFixSuggestions();

// Exit with error code if issues found
if (results.missingAuth.length > 0 || results.suspicious.length > 0) {
    console.log('\n💥 AUTHENTICATION ISSUES DETECTED!');
    console.log('Please fix the missing authentication before deployment.');
    process.exit(1);
} else {
    console.log('\n🎉 All API calls have proper authentication!');
    process.exit(0);
}