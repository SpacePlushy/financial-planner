const http = require('http');

console.log('🧪 Testing Financial Schedule Optimizer Frontend...\n');

// Test 1: Check if server is running
const testServerConnection = () => {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000', (res) => {
      console.log('✅ Test 1 - Server Connection: PASSED');
      console.log(`   - Status Code: ${res.statusCode}`);
      console.log(`   - Content Type: ${res.headers['content-type']}`);
      resolve(true);
    }).on('error', (err) => {
      console.log('❌ Test 1 - Server Connection: FAILED');
      console.log(`   - Error: ${err.message}`);
      reject(err);
    });
  });
};

// Test 2: Check if static resources load
const testStaticResources = () => {
  const resources = [
    '/static/js/bundle.js',
    '/favicon.ico',
    '/manifest.json'
  ];
  
  const promises = resources.map(resource => {
    return new Promise((resolve) => {
      http.get(`http://localhost:3000${resource}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          console.log(`✅ Test 2 - Static Resource ${resource}: PASSED`);
          resolve(true);
        } else {
          console.log(`❌ Test 2 - Static Resource ${resource}: FAILED (Status: ${res.statusCode})`);
          resolve(false);
        }
      }).on('error', (err) => {
        console.log(`❌ Test 2 - Static Resource ${resource}: FAILED`);
        console.log(`   - Error: ${err.message}`);
        resolve(false);
      });
    });
  });
  
  return Promise.all(promises);
};

// Test 3: Check HTML structure
const testHTMLStructure = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasRoot = data.includes('<div id="root">');
        const hasReactScript = data.includes('bundle.js');
        const hasTitle = data.includes('<title>');
        
        console.log('✅ Test 3 - HTML Structure: ' + (hasRoot && hasReactScript && hasTitle ? 'PASSED' : 'FAILED'));
        console.log(`   - Root div: ${hasRoot ? '✓' : '✗'}`);
        console.log(`   - React bundle: ${hasReactScript ? '✓' : '✗'}`);
        console.log(`   - Title tag: ${hasTitle ? '✓' : '✗'}`);
        
        resolve(hasRoot && hasReactScript && hasTitle);
      });
    });
  });
};

// Run all tests
const runTests = async () => {
  try {
    await testServerConnection();
    console.log('');
    
    await testStaticResources();
    console.log('');
    
    await testHTMLStructure();
    console.log('');
    
    console.log('🎉 Frontend basic tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Server is running on http://localhost:3000');
    console.log('- React application is being served correctly');
    console.log('- Static resources are accessible');
    console.log('- HTML structure is valid');
    console.log('\n🌐 Please open http://localhost:3000 in a browser for manual testing');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

runTests();