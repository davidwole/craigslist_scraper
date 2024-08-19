const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const { timeAgo } = require('./utils/time');
const { checkPostsRelated } = require('./ai');

const transporter = nodemailer.createTransport({
  service: 'yahoo', 
  auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
  }
});

async function scrapeUrl(urlObj, maxRetries = 3) {
  console.log(`Scraper running at ${new Date().toLocaleTimeString()} for URL: ${urlObj.name}`);
  
  let browser;
  let attempt = 0;

  while (attempt < maxRetries) {
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
          
          data.push({ title, link, posted });
        });
        return data;
      });

      const filteredResults = results.slice(0, 5);

      for (const result of filteredResults) {
        let postingBody;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            await page.goto(result?.link, { timeout: 0 });
            await page.waitForSelector('#postingbody', { timeout: 0 }); // Shorter timeout for retries
            
            postingBody = await page.evaluate(() => {
              return document.querySelector('#postingbody')?.innerText;
            });

            if (postingBody) break; // Exit retry loop if successful
          } catch (error) {
            retryCount++;
            console.error(`Retry ${retryCount} for #postingbody on ${result.title} failed.`);
            if (retryCount >= maxRetries) {
              console.error(`Max retries reached for #postingbody on ${result.title}. Skipping this post.`);
              break;
            }
          }
        }

        result.body = postingBody;
      }

      const now = new Date();
      const downTime = new Date(now - 15 * 60 * 1000);

      const recentPosts = filteredResults.filter(post => new Date(post.posted) >= downTime);

      console.log(`Found ${recentPosts.length} posts at ${new Date().toLocaleTimeString()} for ${urlObj.name}`);

      checkPostsRelated(recentPosts)
      .then(processedPosts => {
        console.log(`Processing ${processedPosts.length} posts for ${urlObj.name}`);
        if(processedPosts.length > 0){
          console.log(processedPosts);
        }
    
        const aiFilteredResults = recentPosts.filter(data => data.relevant === true);

        if(aiFilteredResults > 0){
          console.log(`Found ${aiFilteredResults.length} after processing for ${urlObj.name}`);
        }
        
        for (const result of aiFilteredResults) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVER_EMAIL,
            subject: `Lead found: ${result.title}`,
            text: `Title: ${result.title}\n\nDescription: \n${result.body}\n\nPosted ${timeAgo(result.posted)}\n\n${result.link}`
          };
    
          try {
            transporter.sendMail(mailOptions)
              .then(() => console.log(`Email sent: ${result.title}`))
              .catch(error => console.error(`Error sending email for ${result.title}:`, error));
          } catch (error) {
            console.error('Error during email sending:', error);
          }
        }
      })

      break; // Exit loop if successful

    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed for ${urlObj.name}:`, error.message);
      if (attempt >= maxRetries) {
        console.error(`Max retries reached for ${urlObj.name}. Skipping...`);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  console.log(`Scraper finished at ${new Date().toLocaleTimeString()} for ${urlObj.name}`);
}

async function scrapeAllUrls(urls) {
  const scrapePromises = urls.map(urlObj => scrapeUrl(urlObj));
  await Promise.all(scrapePromises);
}

async function runScraper(urls) { 
  while (true) { 
    console.log('Starting scraper cycle...'); 
    await scrapeAllUrls(urls); 
    console.log('Scraper cycle finished. Waiting for 5 minutes...'); 
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); 
  }
}

module.exports = {
  scrapeAllUrls,
  runScraper
};
