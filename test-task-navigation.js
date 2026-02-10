const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial page
    await page.screenshot({ path: '.playwright-mcp/step1-initial-page.png', fullPage: true });
    console.log('Screenshot saved: step1-initial-page.png');

    // Check if login page exists
    const loginButton = await page.locator('button:has-text("로그인")').count();
    if (loginButton > 0) {
      console.log('Login page detected');
      await page.screenshot({ path: '.playwright-mcp/step2-login-page.png', fullPage: true });
      console.log('Screenshot saved: step2-login-page.png');
      console.log('Please log in manually, then run this script again.');
      await page.waitForTimeout(30000); // Wait 30 seconds for manual login
    }

    // Navigate to task management
    console.log('2. Looking for task management (할일 관리)...');
    const taskManagementLink = page.locator('text=할일 관리').or(page.locator('text=할일관리')).or(page.locator('text=Task'));
    if (await taskManagementLink.count() > 0) {
      await taskManagementLink.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '.playwright-mcp/step3-task-management.png', fullPage: true });
      console.log('Screenshot saved: step3-task-management.png');
    }

    // Look for the specific task
    console.log('3. Looking for task "티셔츠 굿즈 2종 목업 + 발주"...');
    const taskTitle = page.locator('text=티셔츠 굿즈 2종 목업 + 발주');
    if (await taskTitle.count() > 0) {
      console.log('Found the task! Clicking...');
      await taskTitle.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of the modal
      await page.screenshot({ path: '.playwright-mcp/step4-task-modal.png', fullPage: true });
      console.log('Screenshot saved: step4-task-modal.png');
      
      // Take screenshot of just the header area
      const modalHeader = page.locator('[role="dialog"]').first();
      if (await modalHeader.count() > 0) {
        await modalHeader.screenshot({ path: '.playwright-mcp/step5-modal-header.png' });
        console.log('Screenshot saved: step5-modal-header.png');
      }
      
      console.log('All screenshots captured successfully!');
    } else {
      console.log('Task not found. Taking screenshot of current page...');
      await page.screenshot({ path: '.playwright-mcp/task-not-found.png', fullPage: true });
    }

    // Keep browser open for 10 seconds so you can see the result
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '.playwright-mcp/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
