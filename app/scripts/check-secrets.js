#!/usr/bin/env node

/**
 * Simple secret scanner for pre-commit hooks
 * Detects common credential patterns in staged files
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Patterns to detect
const SECRET_PATTERNS = [
  {
    name: 'MongoDB URI with credentials',
    pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi,
    message: '🚨 MongoDB connection string with credentials detected!'
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/gi,
    message: '🚨 AWS Access Key detected!'
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key[\s]*[=:][\s]*['"][a-zA-Z0-9]{20,}['"]/gi,
    message: '🚨 API key detected!'
  },
  {
    name: 'Generic Secret',
    pattern: /secret[\s]*[=:][\s]*['"][a-zA-Z0-9]{20,}['"]/gi,
    message: '🚨 Secret detected!'
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    message: '🚨 Private key detected!'
  },
  {
    name: 'Password in code',
    pattern: /password[\s]*[=:][\s]*['"][^'"]{8,}['"]/gi,
    message: '🚨 Hardcoded password detected!'
  }
];

// Files to always skip
const SKIP_PATTERNS = [
  /\.env$/,
  /\.env\./,
  /node_modules\//,
  /package-lock\.json$/,
  /\.min\.js$/,
  /\.map$/
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    for (const { name, pattern, message } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          file: filePath,
          type: name,
          message,
          matches: matches.length
        });
      }
    }

    return findings.length > 0 ? findings : null;
  } catch {
    // File might not exist or not readable
    return null;
  }
}

function main() {
  console.log('🔒 Scanning for secrets...\n');

  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('✅ No staged files to scan');
    return;
  }

  let hasSecrets = false;
  const allFindings = [];

  for (const file of stagedFiles) {
    const findings = scanFile(file);
    if (findings) {
      hasSecrets = true;
      allFindings.push(...findings);
    }
  }

  if (hasSecrets) {
    console.error('❌ SECRETS DETECTED IN STAGED FILES!\n');
    
    for (const finding of allFindings) {
      console.error(`${finding.message}`);
      console.error(`   File: ${finding.file}`);
      console.error(`   Type: ${finding.type}`);
      console.error(`   Found: ${finding.matches} occurrence(s)\n`);
    }

    console.error('💡 To fix this:');
    console.error('   1. Remove hardcoded secrets from the files');
    console.error('   2. Use environment variables instead');
    console.error('   3. Add secrets to .env file (which is gitignored)');
    console.error('   4. Use process.env.VARIABLE_NAME in your code\n');
    
    process.exit(1);
  }

  console.log('✅ No secrets detected in staged files');
}

main();
