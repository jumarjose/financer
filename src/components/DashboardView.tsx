/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction, FinancialGoal, AgendaEvent, TRANSACTION_CATEGORIES } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  Plus,
  Target,
  Trophy,
  Activity,
  CalendarDays
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardViewProps {
  transactions: Transaction[];
  goals: FinancialGoal[];
  events: AgendaEvent[];
  setView: (view: any) => void;
  onQuickAdd: (type: 'income' | 'expense') => void;
}

export default function DashboardView({
  transactions,
  goals,
  events,
  setView,
  onQuickAdd
}: DashboardViewProps) {
  
  // Calculate financial statistics for the CURRENT MONTH
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));
  
  const incomeThisMonth = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseThisMonth = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Overall statistics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  // Pending/Upcoming Bills (Expenses not marked as paid, or due soon, from BOTH transactions and calendar/agenda bills)
  const pendingTransactions = transactions.filter(t => t.type === 'expense' && !t.isPaid).map(t => ({
    id: t.id,
    date: t.date,
    description: t.description,
    category: t.category,
    amount: t.amount,
    isEvent: false
  }));

  const pendingEvents = (events || [])
    .filter(e => e.type === 'bill' && !e.isCompleted)
    .map(e => ({
      id: e.id,
      date: e.start.substring(0, 10),
      description: e.title,
      category: 'contas',
      amount: e.amount || 0,
      isEvent: true
    }));

  const allPending = [...pendingTransactions, ...pendingEvents];
  const totalPendingAmount = allPending.reduce((sum, item) => sum + item.amount, 0);

  const upcomingPayments = allPending
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Category chart calculations for current month expenses
  const expenseByGroup = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc: { [key: string]: number }, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieChartData = Object.keys(expenseByGroup).map(category => {
    const config = TRANSACTION_CATEGORIES.find(c => c.value === category) || { label: category, color: '#9CA3AF' };
    return {
      name: config.label,
      value: expenseByGroup[category],
      color: config.color
    };
  });

  // Comparisons chart calculations (last 4 months)
  const getMonthName = (monthIdx: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[monthIdx];
  };

  const barChartData = Array.from({ length: 4 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (3 - i));
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const mTrans = transactions.filter(t => t.date.startsWith(mStr));
    const mIncome = mTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const mExpense = mTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: `${getMonthName(d.getMonth())}/${String(d.getFullYear()).substring(2)}`,
      Entradas: mIncome,
      Saídas: mExpense,
      Economia: Math.max(0, mIncome - mExpense)
    };
  });

  const getFormatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="dashboard-view-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Painel Geral
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Bem-vindo ao seu centro financeiro inteligente. Aqui está o resumo das suas contas.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            id="dash-add-income-btn"
            onClick={() => onQuickAdd('income')}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            Receita
          </button>
          <button
            id="dash-add-expense-btn"
            onClick={() => onQuickAdd('expense')}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            Despesa
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-bento-grid">
        {/* Card Saldo Atual */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Saldo Líquido</span>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={`text-2xl font-bold tracking-tight ${currentBalance >= 0 ? 'text-slate-900 dark:text-slate-50' : 'text-rose-600 dark:text-rose-400'}`}>
              {getFormatCurrency(currentBalance)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Saldo acumulado geral</span>
          </div>
        </div>

        {/* Card Entradas do Mês */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recebido no Mês</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {getFormatCurrency(incomeThisMonth)}
            </h3>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 mt-1">
              Ativo no mês corrente
            </span>
          </div>
        </div>

        {/* Card Despesas do Mês */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gasto no Mês</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {getFormatCurrency(expenseThisMonth)}
            </h3>
            <span className="text-[10px] text-rose-500 font-medium flex items-center gap-0.5 mt-1">
              Saídas acumuladas
            </span>
          </div>
        </div>

        {/* Card Contas Pendentes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Compromissos Pendentes</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {getFormatCurrency(totalPendingAmount)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {allPending.length} contas não quitadas
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" id="charts-and-bills-grid">
        
        {/* Comparison Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Comparativo Mensal</h4>
              <p className="text-[11px] text-slate-400">Fluxo de caixa dos últimos 4 meses</p>
            </div>
          </div>
          <div className="w-full h-64 min-h-[250px]" id="comparison-barchart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: '11px' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Economia" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category (Pie Chart) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Categorias de Despesa</h4>
              <p className="text-[11px] text-slate-400">Divisão dos gastos no mês atual</p>
            </div>
          </div>

          <div className="grow flex items-center justify-center min-h-[200px]" id="categories-piechart-container">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => getFormatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#F8FAFC' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 flex flex-col items-center justify-center text-slate-400">
                <Activity size={24} className="mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Nenhuma despesa adicionada este mês.</p>
              </div>
            )}
          </div>

          {/* Color Indicators Grid */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieChartData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Goals and Pending bills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="goals-and-upcoming-grid">
        
        {/* Metas Financeiras */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Target size={16} className="text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Metas Ativas</h4>
              </div>
              <button
                id="view-goals-link"
                onClick={() => setView('goals')}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center hover:underline"
              >
                Ver todas <ChevronRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 mt-2" id="dash-goals-list">
              {goals.length > 0 ? (
                goals.slice(0, 3).map((goal) => {
                  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  return (
                    <div key={goal.id} className="flex flex-col gap-1" id={`goal-${goal.id}`}>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{goal.title}</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>Poupado: {getFormatCurrency(goal.currentAmount)}</span>
                        <span>Alvo: {getFormatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 flex flex-col items-center justify-center">
                  <Trophy size={20} className="mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs">Defina suas primeiras metas para começar a poupar!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Próximos Compromissos de Pagamento */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={16} className="text-rose-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Próximos Pagamentos</h4>
              </div>
              <button
                id="view-agenda-link"
                onClick={() => setView('agenda')}
                className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center hover:underline"
              >
                Calendário <ChevronRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 mt-2" id="upcoming-payments-list">
              {upcomingPayments.length > 0 ? (
                upcomingPayments.map((bill) => {
                  const dateParts = bill.date.split('-');
                  const day = dateParts[2] ? String(parseInt(dateParts[2], 10)).padStart(2, '0') : '01';
                  const month = dateParts[1] ? String(parseInt(dateParts[1], 10)).padStart(2, '0') : '01';

                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      id={`upcoming-bill-${bill.id}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 w-10 h-10 rounded-lg shrink-0">
                          <span className="text-[10px] font-bold tracking-tight uppercase">Venc.</span>
                          <span className="text-xs font-black leading-none">{day}/{month}</span>
                        </div>
                        <div className="text-left overflow-hidden">
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                            {bill.description}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{bill.category}</span>
                            {bill.isEvent && (
                              <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-md tracking-wider uppercase font-sans shrink-0">
                                Agenda
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {getFormatCurrency(bill.amount)}
                        </span>
                        <span className="text-[9px] font-medium text-amber-500 uppercase flex items-center justify-end gap-0.5">
                          <Clock size={8} /> Pendente
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 flex flex-col items-center justify-center">
                  <Clock size={20} className="mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs">Não há pagamentos pendentes no horizonte!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
