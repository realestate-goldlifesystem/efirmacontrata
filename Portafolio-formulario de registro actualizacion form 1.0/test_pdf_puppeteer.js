import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capturar console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  console.log("Navigating to localhost:3001...");
  await page.goto('http://127.0.0.1:3001/efirmacontrata/frontend/portafolio/', { waitUntil: 'networkidle2' });

  console.log("Waiting for properties to load...");
  await page.waitForSelector('h2', { timeout: 10000 });

  console.log("Selecting the first property...");
  const checkboxes = await page.$$('div.absolute.top-4.left-4.z-10');
  if (checkboxes.length > 0) {
    await checkboxes[0].click();
  }

  console.log("Clicking Generate PDF...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.textContent.includes('Portafolio'));
    if(target) target.click();
  });
  console.log('Clicked! Waiting 10s...');
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
