const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotDir = '.playwright-mcp';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('Step 1: Navigate to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'worklog-step1-initial.png'), fullPage: true });
    console.log('✓ Initial page loaded');

    console.log('\nStep 2: Check if login page exists and login');
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Login page detected, filling credentials...');
      
      // Try admin@grigoent.co.kr first
      await emailInput.fill('admin@grigoent.co.kr');
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill('admin123!');
      await page.screenshot({ path: path.join(screenshotDir, 'worklog-step2-login-filled.png'), fullPage: true });
      
      const loginButton = await page.locator('button[type="submit"], button:has-text("로그인")').first();
      await loginButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotDir, 'worklog-step3-after-login.png'), fullPage: true });
      
      // Check if login was successful by looking for error message
      const errorMessage = await page.locator('text="Invalid login credentials"').isVisible({ timeout: 1000 }).catch(() => false);
      if (errorMessage) {
        console.log('❌ Login failed with admin@grigoent.co.kr, trying finance@grigoent.co.kr...');
        await emailInput.fill('finance@grigoent.co.kr');
        await passwordInput.fill('khj4957!');
        await loginButton.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotDir, 'worklog-step3b-after-login-retry.png'), fullPage: true });
        
        const errorMessage2 = await page.locator('text="Invalid login credentials"').isVisible({ timeout: 1000 }).catch(() => false);
        if (errorMessage2) {
          console.log('❌ Login failed with both credentials');
          console.log('Please check the correct admin credentials in the database');
          await browser.close();
          return;
        }
      }
      console.log('✓ Login successful');
    } else {
      console.log('Already logged in or no login required');
    }

    console.log('\nStep 3: Look for "업무일지 열람" in sidebar under "관리자 전용"');
    await page.waitForTimeout(2000);
    
    // First, check if sidebar is visible or needs to be opened
    const sidebarVisible = await page.locator('nav, aside, [role="navigation"]').first().isVisible().catch(() => false);
    if (!sidebarVisible) {
      console.log('Sidebar not visible, looking for menu button...');
      const menuButton = await page.locator('button[aria-label*="menu"], button:has-text("메뉴")').first();
      if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: path.join(screenshotDir, 'worklog-step4-sidebar.png'), fullPage: true });

    // Look for "관리자 전용" section
    const adminSection = await page.locator('text="관리자 전용"').first();
    const adminSectionExists = await adminSection.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`관리자 전용 section found: ${adminSectionExists}`);

    // Look for "업무일지 열람" menu item
    const workLogMenuItem = await page.locator('text="업무일지 열람"').first();
    const workLogMenuExists = await workLogMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`업무일지 열람 menu item found: ${workLogMenuExists}`);

    if (!workLogMenuExists) {
      console.log('\n❌ ERROR: "업무일지 열람" menu item not found in sidebar');
      await page.screenshot({ path: path.join(screenshotDir, 'worklog-error-no-menu.png'), fullPage: true });
      await browser.close();
      return;
    }

    console.log('\nStep 4: Click on "업무일지 열람"');
    await workLogMenuItem.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'worklog-step5-overview.png'), fullPage: true });
    console.log('✓ Navigated to admin work log overview page');

    console.log('\nStep 5: Check overview page content');
    const pageContent = await page.content();
    const hasUserList = pageContent.includes('사용자') || pageContent.includes('직원') || pageContent.includes('제출');
    console.log(`Overview page has user list/stats: ${hasUserList}`);

    // Look for user items to click
    const userItems = await page.locator('[role="button"], button, a').filter({ hasText: /제출|미제출|사용자|직원/ }).all();
    console.log(`Found ${userItems.length} potential user items`);

    if (userItems.length === 0) {
      console.log('\n⚠ WARNING: No user items found to click');
      await page.screenshot({ path: path.join(screenshotDir, 'worklog-error-no-users.png'), fullPage: true });
    } else {
      console.log('\nStep 6: Click on first user in the list');
      await userItems[0].click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'worklog-step6-detail.png'), fullPage: true });
      console.log('✓ Navigated to user detail view');

      console.log('\nStep 7: Check detail view content');
      const detailContent = await page.content();
      const hasWorkLog = detailContent.includes('업무일지') || detailContent.includes('작성일') || detailContent.includes('내용');
      const hasTimeline = detailContent.includes('타임라인') || detailContent.includes('활동') || detailContent.includes('이력');
      console.log(`Detail view has work log content: ${hasWorkLog}`);
      console.log(`Detail view has activity timeline: ${hasTimeline}`);
    }

    console.log('\n✅ Test completed successfully');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'worklog-error.png'), fullPage: true });
  } finally {
    await browser.close();
  }
})();
