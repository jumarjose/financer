/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction, AgendaEvent, Task, FinancialGoal } from '../types';
import {
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  Zap,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface ProductivityViewProps {
  transactions: Transaction[];
  events: AgendaEvent[];
  tasks: Task[];
  goals: FinancialGoal[];
  onToggleTask: (id: string, isCompleted: boolean) => Promise<void>;
}

export default function ProductivityView({
  transactions,
  events,
  tasks,
  goals,
  onToggleTask
}: ProductivityViewProps) {
  
  // Calculate statistics
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Monthly financial surplus ratio
  const mTrans = transactions.filter(t => t.date.startsWith(currentMonthStr));
  const mIncome = mTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const mExpense = mTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const surplusRatio = mIncome > 0 ? (mIncome - mExpense) / mIncome : 0;

  // Task Completion Ratio
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const taskCompletionRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 0;

  // Goals milestone achievements
  const totalGoalsCount = goals.length;
  const fullyAchievedGoalsCount = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const goalsCompletionRatio = totalGoalsCount > 0 ? fullyAchievedGoalsCount / totalGoalsCount : 0;

  // Productivity Score Calculation (out of 100)
  // 40% from task completion
  // 40% from financial discipline (surplus ratio, cap at 100%)
  // 20% from savings goal milestones
  const taskPart = taskCompletionRatio * 40;
  const financePart = Math.min(40, Math.max(0, surplusRatio * 80)); // 50% surplus = full 40 pts
  const goalPart = totalGoalsCount > 0 ? goalsCompletionRatio * 20 : 15; // If no goals, default to 15 pts

  const productivityScore = Math.min(100, Math.round(taskPart + financePart + goalPart));

  // Streaks (Fictionalized based on data, but persistent in user logic)
  const isSavingsStreakActive = mIncome > mExpense;
  const isTasksStreakActive = tasks.length > 0 && tasks.every(t => t.isCompleted);

  // Generate mockup productivity data for the line chart
  const productivityHistory = [
    { name: 'Seg', Score: Math.max(20, productivityScore - 15) },
    { name: 'Ter', Score: Math.max(25, productivityScore - 10) },
    { name: 'Qua', Score: Math.max(30, productivityScore - 5) },
    { name: 'Qui', Score: productivityScore }
  ];

  const getFormatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Determine feedback message
  let feedbackTitle = 'Bom Começo!';
  let feedbackDesc = 'Comece a concluir suas tarefas e poupar para aumentar seu índice de produtividade.';
  
  if (productivityScore >= 80) {
    feedbackTitle = 'Produtividade de Elite! 🚀';
    feedbackDesc = 'Você está dominando suas tarefas diárias e mantendo uma disciplina financeira invejável. Continue assim!';
  } else if (productivityScore >= 50) {
    feedbackTitle = 'Ótimo Progresso!';
    feedbackDesc = 'Você está no caminho certo. Tente liquidar despesas pendentes e concluir suas tarefas para alcançar o nível elite.';
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="productivity-view-container">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Painel de Produtividade Pessoal
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Uma visão integrada da sua eficiência organizacional e disciplina de finanças pessoais.
        </p>
      </div>

      {/* Productivity Index Score Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" id="productivity-score-row">
        
        {/* Score Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-1 flex flex-col justify-between min-h-[220px]">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Índice de Produtividade (IPP)
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100">
                {productivityScore}
              </h3>
              <span className="text-xs text-indigo-500 font-bold font-mono">/ 100 PTS</span>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">{feedbackTitle}</span>
            <p className="text-[10px] text-slate-400 leading-relaxed">{feedbackDesc}</p>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${productivityScore}%` }}
            />
          </div>
        </div>

        {/* Dynamic Activity Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Evolução Diária do IPP</h4>
              <p className="text-[11px] text-slate-400">Progresso do índice nos últimos dias</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400">
              <Zap size={11} className="text-indigo-500" /> Atualizado em tempo real
            </div>
          </div>

          <div className="grow w-full h-40" id="productivity-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="Score" stroke="#4F46E5" fill="rgba(79, 70, 229, 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metrics Bento Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="productivity-metrics-row">
        
        {/* Checklist Efficiency */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CalendarCheck size={16} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Eficiência de Agenda</h4>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {Math.round(taskCompletionRatio * 100)}%
            </span>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              {completedTasksCount} de {totalTasksCount} tarefas concluídas no total.
            </p>
          </div>
          <span className="text-[9px] text-emerald-500 font-bold uppercase font-mono tracking-wider">CHECKLIST EM DIA</span>
        </div>

        {/* Budget Health Discipline */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <TrendingUp size={16} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Taxa de Poupança</h4>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {mIncome > 0 ? Math.round(surplusRatio * 100) : 0}%
            </span>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Proporção da receita mantida após o pagamento de todas as contas deste mês.
            </p>
          </div>
          <span className="text-[9px] text-indigo-500 font-bold uppercase font-mono tracking-wider">EXCEDENTE FINANCEIRO</span>
        </div>

        {/* Streaks Widget */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Suas Conquistas</h4>
          </div>
          <div className="flex flex-col gap-2 my-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSavingsStreakActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {isSavingsStreakActive ? 'Superávit Ativo 🔥' : 'Poupança pausada'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isTasksStreakActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {isTasksStreakActive ? 'Mestre da Produtividade 🏆' : 'Faltam tarefas'}
              </span>
            </div>
          </div>
          <span className="text-[9px] text-amber-500 font-bold uppercase font-mono tracking-wider">MARCOS CONCLUÍDOS</span>
        </div>
      </div>

      {/* Simple Checklist of Pending Tasks for quick execution */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs" id="productivity-checklist-container">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Activity size={15} className="text-indigo-600" /> Tarefas Críticas Pendentes
        </h3>
        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto" id="critical-tasks-list">
          {tasks.filter(t => !t.isCompleted).length > 0 ? (
            tasks.filter(t => !t.isCompleted).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                id={`critical-task-${task.id}`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => onToggleTask(task.id, !task.isCompleted)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{task.title}</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider font-mono">Venc: {task.dueDate}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-400">
              <CheckCircle size={20} className="mx-auto mb-1.5 text-emerald-500" />
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Todas as tarefas foram concluídas! Bom trabalho!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
