#!/usr/bin/env node

/**
 * validate-configs.js
 * 
 * Validates Clay HTTP API configs against the JobsPipe OpenAPI spec.
 * Ensures endpoints, methods, and field references are correct.
 * 
 * Usage: node validate-configs.js
 * 
 * No API key needed—this validates against the spec, not live data.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAPI_SPEC_URL = 'https://jobspipe.dev/openapi.json';
const CONFIGS_DIR = path.join(__dirname, 'clay-configs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Fetch the OpenAPI spec from jobspipe.dev
 */
async function fetchOpenAPISpec() {
  return new Promise((resolve, reject) => {
    https.get(OPENAPI_SPEC_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const spec = JSON.parse(data);
          resolve(spec);
        } catch (error) {
          reject(new Error(`Failed to parse OpenAPI spec: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch OpenAPI spec: ${error.message}`));
    });
  });
}

/**
 * Load all JSON config files from clay-configs/
 */
function loadConfigs() {
  const files = fs.readdirSync(CONFIGS_DIR);
  const configs = [];
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(CONFIGS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(content);
      configs.push({ file, config });
    } catch (error) {
      log(`⚠️  Failed to load ${file}: ${error.message}`, 'yellow');
    }
  }
  
  return configs;
}

/**
 * Extract path and query params from URL
 */
function parseURL(url) {
  try {
    // Don't use URL constructor if URL contains unencoded path params
    if (url.includes('{') && url.includes('}')) {
      const match = url.match(/^(https?:\/\/[^\/]+)(\/.*)/);
      if (match) {
        return { path: match[2], baseUrl: match[1] };
      }
    }
    
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Decode URL-encoded path params back to {param} format
    path = decodeURIComponent(path);
    
    return { path, baseUrl: urlObj.origin };
  } catch (error) {
    return null;
  }
}

/**
 * Find the OpenAPI operation for a given path and method
 */
function findOperation(spec, configPath, method) {
  // Remove base URL if present
  let path = configPath.replace('https://api.jobspipe.dev', '');
  
  // Replace Clay template variables with OpenAPI path params
  // e.g., /v1/companies/{{company_domain}} -> /v1/companies/{key}
  path = path.replace(/\{\{[^}]+\}\}/g, (match) => {
    // Try to match common patterns
    if (match.includes('domain') || match.includes('key')) {
      return '{key}';
    }
    return '{id}';
  });
  
  const paths = spec.paths || {};
  const pathItem = paths[path];
  
  if (!pathItem) {
    return { found: false, path };
  }
  
  const operation = pathItem[method.toLowerCase()];
  
  if (!operation) {
    return { found: true, path, operation: null, availableMethods: Object.keys(pathItem) };
  }
  
  return { found: true, path, operation };
}

/**
 * Validate a single config against the spec
 */
