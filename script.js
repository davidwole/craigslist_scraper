const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const { timeAgo } = require('./utils/time');
const { checkPostsRelated } = require('./ai');

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.RECEIVER_EMAIL) {
  throw new Error('Missing required environment variables for email configuration');
}

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

  let page;

  try {
    page = await browser.newPage();

    await safeGoto(page, url);

    // Wait for the results to load
    await page.waitForSelector('li.cl-search-result');

    const results = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('li.cl-search-result').forEach(element => {
        const title = element.getAttribute('title') || 'No Title';
        const link = element.querySelector('a.cl-app-anchor')?.getAttribute('href') || 'No Link';
        const postedHTML = element.querySelector('.meta')?.innerHTML || '';
        const posted = postedHTML.slice(13, 74).trim() || 'Unknown Date';

        data.push({
          title,
          link,
          posted
        });
      });

      return data;
    });

    const filteredResults = results.slice(0, 5);

    for (const result of filteredResults) {
      if (result.link !== 'No Link') {
        await safeGoto(page, result.link);

        const postingBody = await page.evaluate(() => {
          return document.querySelector('#postingbody')?.innerText || 'No description available';
        });

        result.body = postingBody;
      } else {
        result.body = 'No description available';
      }
    }

    const now = new Date();
    const eightMinutesAgo = new Date(now - 8 * 60 * 1000);

    const recentPosts = filteredResults.filter(post => new Date(post.posted) >= eightMinutesAgo);

    console.log(recentPosts);

    const processedPosts = await checkPostsRelated(recentPosts);
    if (processedPosts.length > 0) {
      console.log(processedPosts);
    }

    const aiFilteredResults = processedPosts.filter(data => data.relevant === true);

    for (const result of aiFilteredResults) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL,
        subject: `Lead found: ${result.title}`,
        text: `Title: ${result.title}\n\nDescription: \n${result.body}\n\nPosted ${timeAgo(result.posted)}\n\n${result.link}`
      };

      await sendEmail(mailOptions);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Add delay between emails
    }

  } catch (error) {
    console.error('Error scraping data:', error);
  } finally {
    await page?.close();
    await browser.close();
  }
}

// Function to safely navigate to a URL with retries
async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (error) {
      console.error(`Failed to load ${url}, retrying... (${i + 1}/${retries})`);
      if (i === retries - 1) throw error;
    }
  }
}

// Function to send an email
async function sendEmail(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${mailOptions.subject}`);
  } catch (error) {
    console.error(`Error sending email for ${mailOptions.subject}:`, error);
  }
}

// Function to scrape all URLs concurrently
async function scrapeAllData() {
  try {
    await Promise.all(urls.map(url => scrapeData(url)));
  } catch (error) {
    console.error('Error scraping data:', error);
  }

  setTimeout(scrapeAllData, 5 * 60 * 1000); // Re-run after 5 minutes
}

module.exports = {
  urls,
  scrapeAllData
}
