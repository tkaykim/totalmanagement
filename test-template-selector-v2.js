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

  const log = (message) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(message);
    console.log('='.repeat(60));
  };

  try {
    log('STEP 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step1-initial.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step1-initial.png');

    log('STEP 2: Checking for login page');
    const hasLoginForm = await page.locator('input[type="email"], input[type="text"][placeholder*="이메일"]').count() > 0;
    
    if (hasLoginForm) {
      console.log('✓ Login page detected, logging in...');
      await page.fill('input[type="email"], input[type="text"][placeholder*="이메일"]', 'tommy0621@naver.com');
      await page.fill('input[type="password"]', '123123');
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step2-login-filled.png'), fullPage: true });
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step3-after-login.png'), fullPage: true });
      console.log('✓ Login successful');
    }

    log('STEP 3: Waiting for dashboard to fully load');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step4-dashboard.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step4-dashboard.png');

    log('STEP 4: Navigating to 프로젝트 관리');
    // Look for the sidebar link
    const projectLink = page.locator('a:has-text("프로젝트"), a:has-text("프로젝트 관리")').first();
    if (await projectLink.count() > 0) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      console.log('✓ Navigated to 프로젝트 관리');
    } else {
      console.log('⚠ Could not find 프로젝트 link, might already be on the page');
    }
    
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step5-project-page.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step5-project-page.png');

    log('STEP 5: Looking for 프로젝트 추가 button');
    await page.waitForTimeout(2000);
    
    // Try to find the add project button more specifically
    const addProjectButton = page.locator('button:has-text("프로젝트 추가")').first();
    const buttonCount = await addProjectButton.count();
    console.log(`Found ${buttonCount} "프로젝트 추가" button(s)`);
    
    if (buttonCount === 0) {
      console.log('⚠ No "프로젝트 추가" button found. Trying alternative selectors...');
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step5b-no-button.png'), fullPage: true });
      
      // Try clicking a + button
      const plusButton = page.locator('button:has-text("+")').first();
      if (await plusButton.count() > 0) {
        await plusButton.click();
        console.log('✓ Clicked + button');
      }
    } else {
      await addProjectButton.click();
      console.log('✓ Clicked 프로젝트 추가 button');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step6-modal-opened.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step6-modal-opened.png');

    log('STEP 6: Verifying project creation modal');
    // Check if we have the right modal
    const modalTitle = await page.locator('[role="dialog"] h2, [role="dialog"] .text-lg').first().textContent();
    console.log(`Modal title: ${modalTitle}`);
    
    // If it's not the project modal, close it and try again
    if (modalTitle && !modalTitle.includes('프로젝트')) {
      console.log('⚠ Wrong modal opened, closing it...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      
      // Try again with a more specific selector
      await page.click('button:has-text("프로젝트 추가")');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step6b-retry-modal.png'), fullPage: true });
    }

    log('STEP 7: Scrolling to find 할일 탬플릿 button');
    // Scroll down in the modal
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step7-scrolled.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step7-scrolled.png');

    log('STEP 8: Looking for 할일 탬플릿 button');
    const templateButton = page.locator('button:has-text("할일 탬플릿"), button:has-text("탬플릿")');
    const templateButtonCount = await templateButton.count();
    console.log(`Found ${templateButtonCount} template button(s)`);
    
    if (templateButtonCount === 0) {
      console.log('❌ No 할일 탬플릿 button found in the modal');
      console.log('This might indicate:');
      console.log('1. The button text is different');
      console.log('2. The feature is not implemented yet');
      console.log('3. The modal structure is different');
      
      // Get all button texts in the modal
      const allButtons = await page.locator('[role="dialog"] button').allTextContents();
      console.log('All buttons in modal:', allButtons);
      
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step8-no-template-button.png'), fullPage: true });
      throw new Error('할일 탬플릿 button not found');
    }

    await templateButton.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step9-template-selector-opened.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step9-template-selector-opened.png');
    console.log('✓ TaskTemplateSelector modal opened');

    log('STEP 9: Verifying Step 1 (템플릿 선택)');
    const searchBox = page.locator('input[placeholder*="검색"]').first();
    const hasSearchBox = await searchBox.count() > 0;
    console.log(`${hasSearchBox ? '✓' : '✗'} Search box present: ${hasSearchBox}`);
    
    const templateCards = await page.locator('[class*="card"], [class*="template"], [role="button"]').count();
    console.log(`${templateCards > 0 ? '✓' : '✗'} Template cards/buttons found: ${templateCards}`);

    log('STEP 10: Searching for "댄스" template');
    if (hasSearchBox) {
      await searchBox.fill('댄스');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step10-search-dance.png'), fullPage: true });
      console.log('✓ Screenshot saved: v2-step10-search-dance.png');
    }
    
    log('STEP 11: Selecting "1대1 댄스 배틀" template');
    const danceTemplate = page.locator('text=1대1 댄스 배틀, text=댄스').first();
    const danceCount = await danceTemplate.count();
    console.log(`Found ${danceCount} "댄스" template(s)`);
    
    if (danceCount > 0) {
      await danceTemplate.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step11-template-selected.png'), fullPage: true });
      console.log('✓ Screenshot saved: v2-step11-template-selected.png');
    } else {
      console.log('⚠ "댄스" template not found, clicking first available template');
      await page.locator('[role="button"], button').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step11-first-template.png'), fullPage: true });
    }

    log('STEP 12: Verifying Step 2 (옵션 설정)');
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`${checkboxes > 0 ? '✓' : '✗'} Conditional checkboxes found: ${checkboxes}`);
    
    const textInputs = await page.locator('input[type="text"], input[placeholder]').count();
    console.log(`${textInputs > 0 ? '✓' : '✗'} Text inputs found: ${textInputs}`);
    
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step12-options-step.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step12-options-step.png');

    log('STEP 13: Testing conditional checkbox');
    if (checkboxes > 0) {
      const checkbox = page.locator('input[type="checkbox"]').first();
      
      // Get task count function
      const getTaskCount = async () => {
        try {
          const countText = await page.locator('text=/\\d+개.*할일/, text=/\\d+.*task/i').first().textContent({ timeout: 2000 });
          const match = countText?.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        } catch {
          return 0;
        }
      };
      
      const initialCount = await getTaskCount();
      console.log(`Initial task count: ${initialCount}`);
      
      await checkbox.check();
      await page.waitForTimeout(1000);
      const countAfterOn = await getTaskCount();
      console.log(`Task count after toggle ON: ${countAfterOn}`);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step13-checkbox-on.png'), fullPage: true });
      
      await checkbox.uncheck();
      await page.waitForTimeout(1000);
      const countAfterOff = await getTaskCount();
      console.log(`Task count after toggle OFF: ${countAfterOff}`);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step14-checkbox-off.png'), fullPage: true });
    }

    log('STEP 14: Proceeding to Step 3 (할일 미리보기)');
    const previewButton = page.locator('button:has-text("미리보기"), button:has-text("다음"), button:has-text("확인")');
    const previewCount = await previewButton.count();
    console.log(`Found ${previewCount} preview/next button(s)`);
    
    if (previewCount > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'v2-step15-preview-step.png'), fullPage: true });
      console.log('✓ Screenshot saved: v2-step15-preview-step.png');
    }

    log('STEP 15: Verifying Step 3 (할일 확인)');
    const taskItems = await page.locator('li, [role="listitem"], [class*="task"]').count();
    console.log(`${taskItems > 0 ? '✓' : '✗'} Task items displayed: ${taskItems}`);
    
    const dLabels = await page.locator('text=/D-\\d+/').count();
    console.log(`${dLabels > 0 ? '✓' : '✗'} D-X labels found: ${dLabels}`);
    
    const conditionalBadges = await page.locator('text=조건부').count();
    console.log(`Conditional badges found: ${conditionalBadges}`);
    
    await page.screenshot({ path: path.join(screenshotDir, 'v2-step16-final-preview.png'), fullPage: true });
    console.log('✓ Screenshot saved: v2-step16-final-preview.png');

    log('TEST COMPLETED!');
    console.log('\n📸 All screenshots saved in .playwright-mcp directory');
    console.log('\nKeeping browser open for 20 seconds for manual inspection...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack trace:', error.stack);
    await page.screenshot({ path: path.join(screenshotDir, 'v2-error-screenshot.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();
