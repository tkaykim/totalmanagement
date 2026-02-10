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
    console.log('Opening http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('Waiting 60 seconds - please manually interact with the page...');
    console.log('1. Log in if needed (tommy0621@naver.com / 123123)');
    console.log('2. Click on 매뉴얼 menu');
    console.log('3. Browse manuals');
    console.log('4. Check the TipTap editor');
    
    // Take screenshots every 10 seconds
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(10000);
      await page.screenshot({ path: path.join(screenshotDir, `manual-simple-${i}.png`), fullPage: true });
      console.log(`Screenshot ${i} saved`);
    }

    console.log('\n✅ Manual test completed!');
    console.log('Screenshots saved in .playwright-mcp directory');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'manual-simple-error.png'), fullPage: true });
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
