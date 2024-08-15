const puppeteer = require('puppeteer');

async function scrapeUrl(){
  console.log(`Scraper running at ${new Date().toLocaleTimeString()}`);
  const browser = await puppeteer.launch({ 
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

  await page.goto('https://newjersey.craigslist.org/search/paterson-nj/cpg?lat=40.91&lon=-74.174&search_distance=1000#search=1~list~0~0', { timeout: 0 });

  // Wait for the list items to load
  await page.waitForSelector('li.cl-search-result', { timeout: 0 });

  // Get the element's text content
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

  await browser.close();
  console.log(`Scraper finished at ${new Date().toLocaleTimeString()}`);
});

module.exports = {
  scrapeUrl
};
