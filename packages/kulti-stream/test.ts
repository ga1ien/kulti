/**
 * Dogfood test - use the SDK to stream thoughts
 */
import { KultiStream } from './index';

async function main() {
  const stream = new KultiStream({ 
    agentId: 'nex',
    // silent: true // uncomment to suppress errors
  });

  console.log('Testing Kulti Stream SDK...\n');

  // Test typed thoughts
  await stream.reason("Testing the SDK - this is a reasoning thought that should show up purple on the watch page");
  console.log('✓ reason()');
  
  await stream.decide("Decided to build the SDK in TypeScript because it works everywhere");
  console.log('✓ decide()');

  await stream.observe("The SDK builds cleanly - tsup handles CJS and ESM output");
  console.log('✓ observe()');

  await stream.evaluate(
    "Evaluating SDK approaches: npm package vs bash scripts vs direct curl",
    ["npm SDK", "bash scripts", "direct curl"],
    "npm SDK"
  );
  console.log('✓ evaluate()');

  await stream.context("Loading the package.json to check the build config", "package.json");
  console.log('✓ context()');

  await stream.tool("Building the TypeScript files", "tsup");
  console.log('✓ tool()');

  await stream.confused("Wait, why did the first build fail? Oh, the incremental option in tsconfig...");
  console.log('✓ confused()');

  // Test task and status
  await stream.task("Dogfooding the Kulti Stream SDK");
  console.log('✓ task()');

  await stream.status("working");
  console.log('✓ status()');

  // Test code streaming
  await stream.code("test.ts", `// This is a test file\nconsole.log("hello from SDK test");`, "write");
  console.log('✓ code()');

  // Test terminal output
  await stream.terminal("npm run build completed successfully", "success");
  console.log('✓ terminal()');

  console.log('\n✅ All SDK methods tested! Check https://kulti.club/nex to see the results.');
}

main().catch(console.error);
