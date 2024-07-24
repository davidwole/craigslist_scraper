const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const { timeAgo } = require('./utils/time');
const { keywords } = require('./utils/keywords');


// Configure your email transport options
const transporter = nodemailer.createTransport({
    service: 'yahoo', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

const link = 'https://sfbay.craigslist.org/search/eby/cpg#search=1~list~0~0';

async function scrapeData(url) {;
  const browser = await puppeteer.launch({ headless: true,
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

      return timeDifference < 60 * 24; // Less than 5 minutes
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

 

  for(result of bodyFilteredResults){
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to: process.env.RECEIVER_EMAIL, // List of recipients
      subject: `Lead found: ${result.title}`, // Subject line
      text: `Title: ${result.title}\n\nDescription: \n${result.body}\n\nPosted ${timeAgo(result.posted)}\n\n${result.link}` // Email body
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent: ${result.title}`);
    } catch (error) {
      console.error(`Error sending email for ${result.title}:`, error);
    }
  }

  await browser?.close();
}  

scrapeData(link);