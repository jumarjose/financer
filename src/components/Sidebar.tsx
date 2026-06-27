/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTheme } from './ThemeContext';
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  Target,
  Trophy,
  Bot,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Sparkles,
  Menu,
  X,
  Trash2
} from 'lucide-react';
import { User } from 'firebase/auth';

type ViewType = 'dashboard' | 'finance' | 'agenda' | 'goals' | 'productivity' | 'ai';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  user: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onResetDatabase?: () => void;
}

export default function Sidebar({
  currentView,
  setView,
  user,
  onLogout,
  onLoginClick,
  isOpen,
  setIsOpen,
  onResetDatabase
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'finance', label: 'Controle Financeiro', icon: Wallet },
    { id: 'agenda', label: 'Agenda & Calendário', icon: Calendar },
    { id: 'goals', label: 'Metas & Poupança', icon: Target },
    { id: 'productivity', label: 'Produtividade', icon: Trophy },
    { id: 'ai', label: 'Assistente IA', icon: Bot, isHighlight: true },
  ];

  const handleNavClick = (viewId: string) => {
    setView(viewId as ViewType);
    setIsOpen(false); // Close mobile menu
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        id="sidebar-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 md:hidden text-slate-700 dark:text-slate-200 transition-colors"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Backdrop on Mobile */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        id="app-sidebar"
        className={`fixed md:sticky top-0 left-0 h-screen w-64 shrink-0 bg-white dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 p-5 flex flex-col justify-between z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 backdrop-blur-md shadow-lg dark:shadow-none`}
      >
        <div className="flex flex-col gap-8">
          {/* Logo Brand (Notion-style, minimalist) */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-600/30">
              F
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight">
                Financer
              </h1>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-1.5" id="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group border ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={`transition-colors ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.isHighlight && (
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar (Profile, Theme Toggle) */}
        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* User Section */}
          {user ? (
            <div className="flex items-center justify-between gap-2 px-2" id="sidebar-user-section">
              <div className="flex items-center gap-3 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800/80"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold text-sm ring-2 ring-indigo-50 dark:ring-indigo-900/30">
                    <UserIcon size={16} />
                  </div>
                )}
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-medium text-slate-800 dark:text-white truncate leading-tight">
                    {user.displayName || 'Usuário'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate uppercase tracking-widest leading-none mt-1">
                    Premium
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onResetDatabase && (
                  <button
                    id="sidebar-reset-db-btn"
                    onClick={onResetDatabase}
                    title="Limpar todos os dados"
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  id="sidebar-logout-btn"
                  onClick={onLogout}
                  title="Sair"
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              id="sidebar-login-btn"
              onClick={onLoginClick}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Sparkles size={14} />
              Entrar com Google
            </button>
          )}

          {/* Theme Switch & Meta details */}
          <div className="flex items-center justify-between px-2 text-slate-400 dark:text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">v1.1.0</span>
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:scale-105"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
