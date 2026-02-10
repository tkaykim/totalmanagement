const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const screenshotDir = '.playwright-mcp';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  try {
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for either login button or main content to appear
    console.log('Waiting for page to load...');
    try {
      await page.waitForSelector('button:has-text("로그인"), text=매뉴얼, text=프로젝트', { timeout: 30000 });
    } catch (e) {
      console.log('Timeout waiting for page elements, continuing anyway...');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-1-initial.png'), fullPage: true });
    console.log('Screenshot saved: manual-test-1-initial.png');

    // Check if login page exists
    const loginButton = await page.locator('button:has-text("로그인")').count();
    
    if (loginButton > 0) {
      console.log('2. Login page detected, logging in...');
      
      // Fill email - try multiple selectors
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="이메일"]',
        'input[name="email"]',
        'input:first-of-type'
      ];
      
      for (const selector of emailSelectors) {
        try {
          await page.fill(selector, 'tommy0621@naver.com');
          console.log(`Filled email with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Fill password
      const passwordSelectors = [
        'input[type="password"]',
        'input[placeholder*="비밀번호"]',
        'input[name="password"]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          await page.fill(selector, '123123');
          console.log(`Filled password with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-2-login-form.png'), fullPage: true });
      
      await page.click('button:has-text("로그인")');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-3-after-login.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-3-after-login.png');
    } else {
      console.log('2. No login required or already logged in');
      // Wait for the page to fully load
      await page.waitForTimeout(5000);
    }

    console.log('3. Looking for 매뉴얼 menu in sidebar...');
    await page.waitForTimeout(1000);
    
    // Try to find and click the 매뉴얼 menu item
    const manualMenuSelectors = [
      'text=매뉴얼',
      'a:has-text("매뉴얼")',
      'button:has-text("매뉴얼")',
      '[href*="manual"]',
      '[href*="sop"]'
    ];
    
    let clicked = false;
    for (const selector of manualMenuSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`Found 매뉴얼 menu with selector: ${selector}`);
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!clicked) {
      console.log('Could not find 매뉴얼 menu, taking screenshot of current page...');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-4-menu-not-found.png'), fullPage: true });
      throw new Error('매뉴얼 menu not found');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-4-manuals-list.png'), fullPage: true });
    console.log('Screenshot saved: manual-test-4-manuals-list.png');

    console.log('4. Looking for manual cards...');
    const manualCardSelectors = [
      '[class*="manual"]',
      '[class*="card"]',
      'div[role="button"]',
      'button'
    ];
    
    // Wait a bit for cards to load
    await page.waitForTimeout(1000);
    
    // Try to find and click a manual card
    let cardClicked = false;
    
    // First try to click any visible card/button that might open a manual
    const clickableElements = await page.locator('div[class*="cursor-pointer"], button:not([class*="매뉴얼 작성"])').all();
    
    if (clickableElements.length > 0) {
      console.log(`Found ${clickableElements.length} clickable elements, trying first one...`);
      try {
        await clickableElements[0].click();
        cardClicked = true;
        await page.waitForTimeout(1500);
      } catch (e) {
        console.log('Failed to click first element:', e.message);
      }
    }
    
    if (!cardClicked) {
      console.log('No manual cards found to click, taking screenshot...');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-5-no-cards.png'), fullPage: true });
    } else {
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-5-manual-detail.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-5-manual-detail.png');
      
      // Check if modal is open
      const modalVisible = await page.locator('[role="dialog"]').count();
      console.log(`Modal visible: ${modalVisible > 0}`);
      
      // Wait a bit to see the content
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-6-detail-content.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-6-detail-content.png');
      
      // Close the modal
      console.log('5. Closing modal...');
      const closeButtons = await page.locator('button:has-text("닫기"), button:has-text("×"), button[aria-label="Close"]').all();
      if (closeButtons.length > 0) {
        await closeButtons[0].click();
        await page.waitForTimeout(1000);
      } else {
        // Try ESC key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    console.log('6. Looking for 매뉴얼 작성 button...');
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-7-before-create.png'), fullPage: true });
    
    const createButtonSelectors = [
      'button:has-text("매뉴얼 작성")',
      'button:has-text("작성")',
      'button:has-text("추가")',
      'button:has-text("+")'
    ];
    
    let createClicked = false;
    for (const selector of createButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`Found create button with selector: ${selector}`);
          await element.click();
          createClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (createClicked) {
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-8-editor-modal.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-8-editor-modal.png');
      
      // Check for TipTap editor toolbar
      await page.waitForTimeout(1000);
      const toolbarVisible = await page.locator('[class*="tiptap"], [class*="editor"], [class*="toolbar"]').count();
      console.log(`Editor toolbar elements found: ${toolbarVisible}`);
      
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-9-editor-toolbar.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-9-editor-toolbar.png');
    } else {
      console.log('Create button not found');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-8-no-create-button.png'), fullPage: true });
    }

    console.log('\n✅ Test completed!');
    console.log('All screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-error.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
})();
