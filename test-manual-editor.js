const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
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
    console.log('Step 1: Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-step1-initial.png'), fullPage: true });
    console.log('✓ Screenshot saved: manual-step1-initial.png');

    console.log('\nStep 2: Checking for login page...');
    const hasLoginForm = await page.locator('input[type="email"], input[type="text"][placeholder*="이메일"]').count() > 0;
    
    if (hasLoginForm) {
      console.log('Login page detected. Logging in...');
      
      // Try different selectors for email field
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill('tommy0621@naver.com');
      await passwordInput.fill('123123');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-step2-login-filled.png'), fullPage: true });
      console.log('✓ Screenshot saved: manual-step2-login-filled.png');
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-step3-after-login.png'), fullPage: true });
      console.log('✓ Screenshot saved: manual-step3-after-login.png');
    } else {
      console.log('No login page detected, already logged in or on dashboard.');
    }

    console.log('\nStep 3: Waiting for dashboard to load...');
    await page.waitForTimeout(1000);

    console.log('\nStep 4: Looking for "매뉴얼 관리" in sidebar...');
    // Wait for sidebar to be visible
    await page.waitForSelector('nav, aside, [role="navigation"]', { timeout: 10000 });
    
    // Take screenshot of sidebar
    await page.screenshot({ path: path.join(screenshotDir, 'manual-step4-sidebar.png'), fullPage: true });
    console.log('✓ Screenshot saved: manual-step4-sidebar.png');
    
    // Try to find and click "매뉴얼 관리"
    const manualMenuSelectors = [
      'text=매뉴얼 관리',
      'a:has-text("매뉴얼 관리")',
      'button:has-text("매뉴얼 관리")',
      '[href*="manual"]'
    ];
    
    let clicked = false;
    for (const selector of manualMenuSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`Found manual menu with selector: ${selector}`);
        await element.click();
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      throw new Error('Could not find "매뉴얼 관리" menu item');
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('\nStep 5: Taking screenshot of manuals list view...');
    await page.screenshot({ path: path.join(screenshotDir, 'manual-step5-list-view.png'), fullPage: true });
    console.log('✓ Screenshot saved: manual-step5-list-view.png');
    
    // Check if manuals are loaded
    const manualsCount = await page.locator('table tr, [role="row"], .manual-item, [data-manual]').count();
    console.log(`Found ${manualsCount} manual elements on the page`);

    console.log('\nStep 6: Looking for a manual to click...');
    // Try to find the specific manual or any manual
    const manualSelectors = [
      'text=촬영 장비 대여/반납 및 점검 매뉴얼',
      'table tbody tr:first-child',
      '[role="row"]:first-child',
      '.manual-item:first-child'
    ];
    
    let manualClicked = false;
    for (const selector of manualSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log(`Found manual with selector: ${selector}`);
        await element.click();
        manualClicked = true;
        break;
      }
    }
    
    if (!manualClicked) {
      console.log('⚠ Could not find a manual to click. Trying to find any clickable row...');
      // Try clicking any row in a table
      const anyRow = page.locator('table tbody tr').first();
      if (await anyRow.count() > 0) {
        await anyRow.click();
        manualClicked = true;
      }
    }
    
    if (manualClicked) {
      await page.waitForTimeout(1500);
      
      console.log('\nStep 7: Taking screenshot of manual detail view...');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-step6-detail-view.png'), fullPage: true });
      console.log('✓ Screenshot saved: manual-step6-detail-view.png');
      
      // Check if content is rendered as HTML or JSON
      const modalContent = await page.locator('[role="dialog"], .modal, [class*="modal"]').first().textContent();
      const hasJsonSyntax = modalContent.includes('{') && modalContent.includes('"type"') && modalContent.includes('"content"');
      
      if (hasJsonSyntax) {
        console.log('⚠ WARNING: Manual content appears to contain JSON syntax');
      } else {
        console.log('✓ Manual content appears to be rendered as clean HTML');
      }
      
      console.log('\nStep 8: Closing detail modal...');
      // Try different ways to close the modal
      const closeSelectors = [
        'button[aria-label="Close"]',
        'button:has-text("닫기")',
        '[role="dialog"] button:has([class*="close"])',
        '[class*="close"]'
      ];
      
      for (const selector of closeSelectors) {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    } else {
      console.log('⚠ Could not open manual detail view');
    }

    console.log('\nStep 9: Looking for edit button...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-step7-before-edit.png'), fullPage: true });
    console.log('✓ Screenshot saved: manual-step7-before-edit.png');
    
    // Try to find and click edit button
    const editSelectors = [
      'button:has-text("수정")',
      'button:has-text("편집")',
      'button[aria-label*="edit"]',
      '[class*="edit"]'
    ];
    
    let editClicked = false;
    for (const selector of editSelectors) {
      const editBtn = page.locator(selector).first();
      if (await editBtn.count() > 0) {
        console.log(`Found edit button with selector: ${selector}`);
        await editBtn.click();
        editClicked = true;
        await page.waitForTimeout(1500);
        break;
      }
    }
    
    if (editClicked) {
      console.log('\nStep 10: Taking screenshot of editor...');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-step8-editor.png'), fullPage: true });
      console.log('✓ Screenshot saved: manual-step8-editor.png');
      
      // Check for TipTap editor toolbar
      const hasToolbar = await page.locator('[class*="toolbar"], [class*="menu-bar"], button[title*="Bold"], button[title*="Italic"]').count() > 0;
      
      if (hasToolbar) {
        console.log('✓ TipTap editor toolbar detected');
      } else {
        console.log('⚠ WARNING: Could not detect TipTap editor toolbar');
      }
      
      // Check for specific toolbar buttons
      const toolbarButtons = await page.locator('button[title], [role="toolbar"] button').count();
      console.log(`Found ${toolbarButtons} toolbar buttons`);
      
      console.log('\nStep 11: Closing editor...');
      // Try to close the editor
      const closeEditorSelectors = [
        'button:has-text("취소")',
        'button:has-text("닫기")',
        'button[aria-label="Close"]'
      ];
      
      for (const selector of closeEditorSelectors) {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    } else {
      console.log('⚠ Could not find edit button');
    }

    console.log('\n✅ Test completed successfully!');
    console.log('All screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-error.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
