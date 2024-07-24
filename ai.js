const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const { webdata } = require('./obj');
 

async function checkPostRelated(body) {
  const prompt = `Does the following post state that it is looking for a freelance web designer, web developer, graphic designer, or 3D artist? If yes, reply "true"; if not, reply "false": ${body}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();

  return text.trim() === "true";
}

async function filterDataByRelatedPosts(data) {
  const filteredData = [];

  for (const item of data) {
    const isRelated = await checkPostRelated(item.body);
    if (isRelated) {
      filteredData.push(item);
    }
  }

  return filteredData;
}



module.exports = {
  filterDataByRelatedPosts
}