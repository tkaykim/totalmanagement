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
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-1-initial.png'), fullPage: true });
    console.log('Screenshot saved: manual-test-1-initial.png');

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('login') || await page.locator('input[type="email"]').count() > 0) {
      console.log('2. Login page detected. Logging in...');
      await page.fill('input[type="email"]', 'tommy0621@naver.com');
      await page.fill('input[type="password"]', '123123');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-2-login-form.png') });
      
      await page.click('button[type="submit"]');
      console.log('Login submitted, waiting for dashboard...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-3-after-login.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-3-after-login.png');
    } else {
      console.log('2. Already logged in or no login required');
    }

    console.log('3. Looking for project cards...');
    await page.waitForTimeout(2000);
    
    // Try different selectors for project cards
    const projectSelectors = [
      '[data-testid="project-card"]',
      '.project-card',
      'div[role="button"]:has-text("프로젝트")',
      'button:has-text("프로젝트")',
      'div:has-text("프로젝트")'
    ];
    
    let projectFound = false;
    for (const selector of projectSelectors) {
      const count = await page.locator(selector).count();
      console.log(`Found ${count} elements with selector: ${selector}`);
      if (count > 0) {
        console.log('4. Clicking on first project...');
        await page.locator(selector).first().click();
        projectFound = true;
        break;
      }
    }
    
    if (!projectFound) {
      console.log('No project cards found with standard selectors. Taking screenshot of current page...');
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-4-no-projects.png'), fullPage: true });
      
      // Try to find any clickable elements that might be projects
      console.log('Looking for any clickable project elements...');
      const allText = await page.content();
      console.log('Page contains "프로젝트":', allText.includes('프로젝트'));
      
      // Try clicking on visible cards or items
      const cards = await page.locator('div[class*="card"], div[class*="Card"]').all();
      console.log(`Found ${cards.length} card-like elements`);
      
      if (cards.length > 0) {
        console.log('Clicking first card-like element...');
        await cards[0].click();
        projectFound = true;
      }
    }
    
    if (projectFound) {
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotDir, 'manual-test-5-project-modal.png'), fullPage: true });
      console.log('Screenshot saved: manual-test-5-project-modal.png');

      console.log('5. Looking for "할 일 추가" button...');
      const addTaskButton = page.locator('button:has-text("할 일 추가")');
      const addTaskCount = await addTaskButton.count();
      console.log(`Found ${addTaskCount} "할 일 추가" buttons`);
      
      if (addTaskCount > 0) {
        await addTaskButton.first().click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(screenshotDir, 'manual-test-6-task-form.png'), fullPage: true });
        console.log('Screenshot saved: manual-test-6-task-form.png');

        console.log('6. Scrolling to find "매뉴얼(SOP) 연결" field...');
        
        // Scroll within the modal
        await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          if (modal) {
            modal.scrollTop = modal.scrollHeight;
          }
        });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotDir, 'manual-test-7-scrolled.png'), fullPage: true });
        console.log('Screenshot saved: manual-test-7-scrolled.png');

        console.log('7. Looking for manual selector dropdown...');
        const manualSelectors = [
          'button:has-text("매뉴얼 선택 안함")',
          'button:has-text("매뉴얼")',
          '[placeholder*="매뉴얼"]',
          'div:has-text("매뉴얼(SOP) 연결")'
        ];
        
        let dropdownFound = false;
        for (const selector of manualSelectors) {
          const count = await page.locator(selector).count();
          console.log(`Found ${count} elements with selector: ${selector}`);
          if (count > 0) {
            console.log('8. Clicking manual selector dropdown...');
            await page.locator(selector).first().click();
            dropdownFound = true;
            break;
          }
        }
        
        if (dropdownFound) {
          await page.waitForTimeout(1500);
          await page.screenshot({ path: path.join(screenshotDir, 'manual-test-8-dropdown-open.png'), fullPage: true });
          console.log('Screenshot saved: manual-test-8-dropdown-open.png');

          console.log('9. Testing search functionality with "촬영"...');
          const searchInput = page.locator('input[type="text"], input[placeholder*="검색"]').last();
          const searchCount = await searchInput.count();
          console.log(`Found ${searchCount} search inputs`);
          
          if (searchCount > 0) {
            await searchInput.fill('촬영');
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(screenshotDir, 'manual-test-9-search-results.png'), fullPage: true });
            console.log('Screenshot saved: manual-test-9-search-results.png');

            // Check for results
            const dropdownContent = await page.locator('[role="listbox"], [role="menu"], div[class*="dropdown"]').last().textContent();
            console.log('Dropdown content:', dropdownContent);
            
            if (dropdownContent.includes('촬영')) {
              console.log('✅ Search results found!');
            } else if (dropdownContent.includes('결과가 없습니다') || dropdownContent.includes('No results')) {
              console.log('⚠️ No search results found');
            }
          } else {
            console.log('⚠️ Search input not found in dropdown');
          }
        } else {
          console.log('⚠️ Manual selector dropdown not found');
        }
      } else {
        console.log('⚠️ "할 일 추가" button not found');
      }
    } else {
      console.log('⚠️ Could not find or click on a project');
    }

    console.log('\n✅ Test completed!');
    console.log('All screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-test-error.png'), fullPage: true });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
