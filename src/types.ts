/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly';
  isPaid: boolean;
  receiptBase64?: string; // For attached receipts
  userId: string;
  createdAt: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO String
  end: string; // ISO String
  type: 'event' | 'bill';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  isCompleted: boolean;
  amount?: number; // Optional if type is 'bill'
  userId: string;
  googleEventId?: string; // For synced events
  createdAt: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline: string; // YYYY-MM-DD
  userId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string; // YYYY-MM-DD
  userId: string;
  createdAt: string;
}

export const TRANSACTION_CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação', color: '#EF4444', icon: 'Utensils' },
  { value: 'transporte', label: 'Transporte', color: '#3B82F6', icon: 'Car' },
  { value: 'lazer', label: 'Lazer', color: '#10B981', icon: 'Gamepad2' },
  { value: 'estudos', label: 'Estudos', color: '#F59E0B', icon: 'GraduationCap' },
  { value: 'contas', label: 'Contas/Fixas', color: '#8B5CF6', icon: 'CreditCard' },
  { value: 'investimentos', label: 'Investimentos', color: '#EC4899', icon: 'TrendingUp' },
  { value: 'outros', label: 'Outros', color: '#6B7280', icon: 'CircleHelp' },
];

export const INCOME_CATEGORIES = [
  { value: 'salario', label: 'Salário', color: '#10B981', icon: 'Briefcase' },
  { value: 'freela', label: 'Freelance', color: '#3B82F6', icon: 'Laptop' },
  { value: 'vendas', label: 'Vendas', color: '#F59E0B', icon: 'ShoppingBag' },
  { value: 'investimentos', label: 'Rendimentos', color: '#EC4899', icon: 'TrendingUp' },
  { value: 'outros', label: 'Outros', color: '#6B7280', icon: 'CircleHelp' },
];
