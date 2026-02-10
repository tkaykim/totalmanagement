const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigate to http://localhost:3001');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '.playwright-mcp/attendance-step1-initial.png', fullPage: true });
    console.log('✓ Initial page loaded');

    console.log('\nStep 2: Login with admin credentials');
    
    // Clear any existing values first
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="password"]', '');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'finance@grigoent.co.kr');
    await page.fill('input[type="password"]', 'qwer1234!');
    await page.screenshot({ path: '.playwright-mcp/attendance-step2-login-filled.png', fullPage: true });
    
    // Click submit button
    await page.click('button[type="submit"]');
    
    // Wait for either error message or successful navigation
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.playwright-mcp/attendance-step3-after-login.png', fullPage: true });
    
    // Check if login was successful by looking for dashboard elements
    const url = page.url();
    console.log('Current URL:', url);
    
    // Check if we're still on login page
    const loginButton = await page.locator('button:has-text("로그인")').count();
    if (loginButton > 0) {
      console.log('⚠ Still on login page');
      
      // Check for error message
      const errorVisible = await page.locator('text=/Invalid|invalid|잘못|실패/i').isVisible().catch(() => false);
      if (errorVisible) {
        const errorMsg = await page.locator('text=/Invalid|invalid|잘못|실패/i').textContent();
        console.log('❌ Login error:', errorMsg);
        throw new Error('Login failed: ' + errorMsg);
      }
      
      throw new Error('Login failed: Still on login page but no error message visible');
    }
    
    console.log('✓ Logged in successfully');

    console.log('\nStep 3: Look for sidebar and navigate to 전체 근무현황');
    
    // Try to find the sidebar menu item
    const menuItem = await page.locator('text=전체 근무현황').first();
    if (await menuItem.isVisible({ timeout: 5000 })) {
      await menuItem.click();
      console.log('✓ Clicked on 전체 근무현황');
    } else {
      console.log('⚠ Menu item not immediately visible, checking sidebar state...');
      await page.screenshot({ path: '.playwright-mcp/attendance-step3b-sidebar-check.png', fullPage: true });
      
      // Try to click the menu item anyway
      await menuItem.click({ timeout: 10000 });
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/attendance-step4-admin-view-today.png', fullPage: true });
    console.log('✓ Navigated to attendance admin view');

    console.log('\nStep 4: Check current view for today (2026-02-10)');
    const todayDate = await page.textContent('text=/2026.*02.*10/i').catch(() => null);
    console.log('Current date shown:', todayDate || 'Date not found in expected format');
    
    // Check for status cards
    const statusCards = await page.locator('[class*="card"], [class*="Card"]').count();
    console.log('Number of status cards found:', statusCards);
    
    // Look for specific status labels
    const statuses = ['전체', '근무중', '퇴근', '휴가', '미출근', '자리비움', '연장근무'];
    for (const status of statuses) {
      const found = await page.locator(`text="${status}"`).count();
      console.log(`  - ${status}: ${found > 0 ? '✓ Found' : '✗ Not found'}`);
    }

    console.log('\nStep 5: Navigate to 2026-02-13 (click right arrow 3 times)');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`  Clicking right arrow (${i}/3)...`);
      
      // Try multiple selectors for the right arrow button
      const rightArrow = page.locator('button:has-text("›"), button:has-text("▶"), button:has-text(">"), [aria-label*="next"], [aria-label*="다음"]').first();
      
      if (await rightArrow.isVisible({ timeout: 3000 })) {
        await rightArrow.click();
        await page.waitForTimeout(1000);
      } else {
        console.log('  ⚠ Right arrow not found with standard selectors, trying alternative...');
        await page.screenshot({ path: `.playwright-mcp/attendance-step5-arrow-search-${i}.png`, fullPage: true });
        
        // Try clicking any button near the date
        await page.locator('button').nth(i + 5).click();
      }
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.playwright-mcp/attendance-step6-feb13-view.png', fullPage: true });
    console.log('✓ Navigated to Feb 13');

    console.log('\nStep 6: Check Feb 13 view for 장선우 with 휴가 status');
    const feb13Date = await page.textContent('text=/2026.*02.*13/i').catch(() => null);
    console.log('Current date shown:', feb13Date || 'Date not found');
    
    // Look for 장선우
    const jangSeonWoo = await page.locator('text=장선우').count();
    console.log('장선우 found:', jangSeonWoo > 0 ? '✓ Yes' : '✗ No');
    
    if (jangSeonWoo > 0) {
      // Check for 휴가 badge near 장선우
      const container = page.locator('text=장선우').locator('..').locator('..');
      const leaveStatus = await container.locator('text=휴가').count();
      console.log('휴가 status for 장선우:', leaveStatus > 0 ? '✓ Found' : '✗ Not found');
      
      // Check badge color (should be cyan/teal, not red)
      const badge = await container.locator('text=휴가').first().evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      }).catch(() => null);
      
      if (badge) {
        console.log('Badge styling:', badge);
      }
    }
    
    // Check for 휴가 status card in stats
    const leaveCard = await page.locator('text=휴가').count();
    console.log('휴가 status card in stats:', leaveCard > 0 ? '✓ Found' : '✗ Not found');

    console.log('\n✅ Test completed successfully!');
    console.log('\nScreenshots saved:');
    console.log('  - .playwright-mcp/attendance-step1-initial.png');
    console.log('  - .playwright-mcp/attendance-step2-login-filled.png');
    console.log('  - .playwright-mcp/attendance-step3-after-login.png');
    console.log('  - .playwright-mcp/attendance-step4-admin-view-today.png');
    console.log('  - .playwright-mcp/attendance-step6-feb13-view.png');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: '.playwright-mcp/attendance-error.png', fullPage: true });
    throw error;
  } finally {
    console.log('\nKeeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
