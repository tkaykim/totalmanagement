const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
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
    console.log('1. Navigating to https://total-managements.vercel.app...');
    await page.goto('https://total-managements.vercel.app');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'step1-initial-page.png') });
    console.log('Screenshot saved: step1-initial-page.png');

    console.log('2. Logging in...');
    await page.fill('input[type="email"]', 'jys@grigo.co.kr');
    await page.fill('input[type="password"]', 'whdtjr!!1');
    await page.screenshot({ path: path.join(screenshotDir, 'step2-login-form.png') });
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step3-after-login.png') });
    console.log('Screenshot saved: step3-after-login.png');

    console.log('3. Navigating to 프로젝트 관리...');
    await page.click('text=프로젝트 관리');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step4-project-list.png') });
    console.log('Screenshot saved: step4-project-list.png');

    console.log('4. Opening project creation modal...');
    await page.click('text=프로젝트 추가');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step5-project-modal.png') });
    console.log('Screenshot saved: step5-project-modal.png');

    console.log('5. Filling project form...');
    await page.fill('input[name="name"]', '99대학교 단체복 제작');
    
    // Select BU dropdown
    await page.click('button:has-text("사업부 선택")');
    await page.waitForTimeout(500);
    await page.click('text=모두굿즈');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="카테고리"]', '단체복');
    
    // Fill dates
    const startDateInput = page.locator('input[placeholder*="시작일"]').first();
    await startDateInput.fill('2026-02-10');
    
    const endDateInput = page.locator('input[placeholder*="종료일"]').first();
    await endDateInput.fill('2026-03-15');
    
    await page.screenshot({ path: path.join(screenshotDir, 'step6-form-filled.png') });
    console.log('Screenshot saved: step6-form-filled.png');

    console.log('6. Looking for 할일 탬플릿 button...');
    await page.waitForTimeout(1000);
    
    // Scroll to the tasks section
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: path.join(screenshotDir, 'step7-before-template-button.png') });
    console.log('Screenshot saved: step7-before-template-button.png');

    // Click the template button
    await page.click('button:has-text("할일 탬플릿")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step8-template-selector.png') });
    console.log('Screenshot saved: step8-template-selector.png');

    console.log('7. Searching for 단체복 template...');
    await page.fill('input[placeholder*="검색"]', '단체복');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step9-template-search.png') });
    console.log('Screenshot saved: step9-template-search.png');

    console.log('8. Selecting 단체복 제작 template...');
    await page.click('text=단체복 제작');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step10-template-selected.png') });
    console.log('Screenshot saved: step10-template-selected.png');

    console.log('9. Setting base date...');
    const baseDateInput = page.locator('input[placeholder*="기준일"]');
    await baseDateInput.fill('2026-03-15');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'step11-base-date-set.png') });
    console.log('Screenshot saved: step11-base-date-set.png');

    console.log('10. Adding template tasks...');
    await page.click('button:has-text("할일")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step12-tasks-added.png') });
    console.log('Screenshot saved: step12-tasks-added.png');

    console.log('11. Verifying pending tasks in modal...');
    await page.waitForTimeout(1000);
    
    // Scroll back to see the tasks
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = 0;
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'step13-pending-tasks.png') });
    console.log('Screenshot saved: step13-pending-tasks.png');

    console.log('12. Creating the project...');
    await page.click('button:has-text("등록")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'step14-project-created.png') });
    console.log('Screenshot saved: step14-project-created.png');

    console.log('13. Verifying the project exists...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'step15-final-result.png') });
    console.log('Screenshot saved: step15-final-result.png');

    console.log('\n✅ Test completed successfully!');
    console.log('All screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-screenshot.png') });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
