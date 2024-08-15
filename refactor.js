const puppeteer = require('puppeteer');

async function scrapeUrl(urlObj) {
  console.log(`Scraper running at ${new Date().toLocaleTimeString()} for URL: ${urlObj.name}`);
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,  
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(), 
    });
    
    const page = await browser.newPage();
    
    await page.goto(urlObj.link, { timeout: 0 });

    await page.waitForSelector('li.cl-search-result', { timeout: 0 });

    const results = await page.evaluate(() => {
      const data = [];

      document.querySelectorAll('li.cl-search-result').forEach(element => {
        const title = element.getAttribute('title');
        const link = element.querySelector('a.cl-app-anchor')?.getAttribute('href');
        const postedHTML = element.querySelector('.meta')?.innerHTML;
        const posted = postedHTML.slice(13, 74);

        data.push({
          title,
          link,
          posted
        });
      });

      return data;
    });

    console.log(results.slice(0, 5));
  
    
  } catch (error) {
    console.error(`Error occurred during scraping of ${urlObj.name}:`, error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log(`Scraper finished at ${new Date().toLocaleTimeString()} for ${urlObj.name}`);
  }
}


async function scrapeAllUrls(urls) {
  const scrapePromises = urls.map(urlObj => scrapeUrl(urlObj));
  await Promise.all(scrapePromises);
}


module.exports = {
  scrapeUrl,
  scrapeAllUrls
};
