const { getLogicResponse } = require('./api/logic-engine');

async function runTest() {
  const session = { state: null, data: {} };

  const steps = [
    { input: "log a fault", expected: "store" },
    { input: "Test Store", expected: "full name" },
    { input: "John", expected: "category" },
    { input: "1", expected: "specific equipment" },
    { input: "1", expected: "Where exactly" },
    { input: "Aisle 1", expected: "Brand" },
    { input: "N/A", expected: "Model" },
    { input: "N/A", expected: "Asset Tag" },
    { input: "N/A", expected: "Serial Number" },
    { input: "N/A", expected: "Is there power" },
  ];

  console.log("Quick verification of sequential flow...");

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const reply = await getLogicResponse('test-user', step.input, session);
    console.log(`Step ${i+1} | Bot: ${reply.substring(0, 50).replace(/\n/g, ' ')}...`);

    if (!reply.toLowerCase().includes(step.expected.toLowerCase())) {
      console.error(`FAILED: Expected "${step.expected}"`);
      process.exit(1);
    }
  }

  console.log("Verification successful.");
}

runTest();
