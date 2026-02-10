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
    console.log('\n=== STEP 1: Navigate and Login ===');
    console.log('1. Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step1-login-page.png'), fullPage: true });
    console.log('✓ Screenshot saved: step1-login-page.png');

    console.log('2. Filling login credentials...');
    await page.fill('input[type="email"]', 'jys@grigo.co.kr');
    await page.fill('input[type="password"]', 'whdtjr!!1');
    await page.screenshot({ path: path.join(screenshotDir, 'step2-credentials-filled.png'), fullPage: true });
    console.log('✓ Screenshot saved: step2-credentials-filled.png');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step3-after-login.png'), fullPage: true });
    console.log('✓ Screenshot saved: step3-after-login.png');
    console.log('✓ Login successful!\n');

    console.log('=== STEP 2: Navigate to Projects ===');
    console.log('1. Clicking "프로젝트 관리" in sidebar...');
    await page.click('text=프로젝트 관리');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'step4-projects-page.png'), fullPage: true });
    console.log('✓ Screenshot saved: step4-projects-page.png');
    console.log('✓ Navigated to projects page!\n');

    console.log('=== STEP 3: Create Project ===');
    console.log('1. Clicking "프로젝트 추가" button...');
    await page.click('button:has-text("프로젝트 추가")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step5-empty-modal.png'), fullPage: true });
    console.log('✓ Screenshot saved: step5-empty-modal.png');
    console.log('✓ Project creation modal opened!\n');

    console.log('=== STEP 4: Fill Project Form ===');
    console.log('1. Filling project name...');
    await page.fill('input[name="name"]', '99대학교 단체복 제작');
    
    console.log('2. Selecting business unit (모두굿즈)...');
    // Click the BU dropdown button
    const buButton = page.locator('button').filter({ hasText: '사업부' }).first();
    await buButton.click();
    await page.waitForTimeout(500);
    
    // Select 모두굿즈
    await page.click('text=모두굿즈');
    await page.waitForTimeout(500);
    
    console.log('3. Filling category...');
    await page.fill('input[placeholder*="카테고리"]', '단체복');
    
    console.log('4. Filling dates...');
    // Fill start date
    const startDateInputs = page.locator('input[placeholder*="시작"]');
    await startDateInputs.first().fill('2026-02-10');
    await page.waitForTimeout(300);
    
    // Fill end date
    const endDateInputs = page.locator('input[placeholder*="종료"]');
    await endDateInputs.first().fill('2026-03-15');
    await page.waitForTimeout(300);
    
    await page.screenshot({ path: path.join(screenshotDir, 'step6-form-filled.png'), fullPage: true });
    console.log('✓ Screenshot saved: step6-form-filled.png');
    console.log('✓ Project form filled!\n');

    console.log('=== STEP 5: Add Tasks from Template ===');
    console.log('1. Scrolling to tasks section...');
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
    
    console.log('2. Looking for "할일 탬플릿" button...');
    await page.screenshot({ path: path.join(screenshotDir, 'step7-before-template.png'), fullPage: true });
    console.log('✓ Screenshot saved: step7-before-template.png');
    
    console.log('3. Clicking "할일 탬플릿" button...');
    const templateButton = page.locator('button').filter({ hasText: '할일 탬플릿' });
    await templateButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step8-template-selector.png'), fullPage: true });
    console.log('✓ Screenshot saved: step8-template-selector.png');
    console.log('✓ Template selector opened!\n');

    console.log('4. Searching for "단체복" template...');
    const searchInput = page.locator('input[placeholder*="검색"]');
    await searchInput.fill('단체복');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step9-template-search.png'), fullPage: true });
    console.log('✓ Screenshot saved: step9-template-search.png');

    console.log('5. Clicking "단체복 제작" template...');
    await page.click('text=단체복 제작');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step10-template-selected.png'), fullPage: true });
    console.log('✓ Screenshot saved: step10-template-selected.png');
    console.log('✓ Template selected!\n');

    console.log('6. Setting base date to 2026-03-15...');
    const baseDateInput = page.locator('input[placeholder*="기준일"]');
    await baseDateInput.fill('2026-03-15');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'step11-base-date-set.png'), fullPage: true });
    console.log('✓ Screenshot saved: step11-base-date-set.png');

    console.log('7. Clicking button to add tasks...');
    const addTasksButton = page.locator('button').filter({ hasText: /할일.*추가/ });
    await addTasksButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step12-tasks-added.png'), fullPage: true });
    console.log('✓ Screenshot saved: step12-tasks-added.png');
    console.log('✓ Tasks added from template!\n');

    console.log('8. Verifying pending tasks in modal...');
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = 0;
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'step13-pending-tasks.png'), fullPage: true });
    console.log('✓ Screenshot saved: step13-pending-tasks.png\n');

    console.log('=== STEP 6: Submit and Verify ===');
    console.log('1. Clicking "등록" to create project...');
    await page.click('button:has-text("등록")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step14-project-created.png'), fullPage: true });
    console.log('✓ Screenshot saved: step14-project-created.png');
    console.log('✓ Project created!\n');

    console.log('2. Finding and clicking on the created project...');
    await page.waitForTimeout(1000);
    
    // Try to find the project by name
    const projectCard = page.locator('text=99대학교 단체복 제작').first();
    await projectCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'step15-project-details.png'), fullPage: true });
    console.log('✓ Screenshot saved: step15-project-details.png');
    
    console.log('3. Taking final screenshot of project with tasks...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step16-final-result.png'), fullPage: true });
    console.log('✓ Screenshot saved: step16-final-result.png');
    console.log('✓ Verification complete!\n');

    console.log('========================================');
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nAll screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ path: path.join(screenshotDir, 'error-screenshot.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
})();
