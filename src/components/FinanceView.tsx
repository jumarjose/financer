/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction, TRANSACTION_CATEGORIES, INCOME_CATEGORIES } from '../types';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  FileDown,
  Sparkles,
  Paperclip,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  Pencil
} from 'lucide-react';
import { exportFinancialReport } from '../utils/pdf';

// Helper function to compress images using HTML5 canvas
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // 800px max dimension is perfect for receipt readability while keeping size very low
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.6 quality (60%), keeping the file under 50KB-80KB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface FinanceViewProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onUpdateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onTogglePaid: (id: string, isPaid: boolean) => Promise<void>;
  goals: any[];
  initialType?: 'income' | 'expense' | null;
  clearInitialType?: () => void;
}

export default function FinanceView({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onTogglePaid,
  goals,
  initialType,
  clearInitialType
}: FinanceViewProps) {
  // Local state for transaction form
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('alimentacao');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [isPaid, setIsPaid] = useState(false);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStartEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setType(t.type);
    setAmount(t.amount.toString());
    setDescription(t.description);
    setCategory(t.category);
    setDate(t.date);
    setRecurrence(t.recurrence);
    setIsPaid(t.isPaid);
    setReceiptBase64(t.receiptBase64 || null);
    setIsOpenForm(true);

    setTimeout(() => {
      const container = document.getElementById('add-transaction-form-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleCloseForm = () => {
    setEditingTransaction(null);
    setAmount('');
    setDescription('');
    setReceiptBase64(null);
    setIsPaid(false);
    setIsOpenForm(false);
  };

  // Sync state if redirected via Dashboard Quick Add
  useEffect(() => {
    if (initialType) {
      setType(initialType);
      setCategory(initialType === 'expense' ? 'alimentacao' : 'salario');
      setIsOpenForm(true);
      if (clearInitialType) {
        clearInitialType();
      }
    }
  }, [initialType, clearInitialType]);

  // Filter states
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  // AI Smart search states
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiMatchedIndices, setAiMatchedIndices] = useState<number[]>([]);

  // Receipt modal state
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // File Upload Handling with automatic compression to bypass Firestore document size limits (1MB)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setSubmitError(null);
        const compressed = await compressImage(file);
        setReceiptBase64(compressed);
      } catch (err: any) {
        console.error("Erro ao processar comprovante:", err);
        setSubmitError("Erro ao processar imagem do comprovante. Certifique-se de enviar uma imagem válida.");
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const transactionData: any = {
        amount: parseFloat(amount),
        description,
        type,
        category,
        date,
        recurrence,
        isPaid,
        receiptBase64: receiptBase64 || null
      };

      if (editingTransaction) {
        await onUpdateTransaction(editingTransaction.id, transactionData);
        setEditingTransaction(null);
      } else {
        await onAddTransaction(transactionData);
      }

      // Reset form
      setAmount('');
      setDescription('');
      setReceiptBase64(null);
      setIsPaid(false);
      setIsOpenForm(false);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Erro ao salvar a transação. Verifique os dados inseridos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI Intelligent Search
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    setAiMatchedIndices([]);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          transactions: transactions
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.answer);
        setAiMatchedIndices(data.matchingTransactionIndices || []);
      } else {
        setAiResponse(data.error || "Houve um erro ao processar a busca inteligente.");
      }
    } catch (error) {
      console.error("Erro na busca inteligente:", error);
      setAiResponse("Houve uma falha na conexão com o servidor de IA.");
    } finally {
      setAiLoading(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t, idx) => {
    // Month filter
    if (filterMonth && !t.date.startsWith(filterMonth)) return false;
    // Type filter
    if (filterType !== 'all' && t.type !== filterType) return false;
    // Category filter
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    // Search filter
    if (tableSearch.trim()) {
      const searchLower = tableSearch.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(searchLower);
      const catMatch = t.category.toLowerCase().includes(searchLower);
      return descMatch || catMatch;
    }
    return true;
  });

  // Export report to PDF
  const handleExportPDF = () => {
    const totals = filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );

    exportFinancialReport(
      filteredTransactions,
      goals,
      filterMonth || "Todos os Meses",
      totals
    );
  };

  const getFormatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="finance-view-container">
      {/* Header with quick trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Controle Financeiro
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie suas entradas e saídas, anexe comprovantes e filtre seus resultados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileDown size={14} />
            Exportar PDF
          </button>
          <button
            id="open-new-transaction-form-btn"
            onClick={() => {
              setIsOpenForm(!isOpenForm);
              setCategory(type === 'expense' ? 'alimentacao' : 'salario');
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all hover:scale-102"
          >
            <Plus size={14} />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Intelligent AI search section (Busca Inteligente) */}
      <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/40 dark:bg-indigo-950/10 shadow-xs" id="ai-smart-search-section">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={18} />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Busca Inteligente por IA</h3>
        </div>
        <form onSubmit={handleAiSearch} className="flex gap-2" id="ai-search-form">
          <input
            type="text"
            id="ai-search-input"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="Ex: 'Quanto gastei com mercado este mês?' ou 'Despesas pendentes com valor acima de 100 reais'"
            className="grow px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            id="ai-search-submit-btn"
            disabled={aiLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>
        </form>

        {aiResponse && (
          <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-xs" id="ai-search-response">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Insight do Assistente
            </h4>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              {aiResponse}
            </div>
            {aiMatchedIndices.length > 0 && (
              <span className="inline-block mt-2 text-[10px] text-indigo-500 font-semibold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-sm">
                💡 {aiMatchedIndices.length} transações destacadas na tabela abaixo!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Form for adding transaction */}
      {isOpenForm && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-slide-down" id="add-transaction-form-container">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {editingTransaction ? 'Editar Transação' : 'Adicionar Transação'}
            </h3>
            <button
              id="close-transaction-form-btn"
              onClick={handleCloseForm}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-rose-950/20 border border-red-100 dark:border-rose-900/30 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-fade-in" id="submit-error-banner">
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4" id="transaction-form">
            {/* Type selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</label>
              <div className="flex bg-slate-50 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  id="form-type-expense-btn"
                  onClick={() => {
                    setType('expense');
                    setCategory('alimentacao');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    type === 'expense'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Despesa / Saída
                </button>
                <button
                  type="button"
                  id="form-type-income-btn"
                  onClick={() => {
                    setType('income');
                    setCategory('salario');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    type === 'income'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Receita / Entrada
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form-description" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descrição</label>
              <input
                type="text"
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: 'Supermercado Silva' ou 'Salário Principal'"
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form-amount" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor (R$)</label>
              <input
                type="number"
                id="form-amount"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form-category" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Categoria</label>
              <select
                id="form-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                {type === 'expense'
                  ? TRANSACTION_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))
                  : INCOME_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form-date" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data</label>
              <input
                type="date"
                id="form-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Recurrence */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form-recurrence" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recorrência</label>
              <select
                id="form-recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="none">Única</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            {/* Paid Toggle & Receipt Upload */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Comprovante & Status</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Paid checkbox */}
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    id="form-is-paid"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {type === 'expense' ? 'Já Pago / Liquidado' : 'Já Recebido'}
                  </span>
                </label>

                {/* File Attachment Input */}
                <div className="relative">
                  <label className="flex items-center gap-2 justify-center cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
                    <Paperclip size={14} className="shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {receiptBase64 ? 'Comprovante Anexado!' : 'Anexar Comprovante'}
                    </span>
                    <input
                      type="file"
                      id="form-receipt-upload"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                  {receiptBase64 && (
                    <button
                      type="button"
                      onClick={() => setReceiptBase64(null)}
                      className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-500 text-white hover:bg-rose-600"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-end justify-end md:col-span-1 gap-2 w-full md:w-auto">
              {editingTransaction && (
                <button
                  type="button"
                  id="cancel-edit-transaction-btn"
                  onClick={handleCloseForm}
                  className="w-full md:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                id="submit-transaction-form-btn"
                disabled={isSubmitting}
                className="grow md:grow-0 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : editingTransaction ? (
                  <Pencil size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {editingTransaction ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Panel */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4" id="filters-panel">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Filter size={14} />
            <span className="text-xs font-semibold uppercase">Filtros:</span>
          </div>

          {/* Month selector */}
          <input
            type="month"
            id="filter-month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          />

          {/* Type Selector */}
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Tipos (Todos)</option>
            <option value="income">Entradas / Receitas</option>
            <option value="expense">Saídas / Despesas</option>
          </select>

          {/* Category Selector */}
          <select
            id="filter-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Categorias (Todas)</option>
            {[...TRANSACTION_CATEGORIES, ...INCOME_CATEGORIES]
              .filter((v, i, self) => self.findIndex(t => t.value === v.value) === i)
              .map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
          </select>
        </div>

        {/* Text search */}
        <div className="relative shrink-0 w-full sm:w-48">
          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            id="table-search-input"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden" id="transactions-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="transactions-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recorrência</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                <th className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t, idx) => {
                  const bDate = new Date(t.date);
                  const formattedDate = !isNaN(bDate.getTime())
                    ? bDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : t.date;
                    
                  const isHighlighted = aiMatchedIndices.includes(idx);

                  return (
                    <tr
                      key={t.id}
                      id={`transaction-row-${t.id}`}
                      className={`border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${
                        isHighlighted ? 'bg-indigo-50/50 dark:bg-indigo-950/20 shadow-inner' : ''
                      }`}
                    >
                      {/* Paid Status Toggle */}
                      <td className="p-3">
                        <button
                          id={`toggle-paid-btn-${t.id}`}
                          onClick={() => onTogglePaid(t.id, !t.isPaid)}
                          title={t.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                          className="focus:outline-hidden"
                        >
                          {t.isPaid ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} /> {t.type === 'income' ? 'Recebido' : 'Pago'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full animate-pulse">
                              <XCircle size={10} /> Pendente
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {formattedDate}
                      </td>

                      {/* Description */}
                      <td className="p-3">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {t.description}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {t.category}
                        </span>
                      </td>

                      {/* Recurrence */}
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {t.recurrence === 'none' ? 'Única' : t.recurrence}
                      </td>

                      {/* Amount */}
                      <td className="p-3 text-right">
                        <span
                          className={`text-xs font-bold ${
                            t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'} {getFormatCurrency(t.amount)}
                        </span>
                      </td>

                      {/* Actions (View Receipt, Edit, Delete) */}
                      <td className="p-3 flex items-center justify-center gap-2">
                        {t.receiptBase64 && (
                          <button
                            id={`view-receipt-btn-${t.id}`}
                            onClick={() => setViewingReceipt(t.receiptBase64 || null)}
                            title="Ver Comprovante Anexo"
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          id={`edit-transaction-btn-${t.id}`}
                          onClick={() => handleStartEdit(t)}
                          title="Editar Transação"
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-transaction-btn-${t.id}`}
                          onClick={() => onDeleteTransaction(t.id)}
                          title="Excluir Transação"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhuma transação encontrada para as condições selecionadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Viewing Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="receipt-modal">
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Comprovante de Pagamento</h4>
              <button
                id="close-receipt-modal-btn"
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-center max-h-[400px] overflow-auto">
              <img src={viewingReceipt} alt="Comprovante" className="max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
