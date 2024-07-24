const puppeteer = require('puppeteer');

const link = 'https://inlandempire.craigslist.org/crg/d/san-bernardino-immediate-opportunity/7768939842.html';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the webpage
    await page.goto(link); // Replace with your target URL

    // Click the button
    await page.click('.reply-button'); // Replace with the correct selector for the button

    await new Promise(resolve => setTimeout(resolve, 999999));

    // Close the browser
    await browser.close();
})();
