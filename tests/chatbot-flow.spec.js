const { test, expect } = require('@playwright/test');

/**
 * This test verifies the complete end-to-end flow of the FM Assist chatbot.
 * It uses a local test server to host the chatbot and the API.
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
  await iframe.locator('#fm-input').fill('1'); // Refrigeration — Upright fridge
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Where exactly');
  await iframe.locator('#fm-input').fill('Aisle 1');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Equipment name');
  await iframe.locator('#fm-input').fill('Display Fridge A1');
  await iframe.locator('#fm-send-btn').click();

  // Phase 2: Power Check
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('Is there power');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  // Phase 3: Universal Engine
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('required supplies');
  await iframe.locator('#fm-input').fill('1'); // All confirmed
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('safety conditions');
  await iframe.locator('#fm-input').fill('1'); // All correct
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('failing to do');
  await iframe.locator('#fm-input').fill('1'); // Cooling
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('following present');
  await iframe.locator('#fm-input').fill('1'); // None
  await iframe.locator('#fm-send-btn').click();

  // Phase 4: Category Diagnostic (Upright Fridge)
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('temperature reading');
  await iframe.locator('#fm-input').fill('10');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('airflow blowing');
  await iframe.locator('#fm-input').fill('Yes');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('base fans');
  await iframe.locator('#fm-input').fill('All');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('stagnant water');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('visible damage');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  // Test branching: Reply NO to AHT Freor should skip the next question
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('AHT Freor unit');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  // Phase 5: Media & Priority
  // This should be the photo question if skip worked
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('take a photo');
  await iframe.locator('#fm-input').fill('No');
  await iframe.locator('#fm-send-btn').click();

  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('How urgent');
  await iframe.locator('#fm-input').fill('4'); // Routine
  await iframe.locator('#fm-send-btn').click();

  // Phase 6: Report Confirmation
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('FM FAULT REPORT');
  await iframe.locator('#fm-input').fill('YES');
  await iframe.locator('#fm-send-btn').click();

  // Completion
  await expect(iframe.locator('.fm-msg.bot').last()).toContainText('submitted successfully');
});
