/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinancialGoal, Transaction } from '../types';
import {
  Plus,
  Target,
  Trophy,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  Trash2,
  TrendingDown,
  Loader2,
  X
} from 'lucide-react';

interface GoalsViewProps {
  goals: FinancialGoal[];
  transactions: Transaction[];
  onAddGoal: (goal: Omit<FinancialGoal, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onUpdateGoalAmount: (id: string, newAmount: number) => Promise<void>;
}

export default function GoalsView({
  goals,
  transactions,
  onAddGoal,
  onDeleteGoal,
  onUpdateGoalAmount
}: GoalsViewProps) {
  // Goals form state
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState('Viagem');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aporte / Add savings state
  const [isAporteOpen, setIsAporteOpen] = useState<string | null>(null);
  const [aporteAmount, setAporteAmount] = useState('');

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount || !deadline) return;

    setIsSubmitting(true);
    try {
      await onAddGoal({
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        category,
        deadline
      });

      // Reset
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setIsOpenForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Savings logic (actual month calculations)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));
  
  const incomeThisMonth = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseThisMonth = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const actualSavingsThisMonth = Math.max(0, incomeThisMonth - expenseThisMonth);

  // Aggregate targets calculations
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const aggregatePercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Handle aporte submission
  const handleAporteSubmit = async (goalId: string, currentVal: number) => {
    const val = parseFloat(aporteAmount);
    if (isNaN(val) || val <= 0) return;

    try {
      await onUpdateGoalAmount(goalId, currentVal + val);
      setIsAporteOpen(null);
      setAporteAmount('');
    } catch (err) {
      console.error("Erro ao depositar aporte:", err);
    }
  };

  const getFormatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="goals-view-container">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Metas & Economias
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Defina seus objetivos financeiros de médio/longo prazo e gerencie seus aportes.
          </p>
        </div>

        <button
          id="open-goal-form-btn"
          onClick={() => setIsOpenForm(!isOpenForm)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus size={14} />
          Nova Meta
        </button>
      </div>

      {/* Aggregate Savings Summary Panel (Economômetro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="goals-economometro-panel">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Poupança Acumulada (Todas as Metas)
            </span>
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
              {getFormatCurrency(totalSaved)} <span className="text-xs font-normal text-slate-400">de {getFormatCurrency(totalTarget)}</span>
            </h3>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-slate-500">Progresso Geral</span>
              <span className="text-indigo-600 dark:text-indigo-400">{aggregatePercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${aggregatePercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Sua Economia este Mês (Surplus)
            </span>
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
              {getFormatCurrency(actualSavingsThisMonth)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Diferença líquida de entradas e saídas registradas neste mês. Use esse valor para fazer aportes em suas metas!
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Economômetro</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
            {goals.length === 0
              ? 'Defina metas e comece a poupar hoje para receber recomendações de taxas de economia ideal.'
              : actualSavingsThisMonth >= totalTarget * 0.05
              ? 'Parabéns! Sua taxa de economia atual é excelente e vai garantir que você atinja suas metas no prazo!'
              : 'Dica: Aumente suas economias mensais em cerca de R$ 150,00 para garantir que suas metas com prazos próximos sejam concluídas sem aperto.'}
          </p>
          <span className="text-[10px] font-bold font-mono text-indigo-500 block">DICA DE SAÚDE FINANCEIRA</span>
        </div>
      </div>

      {/* Collapsible Goal Creator Form */}
      {isOpenForm && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-slide-down" id="add-goal-form-container">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nova Meta Financeira</h3>
            <button
              onClick={() => setIsOpenForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="goal-form">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-title" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nome do Objetivo</label>
              <input
                type="text"
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 'Reserva de Emergência' ou 'Carro Novo'"
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-target-amount" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor Alvo (R$)</label>
              <input
                type="number"
                id="goal-target-amount"
                step="0.01"
                min="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-current-amount" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor Inicial Poupatório (R$)</label>
              <input
                type="number"
                id="goal-current-amount"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00"
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-category" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Categoria / Tipo</label>
              <select
                id="goal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Viagem">Viagem & Lazer</option>
                <option value="Reserva">Reserva de Emergência</option>
                <option value="Investimentos">Investimento / Patrimônio</option>
                <option value="Bens">Bens de Consumo (Carro, Casa, Celular)</option>
                <option value="Estudos">Estudos & Carreira</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="goal-deadline" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data Limite / Prazo</label>
              <input
                type="date"
                id="goal-deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end justify-end lg:col-span-3">
              <button
                type="submit"
                id="submit-goal-form-btn"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar Meta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid displaying active goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="active-goals-grid">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const isGoalAporteOpen = isAporteOpen === goal.id;

            // Date format YYYY-MM-DD -> DD/MM/YYYY
            const dParts = goal.deadline.split('-');
            const formattedDeadline = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : goal.deadline;

            return (
              <div
                key={goal.id}
                id={`goal-card-${goal.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400">
                      {goal.category}
                    </span>
                    <button
                      id={`delete-goal-btn-${goal.id}`}
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      title="Excluir Meta"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Title & Deadline */}
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 leading-snug">{goal.title}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-4">
                    <Calendar size={11} /> Prazo: {formattedDeadline}
                  </span>

                  {/* Progress bar info */}
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
                    <span className="text-slate-400">{getFormatCurrency(goal.currentAmount)} de {getFormatCurrency(goal.targetAmount)}</span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Aporte controller */}
                <div>
                  {isGoalAporteOpen ? (
                    <div className="flex gap-1.5 animate-slide-down" id={`aporte-form-${goal.id}`}>
                      <input
                        type="number"
                        id={`aporte-amount-input-${goal.id}`}
                        step="0.01"
                        min="0.01"
                        value={aporteAmount}
                        onChange={(e) => setAporteAmount(e.target.value)}
                        placeholder="Valor R$"
                        className="grow px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleAporteSubmit(goal.id, goal.currentAmount)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIsAporteOpen(null)}
                        className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`open-aporte-btn-${goal.id}`}
                      onClick={() => {
                        setIsAporteOpen(goal.id);
                        setAporteAmount('');
                      }}
                      className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <DollarSign size={13} />
                      Aporte R$ / Poupar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-10 text-slate-400 flex flex-col items-center justify-center">
            <Target size={30} className="mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-xs">Você não possui metas definidas. Clique em "Nova Meta" para planejar seu futuro!</p>
          </div>
        )}
      </div>
    </div>
  );
}
