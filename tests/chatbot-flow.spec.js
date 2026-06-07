const { test, expect } = require('@playwright/test');

/**
 * This test verifies the complete end-to-end flow of the FM Assist chatbot.
 * It uses a local test server to host the chatbot and the API.
 * Note: Updated for Metadata-Driven V3 Sequential Flow.
 */
test('Chatbot full diagnostic flow V3', async ({ page }) => {
  // 1. Open the main page (Assuming the server is running on port 3000)
  await page.goto('http://localhost:3000');

  // 2. Open the chatbot launcher
  await page.click('.fm-launcher');

  // 3. Switch to the iframe
  const iframe = page.frameLocator('#fm-iframe');

  // Wait for the bot's initial greeting
  await expect(iframe.locator('.fm-msg.bot').first()).toContainText("Good day!");

  // 4. Start the fault logging flow
  await iframe.locator('button:has-text("Log fault")').click();

  // Phase 1: Identification
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Store Code');
  await iframe.locator('#fm-input').fill('1002');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('full name');
  await iframe.locator('#fm-input').fill('Test User');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('equipment category');
  await iframe.locator('#fm-input').fill('1'); // Refrigeration
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('specific equipment');
  await iframe.locator('#fm-input').fill('1'); // Upright Fridge
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Where exactly');
  await iframe.locator('#fm-input').fill('Aisle 1');
  await iframe.locator('#fm-send-btn').click();

  // Phase 2: Safety
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('safety risks');
  await iframe.locator('#fm-input').fill('None');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('emergency condition');
  await iframe.locator('#fm-input').fill('1'); // None
  await iframe.locator('#fm-send-btn').click();

  // Phase 3: Asset Details
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Brand');
  await iframe.locator('#fm-input').fill('N/A');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Model');
  await iframe.locator('#fm-input').fill('N/A');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Asset Tag');
  await iframe.locator('#fm-input').fill('N/A');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Serial Number');
  await iframe.locator('#fm-input').fill('N/A');
  await iframe.locator('#fm-send-btn').click();

  // Phase 4: Electrical
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('power to the controller');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  // Phase 5: Symptoms
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('primary symptom');
  await iframe.locator('#fm-input').fill('1'); // Not Cooling
  await iframe.locator('#fm-send-btn').click();

  // Phase 6: Diagnostic (Refrigeration Upright)
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('temperature reading');
  await iframe.locator('#fm-input').fill('10');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('display on');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('active alarms');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('compressor running');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('airflow');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('fans spinning');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('defrost cycle');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('door seals');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('condenser coil');
  await iframe.locator('#fm-input').fill('1'); // Yes
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('liquid or oil');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('at risk of spoilage');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  // Phase 7: Food Safety
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('cold chain');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('safe storage temperature');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('risk of contamination');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('production stopped');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('stock at risk');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  // Phase 8: Impact
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('operational impact');
  await iframe.locator('#fm-input').fill('1'); // No Impact
  await iframe.locator('#fm-send-btn').click();

  // Phase 9: Media
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('photo');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  // Phase 10: Confirmation
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('FM FAULT REPORT #V3');
  await iframe.locator('#fm-input').fill('YES');
  await iframe.locator('#fm-send-btn').click();

  // Completion
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Submitted successfully');
});
