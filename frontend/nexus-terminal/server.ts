import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely on server side
// We check if API key exists and lazy-handle or fail gracefully
const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in the environment. AI features will fail gracefully.');
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const ai = getGeminiClient();

// API route for stock AI Summary
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { symbol, name, stats, sector } = req.body;
    
    if (!ai) {
      return res.status(503).json({ 
        error: 'Gemini API is not configured. Please set GEMINI_API_KEY in the secrets menu.' 
      });
    }

    if (!symbol || !name) {
      return res.status(400).json({ error: 'Stock symbol and name are required' });
    }

    const prompt = `Perform a highly professional, concise, bulleted Wall Street investment analysis for ${name} (${symbol}) in Turkish language. 
    Include:
    1. Short-term and long-term outlook.
    2. Primary risk factors and competitive moats.
    3. Key metrics review based on: Sector: ${sector}, P/E: ${stats.pe}, P/B: ${stats.pb}, ROE: ${stats.roe}%, Revenue Growth: ${stats.revenueGrowth}%, Div Yield: ${stats.divYield}%.
    Ensure the tone is elegant, institutional, objective, and styled in clean markdown with elegant formatting. Do not use verbose intro or outro.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a Senior Quantitative Equity Research Analyst at a top-tier institutional hedge fund. Provide deep, structured, precise, and professional investment commentary in Turkish.',
        temperature: 0.2,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with Gemini' });
  }
});

// API route for Portfolio General Report Analysis
app.post('/api/gemini/portfolio-report', async (req, res) => {
  try {
    const { holdings, totalValue, totalReturn, reportType } = req.body;

    if (!ai) {
      return res.status(503).json({ 
        error: 'Gemini API is not configured. Please set GEMINI_API_KEY in the secrets menu.' 
      });
    }

    let reportTitle = "Genel Portföy Durum Analizi";
    let systemRole = "You are a Chief Investment Officer (CIO) at a premier private wealth asset management firm.";
    let detailsPrompt = "";

    if (reportType === 'risk') {
      reportTitle = "Risk ve Çeşitlendirme Değerlendirmesi";
      detailsPrompt = "Analyze sector concentrations, potential correlations, interest rate sensitivities, and hedging recommendations.";
    } else if (reportType === 'recommendations') {
      reportTitle = "Stratejik Al-Sat ve Portföy Optimizasyonu";
      detailsPrompt = "Formulate precise strategic rebalancing moves, tax-loss harvesting tips, and optimal entry weights.";
    } else {
      detailsPrompt = "Provide an overall macroeconomic analysis, portfolio yield summary, growth path analysis, and institutional executive summary.";
    }

    const holdingsText = holdings.map((h: any) => `- ${h.symbol}: Qty ${h.quantity} @ Cost $${h.costPrice} (Current: $${h.currentPrice})`).join('\n');

    const prompt = `Lütfen aşağıdaki portföy verilerine dayanarak Türkçe dilinde bir "${reportTitle}" raporu hazırla.
    
    Portföy İstatistikleri:
    - Toplam Değer: $${totalValue}
    - Toplam Getiri / P&L: %${totalReturn}
    - Mevcut Pozisyonlar:
    ${holdingsText}
    
    Analiz Kuralları:
    - ${detailsPrompt}
    - Rapor son derece profesyonel, objektif ve kurum seviyesinde olsun.
    - Markdown başlıklarını, kalın metinleri ve listeleri zarifçe kullan.
    - Gereksiz giriş-çıkış cümleleri yazmadan doğrudan analiz başlıklarına geç.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemRole,
        temperature: 0.3,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini Portfolio Report Error:', error);
    res.status(500).json({ error: error.message || 'Error generating portfolio analysis' });
  }
});

// Configure Vite middleware or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files serving mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Terminal server running on port ${PORT}`);
  });
}

startServer();
