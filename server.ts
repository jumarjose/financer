/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Intelligent expense search
app.post("/api/ai/search", async (req, res) => {
  try {
    const { query, transactions } = req.body;
    if (!query) {
      return res.status(400).json({ error: "O campo 'query' é obrigatório." });
    }

    const ai = getAI();
    
    // Prepare transaction subset for the model to save tokens and prevent leaks
    const transactionSummary = (transactions || []).map((t: any) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type === 'income' ? 'entrada' : 'despesa',
      category: t.category,
      isPaid: t.isPaid ? 'pago/recebido' : 'pendente'
    }));

    const prompt = `
Você é o assistente de inteligência financeira do aplicativo "Gestor Financeiro e Agenda Inteligente".
O usuário fez a seguinte pergunta ou busca sobre seus gastos e finanças:
"${query}"

Abaixo está a lista de transações financeiras dele:
${JSON.stringify(transactionSummary, null, 2)}

Por favor, faça o seguinte:
1. Analise as transações e responda à pergunta do usuário de forma clara, amigável e concisa em português do Brasil.
2. Identifique quais transações específicas correspondem à busca dele e retorne esses detalhes.
3. Se houver cálculos de soma, média ou estatísticas solicitados ou implícitos, faça-os com precisão matemática.
4. Forneça uma dica útil e construtiva baseada nos dados analisados.

Retorne uma resposta em formato JSON contendo duas chaves:
- "answer": Resposta em texto Markdown com explicações, somas e formatação amigável.
- "matchingTransactionIndices": Um array de índices de transações da lista original fornecida que correspondem diretamente à busca (se aplicável, para realçar na tela). Ex: [0, 2, 5]. Se nenhuma corresponder ou for uma pergunta genérica, retorne array vazio.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText);
    res.json(result);
  } catch (error: any) {
    console.error("Erro na busca inteligente:", error);
    res.status(500).json({ error: "Erro ao processar busca inteligente. Verifique sua chave de API do Gemini." });
  }
});

// Future expenditure forecasting
app.post("/api/ai/forecast", async (req, res) => {
  try {
    const { transactions, goals } = req.body;
    
    const ai = getAI();

    const transactionSummary = (transactions || []).map((t: any) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type === 'income' ? 'entrada' : 'despesa',
      category: t.category,
      isPaid: t.isPaid ? 'pago/recebido' : 'pendente'
    }));

    const goalsSummary = (goals || []).map((g: any) => ({
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      category: g.category,
      deadline: g.deadline
    }));

    const prompt = `
Você é o analista financeiro inteligente do app de gestão pessoal.
Abaixo estão os dados financeiros reais do usuário.

Transações recentes:
${JSON.stringify(transactionSummary, null, 2)}

Metas financeiras:
${JSON.stringify(goalsSummary, null, 2)}

Por favor, faça uma análise detalhada e gere uma previsão de gastos futuros e saúde financeira para os próximos 3 meses.
Considere:
1. Padrões de gastos recorrentes (ex: assinaturas, aluguel, compras freqüentes).
2. Médias mensais de entradas e saídas.
3. Ritmo de economia atual vs. metas financeiras definidas (está no caminho certo? quanto precisa economizar por mês?).
4. Recomendações práticas e acionáveis de redução de custos e aumento de aportes em investimentos.

Retorne a resposta em formato JSON contendo:
- "forecastSummary": Texto em Markdown em português contendo a análise profunda de projeções, metas, padrões identificados e conselhos de economia detalhados.
- "projectedSavingsNextMonth": Número representando a economia líquida estimada para o próximo mês.
- "riskLevel": Uma string sendo 'low', 'medium' ou 'high' sobre o risco de estourar o orçamento baseado nos dados.
- "categoryRecommendations": Um array de objetos com recomendações de teto de gastos por categoria, ex: [{"category": "alimentacao", "limit": 500, "reason": "Gastos elevados com delivery detectados."}]
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText);
    res.json(result);
  } catch (error: any) {
    console.error("Erro na previsão inteligente:", error);
    res.status(500).json({ error: "Erro ao processar previsão financeira. Verifique sua chave de API do Gemini." });
  }
});

// Configure Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
