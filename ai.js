const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const { dummy } = require('./obj');


async function checkPostRelated(body) {
  const prompt = `Does the following post state that is looking for a freelance web designer, web developer, graphic designer, or 3D artist? If yes just replay "true" if not reply "false": ${body}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text =  response.text();

  return text;
}


console.log(response);

module.exports = {
  checkPostRelated,
}