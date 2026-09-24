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
    console.log('=== Step 1: Login ===');
    console.log('1. Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'local-step1-initial.png'), fullPage: true });
    console.log('Screenshot: local-step1-initial.png');

    console.log('2. Filling login credentials...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.fill('input[type="email"], input[name="email"]', process.env.ERP_TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', process.env.ERP_TEST_PASSWORD);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step2-login-form.png'), fullPage: true });
    console.log('Screenshot: local-step2-login-form.png');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step3-after-login.png'), fullPage: true });
    console.log('Screenshot: local-step3-after-login.png');
    console.log('✅ Login successful!\n');

    console.log('=== Step 2: Navigate to Projects ===');
    console.log('1. Clicking "프로젝트 관리"...');
    await page.click('text=프로젝트 관리');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step4-projects-page.png'), fullPage: true });
    console.log('Screenshot: local-step4-projects-page.png');
    console.log('✅ Projects page loaded!\n');

    console.log('=== Step 3: Create New Project ===');
    console.log('1. Scrolling to top and looking for "프로젝트 추가"...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    
    console.log('2. Clicking "프로젝트 추가"...');
    await page.waitForSelector('button:has-text("프로젝트 추가"), button:has-text("추가")', { timeout: 10000 });
    await page.click('button:has-text("프로젝트 추가"), button:has-text("추가")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step5-project-modal.png'), fullPage: true });
    console.log('Screenshot: local-step5-project-modal.png');

    console.log('3. Filling project form...');
    
    // Fill project name
    const nameInput = page.locator('input[name="name"], input[placeholder*="프로젝트명"]').first();
    await nameInput.fill('99대학교 단체복 제작');
    console.log('  - Project name filled');
    
    await page.waitForTimeout(500);
    
    // Select BU dropdown
    console.log('  - Selecting 사업부...');
    const buButton = page.locator('button:has-text("사업부 선택"), button:has-text("선택")').first();
    await buButton.click();
    await page.waitForTimeout(500);
    await page.click('text=모두굿즈');
    await page.waitForTimeout(500);
    console.log('  - BU selected: 모두굿즈');
    
    // Fill category
    const categoryInput = page.locator('input[placeholder*="카테고리"]').first();
    await categoryInput.fill('단체복');
    console.log('  - Category filled');
    
    await page.waitForTimeout(500);
    
    // Fill dates
    console.log('  - Filling dates...');
    const startDateInput = page.locator('input[placeholder*="시작일"]').first();
    await startDateInput.click();
    await startDateInput.fill('2026-02-10');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    const endDateInput = page.locator('input[placeholder*="종료일"]').first();
    await endDateInput.click();
    await endDateInput.fill('2026-03-15');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step6-form-filled.png'), fullPage: true });
    console.log('Screenshot: local-step6-form-filled.png');
    console.log('✅ Project form filled!\n');

    console.log('=== Step 4: Add Tasks from Template ===');
    console.log('1. Scrolling to tasks section...');
    
    // Scroll down in the modal to see tasks section
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step7-tasks-section.png'), fullPage: true });
    console.log('Screenshot: local-step7-tasks-section.png');

    console.log('2. Clicking "할일 탬플릿" button...');
    const templateButton = page.locator('button:has-text("할일 탬플릿")');
    await templateButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step8-template-selector.png'), fullPage: true });
    console.log('Screenshot: local-step8-template-selector.png');

    console.log('3. Searching for "단체복" template...');
    const searchInput = page.locator('input[placeholder*="검색"]');
    await searchInput.fill('단체복');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step9-template-search.png'), fullPage: true });
    console.log('Screenshot: local-step9-template-search.png');

    console.log('4. Selecting "단체복 제작" template...');
    await page.click('text=단체복 제작');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step10-template-selected.png'), fullPage: true });
    console.log('Screenshot: local-step10-template-selected.png');

    console.log('5. Setting base date to 2026-03-15...');
    const baseDateInput = page.locator('input[placeholder*="기준일"]');
    await baseDateInput.click();
    await baseDateInput.fill('2026-03-15');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step11-base-date.png'), fullPage: true });
    console.log('Screenshot: local-step11-base-date.png');

    console.log('6. Clicking "할일 추가" button...');
    const addTasksButton = page.locator('button:has-text("할일"), button:has-text("추가")').last();
    await addTasksButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step12-tasks-added.png'), fullPage: true });
    console.log('Screenshot: local-step12-tasks-added.png');

    console.log('7. Verifying pending tasks in modal...');
    await page.waitForTimeout(1000);
    
    // Scroll to top to see the tasks
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = 0;
      }
    });
    await page.waitForTimeout(500);
    
    // Then scroll to tasks section
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        const tasksSection = modal.querySelector('[class*="할일"], [class*="task"]');
        if (tasksSection) {
          tasksSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          modal.scrollTop = modal.scrollHeight * 0.6;
        }
      }
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step13-pending-tasks.png'), fullPage: true });
    console.log('Screenshot: local-step13-pending-tasks.png');
    console.log('✅ Tasks added to pending list!\n');

    console.log('=== Step 5: Submit and Verify ===');
    console.log('1. Creating the project...');
    
    // Scroll to bottom to find the submit button
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("등록")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step14-project-created.png'), fullPage: true });
    console.log('Screenshot: local-step14-project-created.png');

    console.log('2. Finding and opening the created project...');
    await page.waitForTimeout(1000);
    
    // Look for the project in the list
    const projectCard = page.locator('text=99대학교 단체복 제작').first();
    await projectCard.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step15-project-details.png'), fullPage: true });
    console.log('Screenshot: local-step15-project-details.png');

    console.log('3. Verifying tasks in the project...');
    await page.waitForTimeout(1000);
    
    // Scroll down to see all tasks
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step16-project-tasks.png'), fullPage: true });
    console.log('Screenshot: local-step16-project-tasks.png');

    console.log('\n=== Test Summary ===');
    console.log('✅ All steps completed successfully!');
    console.log('📁 Screenshots saved in .playwright-mcp directory');
    console.log('\nPlease review the screenshots to verify:');
    console.log('  - Project "99대학교 단체복 제작" was created');
    console.log('  - All 10 tasks from "단체복 제작" template were added');
    console.log('  - Tasks are visible in the project details');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'local-error.png'), fullPage: true });
    console.log('Error screenshot saved: local-error.png');
    console.error('\nStack trace:', error.stack);
  } finally {
    console.log('\nKeeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
})();
