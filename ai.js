const OpenAI = require('openai');
const dotenv = require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

async function ai(){
  const response = await openai.completions.create({
    model: "gpt-3.5-turbo-instruct",
    prompt: "How far is the moon",
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  
  console.log(response.choices[0]);
}

ai();
