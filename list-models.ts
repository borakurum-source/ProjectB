import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI();
async function run() {
  try {
    const models = await ai.models.list();
    for await (const m of models) {
      console.log(m.name);
    }
  } catch (e) { console.error(e); }
}
run();
