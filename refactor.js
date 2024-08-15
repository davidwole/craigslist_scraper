const puppeteer = require('puppeteer');

const urls = [
  'https://newjersey.craigslist.org/search/paterson-nj/cpg?lat=40.91&lon=-74.174&search_distance=1000#search=1~list~0~0',
  'https://wyoming.craigslist.org/search/boulder-wy/cpg?lat=42.7589&lon=-109.2776&search_distance=1000#search=1~list~0~0',
  'https://newjersey.craigslist.org/search/paterson-nj/crg?lat=40.91&lon=-74.174&search_distance=1000#search=1~list~0~0',
  'https://wyoming.craigslist.org/search/boulder-wy/crg?lat=42.7589&lon=-109.2776&search_distance=1000#search=1~list~0~0'
];

async function scrapeUrl(url) {
  console.log(`Scraper running at ${new Date().toLocaleTimeString()} for URL: ${url}`);
  
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
    
    await page.goto(url, { timeout: 0 });

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

    const now = new Date();
    const downTime = new Date(now - 6 * 60 * 60 * 1000);

    const filteredResults = results.filter(post => new Date(post.posted) >= downTime);

    console.log(filteredResults);
  
    
  } catch (error) {
    console.error('Error occurred during scraping:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log(`Scraper finished at ${new Date().toLocaleTimeString()} for URL: ${url}`);
  }
}


async function scrapeAllUrls(urls) {
  const scrapePromises = urls.map(url => scrapeUrl(url));
  await Promise.all(scrapePromises);
}


module.exports = {
  scrapeUrl,
  scrapeAllUrls
};
