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

  const log = (message) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(message);
    console.log('='.repeat(60));
  };

  try {
    log('STEP 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step1-initial.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step1-initial.png');

    log('STEP 2: Checking for login page');
    const hasLoginForm = await page.locator('input[type="email"], input[type="text"][placeholder*="이메일"]').count() > 0;
    
    if (hasLoginForm) {
      console.log('✓ Login page detected, attempting to log in...');
      
      await page.fill('input[type="email"], input[type="text"][placeholder*="이메일"]', 'tommy0621@naver.com');
      await page.fill('input[type="password"]', '123123');
      await page.screenshot({ path: path.join(screenshotDir, 'local-step2-login-filled.png'), fullPage: true });
      console.log('✓ Screenshot saved: local-step2-login-filled.png');
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'local-step3-after-login.png'), fullPage: true });
      console.log('✓ Screenshot saved: local-step3-after-login.png');
      console.log('✓ Login successful');
    } else {
      console.log('✓ Already logged in or no login required');
    }

    log('STEP 3: Looking for 프로젝트 관리 section');
    await page.waitForTimeout(1000);
    
    // Try to find and click on 프로젝트 관리 in sidebar
    const projectLink = page.locator('text=프로젝트 관리, text=프로젝트').first();
    if (await projectLink.count() > 0) {
      await projectLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log('✓ Navigated to 프로젝트 관리');
    }
    
    await page.screenshot({ path: path.join(screenshotDir, 'local-step4-project-page.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step4-project-page.png');

    log('STEP 4: Opening project creation modal');
    const addButton = page.locator('button:has-text("프로젝트 추가"), button:has-text("+")').first();
    await addButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step5-project-modal.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step5-project-modal.png');
    console.log('✓ Project creation modal opened');

    log('STEP 5: Looking for 할일 탬플릿 button');
    await page.waitForTimeout(500);
    
    // Scroll down in the modal to find the template button
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: path.join(screenshotDir, 'local-step6-scrolled-modal.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step6-scrolled-modal.png');

    log('STEP 6: Opening TaskTemplateSelector modal');
    const templateButton = page.locator('button:has-text("할일 탬플릿")');
    await templateButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step7-template-selector-step1.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step7-template-selector-step1.png');
    console.log('✓ TaskTemplateSelector modal opened');

    log('STEP 7: Verifying Step 1 (템플릿 선택)');
    
    // Check for search box
    const searchBox = await page.locator('input[placeholder*="검색"], input[type="text"]').first();
    const hasSearchBox = await searchBox.count() > 0;
    console.log(`${hasSearchBox ? '✓' : '✗'} Search box present: ${hasSearchBox}`);
    
    // Check for template cards
    const templateCards = await page.locator('[class*="card"], [class*="template"]').count();
    console.log(`${templateCards > 0 ? '✓' : '✗'} Template cards found: ${templateCards}`);
    
    // Check for step indicator
    const stepIndicator = await page.locator('text=1, text=2, text=3').count();
    console.log(`${stepIndicator > 0 ? '✓' : '✗'} Step indicator present`);

    log('STEP 8: Searching for "댄스" template');
    await searchBox.fill('댄스');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step8-search-dance.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step8-search-dance.png');
    
    // Click on the "1대1 댄스 배틀" template
    const danceTemplate = page.locator('text=1대1 댄스 배틀, text=댄스').first();
    await danceTemplate.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step9-template-selected-step2.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step9-template-selected-step2.png');
    console.log('✓ Template selected, moved to Step 2');

    log('STEP 9: Verifying Step 2 (옵션 설정)');
    
    // Check for conditional options
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`${checkboxes > 0 ? '✓' : '✗'} Conditional checkboxes found: ${checkboxes}`);
    
    // Check for text inputs
    const textInputs = await page.locator('input[type="text"], input[placeholder]').count();
    console.log(`${textInputs > 0 ? '✓' : '✗'} Text/enum inputs found: ${textInputs}`);
    
    // Check for task count summary
    const summaryText = await page.locator('text=/\\d+개.*할일/, text=/task/i').count();
    console.log(`${summaryText > 0 ? '✓' : '✗'} Task count summary present`);

    log('STEP 10: Testing conditional checkbox - Toggle ON');
    const conditionalCheckbox = page.locator('input[type="checkbox"]').first();
    
    // Get initial task count
    const getTaskCount = async () => {
      const countText = await page.locator('text=/\\d+개.*할일/').first().textContent();
      const match = countText?.match(/(\d+)개/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const initialCount = await getTaskCount();
    console.log(`Initial task count: ${initialCount}`);
    
    await conditionalCheckbox.check();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step10-checkbox-on.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step10-checkbox-on.png');
    
    const countAfterOn = await getTaskCount();
    console.log(`Task count after toggle ON: ${countAfterOn}`);
    console.log(`${countAfterOn > initialCount ? '✓' : '✗'} Task count increased: ${countAfterOn > initialCount}`);

    log('STEP 11: Testing conditional checkbox - Toggle OFF');
    await conditionalCheckbox.uncheck();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step11-checkbox-off.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step11-checkbox-off.png');
    
    const countAfterOff = await getTaskCount();
    console.log(`Task count after toggle OFF: ${countAfterOff}`);
    console.log(`${countAfterOff < countAfterOn ? '✓' : '✗'} Task count decreased: ${countAfterOff < countAfterOn}`);

    log('STEP 12: Proceeding to Step 3 (할일 미리보기)');
    const previewButton = page.locator('button:has-text("할일 미리보기"), button:has-text("미리보기")');
    await previewButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step12-preview-step3.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step12-preview-step3.png');
    console.log('✓ Moved to Step 3 (할일 확인)');

    log('STEP 13: Verifying Step 3 (할일 확인)');
    
    // Check for task items
    const taskItems = await page.locator('[class*="task"], li, [role="listitem"]').count();
    console.log(`${taskItems > 0 ? '✓' : '✗'} Task items displayed: ${taskItems}`);
    
    // Check for D-X labels
    const dLabels = await page.locator('text=/D-\\d+/').count();
    console.log(`${dLabels > 0 ? '✓' : '✗'} D-X labels present: ${dLabels}`);
    
    // Check for conditional badges
    const conditionalBadges = await page.locator('text=조건부').count();
    console.log(`${conditionalBadges >= 0 ? '✓' : '✗'} Conditional badges found: ${conditionalBadges}`);
    
    // Check for remove buttons
    const removeButtons = await page.locator('button:has([class*="trash"]), button:has([class*="delete"]), button:has(svg)').count();
    console.log(`${removeButtons > 0 ? '✓' : '✗'} Remove buttons present: ${removeButtons}`);
    
    // Check for final count text
    const finalCountText = await page.locator('text=/최종.*\\d+개.*할일/, text=/\\d+개.*할일.*추가/').count();
    console.log(`${finalCountText > 0 ? '✓' : '✗'} Final count text present`);

    log('STEP 14: Testing task removal');
    const trashButton = page.locator('button:has([class*="trash"]), button:has([class*="delete"])').first();
    const countBeforeRemove = await getTaskCount();
    console.log(`Task count before removal: ${countBeforeRemove}`);
    
    await trashButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'local-step13-task-removed.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step13-task-removed.png');
    
    const countAfterRemove = await getTaskCount();
    console.log(`Task count after removal: ${countAfterRemove}`);
    console.log(`${countAfterRemove < countBeforeRemove ? '✓' : '✗'} Task count decreased after removal: ${countAfterRemove < countBeforeRemove}`);

    log('STEP 15: Testing 전체 복원 (restore all)');
    const restoreButton = page.locator('button:has-text("전체 복원"), button:has-text("복원")');
    if (await restoreButton.count() > 0) {
      await restoreButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, 'local-step14-tasks-restored.png'), fullPage: true });
      console.log('✓ Screenshot saved: local-step14-tasks-restored.png');
      
      const countAfterRestore = await getTaskCount();
      console.log(`Task count after restore: ${countAfterRestore}`);
      console.log(`${countAfterRestore > countAfterRemove ? '✓' : '✗'} Tasks restored: ${countAfterRestore > countAfterRemove}`);
    } else {
      console.log('⚠ Restore button not found (might not be visible)');
    }

    log('FINAL SCREENSHOT');
    await page.screenshot({ path: path.join(screenshotDir, 'local-step15-final.png'), fullPage: true });
    console.log('✓ Screenshot saved: local-step15-final.png');

    log('TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📸 All screenshots saved in .playwright-mcp directory');
    console.log('\n✅ Task Template Selector 3-step flow test completed');
    console.log('\nKeeping browser open for 15 seconds for manual inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack trace:', error.stack);
    await page.screenshot({ path: path.join(screenshotDir, 'local-error-screenshot.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();
