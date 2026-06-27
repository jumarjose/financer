/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Transaction, FinancialGoal } from '../types';

export function exportFinancialReport(
  transactions: Transaction[],
  goals: FinancialGoal[],
  monthLabel: string,
  totals: { income: number; expense: number; balance: number }
) {
  const doc = new jsPDF();
  
  // Set fonts & colors
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(31, 41, 55); // Gray-800
  
  // Header
  doc.text("Relatório Financeiro Pessoal", 20, 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(`Período de Referência: ${monthLabel}`, 20, 28);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 34);
  
  // Divider
  doc.setLineWidth(0.5);
  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.line(20, 40, 190, 40);
  
  // Summary Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text("Resumo Financeiro", 20, 50);
  
  // Summary Values
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Total Recebido (Entradas): R$ ${totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 58);
  doc.text(`Total Gasto (Saídas): R$ ${totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 64);
  
  doc.setFont("helvetica", "bold");
  const balanceColor = totals.balance >= 0 ? [16, 185, 129] : [239, 68, 68]; // Green vs Red
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(`Saldo Líquido: R$ ${totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, 72);
  
  // Divider
  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.line(20, 78, 190, 78);
  
  // Transactions Table Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text("Detalhamento de Transações", 20, 88);
  
  // Table Headers
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99); // Gray-600
  doc.text("Data", 20, 96);
  doc.text("Descrição", 45, 96);
  doc.text("Categoria", 100, 96);
  doc.text("Tipo", 140, 96);
  doc.text("Valor", 170, 96);
  
  doc.line(20, 99, 190, 99);
  
  let y = 105;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81); // Gray-700
  
  // Draw Transactions
  const sortedTrans = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const pageLimit = 270;
  
  sortedTrans.slice(0, 25).forEach((t) => {
    if (y > pageLimit) {
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Data", 20, y);
      doc.text("Descrição", 45, y);
      doc.text("Categoria", 100, y);
      doc.text("Tipo", 140, y);
      doc.text("Valor", 170, y);
      doc.line(20, y + 3, 190, y + 3);
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
    }
    
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const dParts = t.date.split('-');
    const formattedDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : t.date;
    
    // Text truncation for safety
    const truncatedDesc = t.description.length > 28 ? t.description.substring(0, 26) + "..." : t.description;
    const truncatedCat = t.category.charAt(0).toUpperCase() + t.category.slice(1);
    
    doc.text(formattedDate, 20, y);
    doc.text(truncatedDesc, 45, y);
    doc.text(truncatedCat, 100, y);
    doc.text(t.type === 'income' ? 'Entrada' : 'Saída', 140, y);
    
    if (t.type === 'income') {
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`+ R$ ${t.amount.toFixed(2)}`, 170, y);
    } else {
      doc.setTextColor(239, 68, 68); // Red
      doc.text(`- R$ ${t.amount.toFixed(2)}`, 170, y);
    }
    doc.setTextColor(55, 65, 81);
    
    y += 7;
  });

  if (goals.length > 0) {
    if (y > pageLimit - 40) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }
    
    // Divider
    doc.setDrawColor(209, 213, 219);
    doc.line(20, y, 190, y);
    y += 10;
    
    // Goals title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Metas de Economia Ativas", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    
    goals.forEach((g) => {
      const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      doc.text(`${g.title} (${g.category.toUpperCase()}): R$ ${g.currentAmount.toFixed(2)} de R$ ${g.targetAmount.toFixed(2)} (${pct}% concluído)`, 25, y);
      y += 6;
    });
  }
  
  // Save PDF
  doc.save(`Relatorio_Financeiro_${monthLabel.replace(' ', '_')}.pdf`);
}
