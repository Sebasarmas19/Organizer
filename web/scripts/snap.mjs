import puppeteer from 'puppeteer-core';
import path from 'path';

async function main() {
  const outputPath = process.argv[2] || path.join(process.cwd(), 'screenshot-mobile.png');
  const width = parseInt(process.argv[3]) || 390;
  const height = parseInt(process.argv[4]) || 844;

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/landing', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Smooth scroll down to activate all ScrollTriggers, then scroll back to top
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 60);
    });
  });

  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
  console.log(`Screenshot (${width}x${height}) saved to:`, outputPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
