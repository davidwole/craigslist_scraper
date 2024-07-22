const puppeteer = require('puppeteer');
// const nodemailer = require('nodemailer');
// const { Configuration, OpenAIApi } = require('openai');

const craigslistUrl = "https://roanoke.craigslist.org/search/wirtz-va/cpg?lat=37.0988&lon=-79.6826&search_distance=250";
const keywords = ['keyword1', 'keyword2', 'keyword3']; // Replace with your keywords

const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
};

// const openaiConfig = new Configuration({
//   apiKey: 'your-openai-api-key'
// });

// const openai = new OpenAIApi(openaiConfig);

async function checkListings() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(craigslistUrl, { waitUntil: 'networkidle2' });

  const listings = await page.$$eval('.result-row', rows => {
    return rows.map(row => ({
      title: row.querySelector('.result-title').innerText,
      url: row.querySelector('.result-title').href
    }));
  });

  for (const listing of listings) {
    if (keywords.some(keyword => listing.title.toLowerCase().includes(keyword.toLowerCase()))) {
      await page.goto(listing.url, { waitUntil: 'networkidle2' });

      const description = await page.$eval('#postingbody', el => el.innerText);
      const response = await generateResponse(description);
      await sendEmail(listing.title, listing.url, description, response);
    }
  }

  await browser.close();
}

async function generateResponse(description) {
  const prompt = `Create a response to the following Craigslist ad description:\n\n${description}\n\nResponse:`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt,
    max_tokens: 150
  });

  return response.data.choices[0].text.trim();
}

async function sendEmail(title, url, description, response) {
  const transporter = nodemailer.createTransport(emailConfig);

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'recipient-email@gmail.com',
    subject: `Response to Craigslist Ad: ${title}`,
    text: `Ad URL: ${url}\n\nAd Description:\n${description}\n\nResponse:\n${response}`
  };

  await transporter.sendMail(mailOptions);
  console.log(`Email sent for ad: ${title}`);
}

checkListings().catch(console.error);
