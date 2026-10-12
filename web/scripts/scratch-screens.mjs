import puppeteer from 'puppeteer-core';
import path from 'node:path';

const outDir = 'C:/Users/sebastian/.gemini/antigravity-cli/brain/2a53789d-6fd6-4e8a-bffd-8aebb637498e';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to landing page...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('Taking landing hero screenshot...');
  await page.screenshot({ path: path.join(outDir, 'landing-hero.png'), clip: { x: 0, y: 0, width: 1440, height: 950 } });

  console.log('Taking landing full page screenshot...');
  await page.screenshot({ path: path.join(outDir, 'landing-full.png'), fullPage: true });

  console.log('Taking login page screenshot...');
  await page.goto('http://localhost:3000/entrar', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, 'login-page.png') });

  console.log('Taking mobile landing screenshot...');
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, 'landing-mobile.png') });

  await browser.close();
  console.log('Done capturing screenshots!');
}

run().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
