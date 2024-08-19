const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});


async function checkPostRelated(obj) {
  const prompt = `Does the following post state that it is looking for a freelance web designer, web developer, graphic designer, or 3D artist? If yes, reply "true"; if not, reply "false": ${obj.name} ${obj.body}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    obj.relevant = text.trim() === 'true';
}

async function checkPostsRelated(posts) {
  const promises = posts.map(post => checkPostRelated(post));
  await Promise.all(promises);
  return posts;
}


module.exports = {
  checkPostsRelated
};
