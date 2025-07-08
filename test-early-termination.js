// Test script to verify early termination is working
const fetch = require('node-fetch');

const testConfig = {
  startingBalance: 1000,
  targetEndingBalance: 2000,
  minimumBalance: 100,
  populationSize: 200,
  generations: 500,
};

const expenses = [
  { day: 1, name: 'Rent', amount: 800 },
  { day: 15, name: 'Utilities', amount: 200 },
  { day: 20, name: 'Food', amount: 300 },
];

const deposits = [
  { day: 10, amount: 500 },
  { day: 25, amount: 500 },
];

const shiftTypes = {
  large: { net: 86.5, gross: 94.5 },
  medium: { net: 67.5, gross: 75.5 },
  small: { net: 56.0, gross: 64.0 },
};

async function testOptimization() {
  console.log('Testing server-side optimization with early termination...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: testConfig,
        expenses,
        deposits,
        shiftTypes,
      }),
    });

    const data = await response.json();
    const endTime = Date.now();

    if (data.success) {
      console.log('\n✅ Optimization successful!');
      console.log(`Total time: ${data.performanceMetrics.totalTime}ms`);
      console.log(`Server region: ${data.performanceMetrics.serverRegion}`);
      console.log(`Final balance: $${data.result.finalBalance}`);
      console.log(`Work days: ${data.result.workDays.length}`);
      console.log(`Violations: ${data.result.violations}`);
      console.log('\nCheck server logs for early termination message.');
    } else {
      console.error('❌ Optimization failed:', data.error);
    }

    console.log(`\nClient-side request took: ${endTime - startTime}ms`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testOptimization();