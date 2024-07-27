const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const { timeAgo } = require('./utils/time');
const { 
  checkPostsRelated
} = require('./ai');

const transporter = nodemailer.createTransport({
  service: 'yahoo', // Use your email service (e.g., 'gmail', 'outlook', etc.)
  auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email password or app-specific password
  }
});

const urls = [
  'https://newjersey.craigslist.org/search/paterson-nj/cpg?lat=40.91&lon=-74.174&search_distance=1000#search=1~list~0~0',
  'https://wyoming.craigslist.org/search/boulder-wy/cpg?lat=42.7589&lon=-109.2776&search_distance=1000#search=1~list~0~0',
  'https://newjersey.craigslist.org/search/paterson-nj/crg?lat=40.91&lon=-74.174&search_distance=1000#search=1~list~0~0',
  'https://wyoming.craigslist.org/search/boulder-wy/crg?lat=42.7589&lon=-109.2776&search_distance=1000#search=1~list~0~0'
];

async function scrapeData(url) {
  const browser = await puppeteer.launch({ 
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

try{

  const page = await browser.newPage();
    
  await page.goto(url, {timeout: 0});

  await new Promise(resolve => setTimeout(resolve, 5000));

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


  const currentTime = new Date();
  const filteredResults = results?.filter(result => {
      const postedTime = new Date(result.posted);
      const timeDifference = (currentTime - postedTime) / (1000 * 60); // Difference in minutes

      return timeDifference < 60 * .10; 
  });
  
  let bodyFilteredResults = [];

  for(result of filteredResults){
    await page.goto(result?.link, {timeout: 0});

    const postingBody = await page.evaluate(() => {
      return document.querySelector('#postingbody')?.innerText;
    });

    result.body = postingBody;

    bodyFilteredResults.push(result);
  }

  console.log(bodyFilteredResults);

  checkPostsRelated(bodyFilteredResults)
  .then(processedPosts => {
    const aiFilteredResults = processedPosts.filter(data => data.relevant === true);

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
  .catch(error => {
    console.error('Overall error:', error);
  });

} catch(error){
  console.error(error)
} finally {
  await browser?.close();
}

} 

async function scrapeAllData() {
  try {
    for (const url of urls) {
      console.log(`Scraper running for ${url}`);
      await scrapeData(url); // Wait for scraping to finish before moving on
    }
  } catch (error) {
    console.error(error);
  }
}


module.exports = {
  urls,
  scrapeAllData
}

