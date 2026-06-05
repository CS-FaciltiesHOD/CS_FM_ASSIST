const { test, expect } = require('@playwright/test');

/**
 * This test verifies the complete end-to-end flow of the FM Assist chatbot.
 * It uses a local test server to host the chatbot and the API.
 * Note: Sequential flow updated to V2 1-by-1 logic.
 */
test('Chatbot full diagnostic flow', async ({ page }) => {
  // 1. Open the main page (Assuming the server is running on port 3000)
  await page.goto('http://localhost:3000');

  // 2. Open the chatbot launcher
  await page.click('.fm-launcher');

  // 3. Switch to the iframe
  const iframe = page.frameLocator('#fm-iframe');

  // Wait for the bot's initial greeting
  await expect(iframe.locator('.fm-msg.bot').first()).toContainText("Good day! I'm FM Assist");

  // 4. Start the fault logging flow
  await iframe.locator('button:has-text("Log fault")').click();

  // Phase 1: Identification
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('store or branch name');
  await iframe.locator('#fm-input').fill('Test Store 101');
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

  // Phase 2: Power Check
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Is there power');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  // Phase 3: Universal Engine
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('safety risks');
  await iframe.locator('#fm-input').fill('No risk');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('operational impact');
  await iframe.locator('#fm-input').fill('1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('primary fault type');
  await iframe.locator('#fm-input').fill('1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('power light');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('error code');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('unusual noise');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('jam or blockage');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('visible leak');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('excess vibration');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('burning smell');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('visible damage');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  // Phase 4: Category Diagnostic (Upright Fridge)
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('temperature reading');
  await iframe.locator('#fm-input').fill('10');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('active alarm');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('airflow blowing');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('base fans');
  await iframe.locator('#fm-input').fill('1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('stagnant water');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('visible damage');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('door seals');
  await iframe.locator('#fm-input').fill('1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('product temperature');
  await iframe.locator('#fm-input').fill('1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('AHT Freor unit');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  // Phase 5: Food Safety
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('cold chain');
  await iframe.locator('#fm-input').fill('2'); // No
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('safe storage temperature');
  await iframe.locator('#fm-input').fill('2');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('contamination');
  await iframe.locator('#fm-input').fill('2');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('production stopped');
  await iframe.locator('#fm-input').fill('2');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('stock at risk');
  await iframe.locator('#fm-input').fill('2');
  await iframe.locator('#fm-send-btn').click();

  // Phase 6: Media & Priority
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('photo/video');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Calculated Priority');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  // Phase 7: Report Confirmation
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('FM FAULT REPORT');
  await iframe.locator('#fm-input').fill('YES');
  await iframe.locator('#fm-send-btn').click();

  // Completion
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('submitted successfully');
});