function validateConfig(file, config, spec) {
  const issues = [];
  const warnings = [];
  
  // 1. Check required fields
  if (!config.method) {
    issues.push('Missing "method" field');
  }
  
  if (!config.url) {
    issues.push('Missing "url" field');
  }
  
  if (!config.headers || !config.headers.Authorization) {
    issues.push('Missing "Authorization" header');
  }
  
  // 2. Validate endpoint exists in spec
  if (config.url && config.method) {
    const parsed = parseURL(config.url);
    
    if (!parsed) {
      issues.push(`Invalid URL format: ${config.url}`);
    } else {
      const result = findOperation(spec, parsed.path, config.method);
      
      if (!result.found) {
        issues.push(`Endpoint not found in OpenAPI spec: ${config.method} ${result.path}`);
      } else if (!result.operation) {
        issues.push(
          `Method ${config.method} not allowed for ${result.path}. ` +
          `Available methods: ${result.availableMethods.join(', ')}`
        );
      } else {
        // Endpoint exists, validate further
        
        // Check if request body is expected
        if (config.body && !result.operation.requestBody) {
          warnings.push('Config includes request body but endpoint does not expect one');
        }
        
        if (!config.body && result.operation.requestBody && result.operation.requestBody.required) {
          warnings.push('Endpoint expects a request body but config does not include one');
        }
      }
    }
  }
  
  // 3. Validate body fields (basic check)
  if (config.body && typeof config.body === 'object') {
    // Check for common typos or invalid filter names
    const knownInvalidFields = ['query']; // 'query' should be 'job_title_or'
    
    for (const key of Object.keys(config.body)) {
      if (knownInvalidFields.includes(key)) {
        warnings.push(`Field "${key}" may be invalid. Did you mean "job_title_or"?`);
      }
    }
  }
  
  // 4. Validate outputMapping paths
  if (config.outputMapping) {
    for (const [outputName, jsonPath] of Object.entries(config.outputMapping)) {
      // Basic JSONPath syntax check
      if (typeof jsonPath !== 'string') {
        warnings.push(`Output "${outputName}" has non-string JSONPath: ${jsonPath}`);
        continue;
      }
      
      // Check for common mistakes
      if (!jsonPath.startsWith('$')) {
        warnings.push(`Output "${outputName}" JSONPath should start with "$": ${jsonPath}`);
      }
      
      // Check for expressions that Clay might not support
      if (jsonPath.includes(' > ') && !jsonPath.startsWith('$.metadata.total_results')) {
        warnings.push(`Output "${outputName}" contains expression that may not work in Clay: ${jsonPath}`);
      }
    }
  }
  
  return { issues, warnings };
}

/**
 * Main validation function
 */
async function main() {
  log('\n🔍 JobsPipe Clay Config Validator\n', 'bold');
  
  // 1. Fetch OpenAPI spec
  log('Fetching OpenAPI spec from jobspipe.dev...', 'cyan');
  let spec;
  try {
    spec = await fetchOpenAPISpec();
    log(`✓ Loaded OpenAPI spec (version ${spec.info.version})\n`, 'green');
  } catch (error) {
    log(`✗ ${error.message}`, 'red');
    process.exit(1);
  }
  
  // 2. Load configs
  log('Loading Clay configs...', 'cyan');
  const configs = loadConfigs();
  
  if (configs.length === 0) {
    log('✗ No config files found in clay-configs/', 'red');
    process.exit(1);
  }
  
  log(`✓ Loaded ${configs.length} config(s)\n`, 'green');
  
  // 3. Validate each config
  let totalIssues = 0;
  let totalWarnings = 0;
  
  for (const { file, config } of configs) {
    log(`Validating ${file}...`, 'cyan');
    
    const { issues, warnings } = validateConfig(file, config, spec);
    
    if (issues.length === 0 && warnings.length === 0) {
      log(`  ✓ Valid\n`, 'green');
      continue;
    }
    
    if (issues.length > 0) {
      log(`  ✗ ${issues.length} issue(s):`, 'red');
      issues.forEach(issue => log(`    - ${issue}`, 'red'));
      totalIssues += issues.length;
    }
    
    if (warnings.length > 0) {
      log(`  ⚠️  ${warnings.length} warning(s):`, 'yellow');
      warnings.forEach(warning => log(`    - ${warning}`, 'yellow'));
      totalWarnings += warnings.length;
    }
    
    console.log();
  }
  
  // 4. Summary
  log('─────────────────────────────────────', 'cyan');
  log('Validation Summary\n', 'bold');
  
  if (totalIssues === 0 && totalWarnings === 0) {
    log('✓ All configs are valid!', 'green');
    log('\nYou can safely import these into Clay.\n', 'cyan');
  } else {
    if (totalIssues > 0) {
      log(`✗ Found ${totalIssues} issue(s)`, 'red');
    }
    if (totalWarnings > 0) {
      log(`⚠️  Found ${totalWarnings} warning(s)`, 'yellow');
    }
    
    if (totalIssues > 0) {
      log('\nFix the issues above before using these configs.\n', 'red');
      process.exit(1);
    } else {
      log('\nWarnings are non-blocking but should be reviewed.\n', 'yellow');
    }
  }
}

// Run validation
main().catch(error => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
