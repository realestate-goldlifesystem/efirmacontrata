import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capturar console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  console.log("Navigating to localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log("Waiting for properties to load...");
  await page.waitForSelector('h2', { timeout: 10000 });

  console.log("Selecting the first property...");
  const checkboxes = await page.$$('div.absolute.top-4.left-4.z-10');
  if (checkboxes.length > 0) {
    await checkboxes[0].click();
  }

  console.log("Clicking Generate PDF...");
  const buttons = await page.$$('button');
  let genBtn = null;
  for (let btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Portafolio (PDF)')) {
      genBtn = btn;
      break;
    }
  }

  if (genBtn) {
    await genBtn.click();
    console.log("Wait 15 seconds for PDF generation to log errors...");
    await new Promise(r => setTimeout(r, 15000));
  } else {
    console.log("Generate PDF button not found!");
  }

  await browser.close();
})();
