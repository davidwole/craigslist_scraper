const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const { webdata } = require('./obj');
 

async function checkPostRelated(body) {
  const prompt = `Does the following post state that it is looking for a freelance web designer, web developer, graphic designer, or 3D artist? If yes, reply "true"; if not, reply "false": ${body}`;

  try { 
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
  
    return text.trim() === "true";
  } catch (error) {
    console.error(error)
  }
}

