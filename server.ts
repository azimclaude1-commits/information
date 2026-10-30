import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/diagnose", async (req, res) => {
    try {
      const { symbol, name, price, changePercent, lang } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(200).json({ fallback: true });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = lang === "zh"
        ? `你是一位资深机构量化分析师。请针对标的 ${symbol} (${name})，当前最新价 ${price}，24h涨跌幅 ${changePercent}%，出具一份专业的五维量化诊断报告。语言要极其专业、客观、简练，贴合真实券商研报风格（如高盛、摩根士丹利或Mitrade投研部），严禁出现“我是AI”等字眼。`
        : `You are a senior institutional quantitative analyst. Provide a professional 5-dimension quantitative diagnosis report for ${symbol} (${name}), current price ${price}, 24h change ${changePercent}%. Keep the tone strictly institutional, objective, and concise like a Goldman Sachs or Mitrade research desk note.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER },
              stance: { type: Type.STRING },
              targetPriceHigh: { type: Type.NUMBER },
              targetPriceLow: { type: Type.NUMBER },
              stopLossPrice: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              technicalNote: { type: Type.STRING },
              fundamentalNote: { type: Type.STRING },
              capitalFlowNote: { type: Type.STRING },
              riskWarning: { type: Type.STRING },
            },
            required: [
              "overallScore",
              "stance",
              "targetPriceHigh",
              "targetPriceLow",
              "stopLossPrice",
              "summary",
              "technicalNote",
              "fundamentalNote",
              "capitalFlowNote",
              "riskWarning",
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.status(200).json({ fallback: true });
      }
      return res.json(JSON.parse(text));
    } catch (error) {
      console.error("Diagnosis API fallback triggered:", error);
      return res.status(200).json({ fallback: true });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AlphaPulse Server running on http://localhost:${PORT}`);
  });
}

startServer();
