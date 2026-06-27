/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, FinancialGoal } from '../types';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  Send,
  Loader2,
  CalendarCheck,
  RefreshCw
} from 'lucide-react';

interface AiAssistantProps {
  transactions: Transaction[];
  goals: FinancialGoal[];
}

export default function AiAssistant({ transactions, goals }: AiAssistantProps) {
  // Chat state
  const [query, setQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Olá! Sou o seu Assistente Financeiro Inteligente. Você pode me fazer perguntas sobre seus gastos recentes ou pedir sugestões de economia.'
    }
  ]);

  // Forecast state
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<{
    forecastSummary: string;
    projectedSavingsNextMonth: number;
    riskLevel: 'low' | 'medium' | 'high';
    categoryRecommendations: Array<{ category: string; limit: number; reason: string }>;
  } | null>(null);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query;
    setQuery('');
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          transactions: transactions
        })
      });

      const data = await res.json();
      if (res.ok) {
        setChatHistory((prev) => [...prev, { sender: 'assistant', text: data.answer }]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { sender: 'assistant', text: data.error || 'Erro ao processar consulta.' }
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Houve uma falha na conexão com o assistente.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Generate projections handler
  const handleGenerateForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, goals })
      });

      const data = await res.json();
      if (res.ok) {
        setForecastResult(data);
      } else {
        alert(data.error || 'Falha ao gerar projeções futuras.');
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível conectar ao servidor de IA.');
    } finally {
      setForecastLoading(false);
    }
  };

  const getFormatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" id="ai-assistant-container">
      
      {/* Column 1: Projections & Forecasting Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Previsão Inteligente de Gastos</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Analise seus padrões de despesas, preveja orçamentos futuros para os próximos 3 meses e obtenha recomendações de tetos de consumo.
          </p>

          {!forecastResult ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center p-6">
              <Sparkles size={28} className="text-indigo-500 mb-3 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nenhum Relatório de Projeção Ativo</h4>
              <p className="text-[10px] text-slate-400 max-w-[280px] mb-4">
                Clique no botão abaixo para processar seus dados e criar projeções futuras com o Gemini AI.
              </p>
              <button
                id="generate-forecast-btn"
                onClick={handleGenerateForecast}
                disabled={forecastLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-all hover:scale-103"
              >
                {forecastLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={13} /> Gerar Previsão de Gastos
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-slide-down" id="forecast-result-panel">
              {/* Projections Key KPIs */}
              <div className="grid grid-cols-2 gap-3">
                {/* Projected savings next month */}
                <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Economia Próximo Mês</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {getFormatCurrency(forecastResult.projectedSavingsNextMonth)}
                  </span>
                </div>

                {/* Risk Level */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Risco Orçamentário</span>
                  <div className="flex items-center gap-1">
                    {forecastResult.riskLevel === 'high' ? (
                      <>
                        <ShieldAlert size={14} className="text-rose-500 animate-bounce" />
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase">Alto</span>
                      </>
                    ) : forecastResult.riskLevel === 'medium' ? (
                      <>
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase">Médio</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">Baixo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1">
                  <Lightbulb size={12} className="text-amber-500" /> Limites Recomendados por Categoria
                </h4>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {forecastResult.categoryRecommendations?.map((rec, i) => (
                    <div key={i} className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-slate-800 last:border-none pb-2 last:pb-0">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-700 dark:text-slate-300 capitalize">{rec.category}</span>
                        <span className="text-slate-900 dark:text-slate-100">Máx: {getFormatCurrency(rec.limit)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-normal">{rec.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forecast text */}
              <div className="grow max-h-[160px] overflow-y-auto border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal bg-white dark:bg-slate-900 shadow-inner">
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                  {forecastResult.forecastSummary}
                </div>
              </div>

              {/* Regerate Button */}
              <button
                id="regenerate-forecast-btn"
                onClick={handleGenerateForecast}
                disabled={forecastLoading}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                {forecastLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} /> Atualizar Previsão
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Chat Assistant Screen */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col h-[460px]" id="chat-assistant-screen">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
              <Bot size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">Chat Financeiro</h4>
              <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider font-mono">SUPORTE GEMINI AI</span>
            </div>
          </div>
        </div>

        {/* Message logs */}
        <div className="grow overflow-y-auto flex flex-col gap-3 pr-1 mb-3" id="chat-messages-logs">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-slate-800/40'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                {msg.sender === 'user' ? 'Você' : 'Assistente'}
              </span>
            </div>
          ))}
          {chatLoading && (
            <div className="self-start flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/40">
              <Loader2 size={12} className="animate-spin text-indigo-600" />
              <span className="text-xs text-slate-400">Analisando transações...</span>
            </div>
          )}
        </div>

        {/* Chat sender form */}
        <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0" id="chat-sender-form">
          <input
            type="text"
            id="chat-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite sua dúvida financeira..."
            className="grow px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            type="submit"
            id="chat-send-submit-btn"
            disabled={chatLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}
