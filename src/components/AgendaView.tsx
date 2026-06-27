/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AgendaEvent, Task } from '../types';
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ListTodo,
  Sparkles,
  Trash2,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { getAccessToken } from '../firebase';

interface AgendaViewProps {
  events: AgendaEvent[];
  tasks: Task[];
  onAddEvent: (event: Omit<AgendaEvent, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onToggleEventCompleted: (id: string, isCompleted: boolean) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleTask: (id: string, isCompleted: boolean) => Promise<void>;
  googleAccessToken: string | null;
  onSyncGoogleCalendar: () => Promise<void>;
  isSyncing: boolean;
}

export default function AgendaView({
  events,
  tasks,
  onAddEvent,
  onDeleteEvent,
  onToggleEventCompleted,
  onAddTask,
  onDeleteTask,
  onToggleTask,
  googleAccessToken,
  onSyncGoogleCalendar,
  isSyncing
}: AgendaViewProps) {
  // Calendar Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Event Form State
  const [isOpenEventForm, setIsOpenEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<'event' | 'bill'>('event');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('12:00');
  const [eventRecurrence, setEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [eventAmount, setEventAmount] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Selected Day (defaults to today)
  const [selectedDayStr, setSelectedDayStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calendar generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  // Create an array for calendar rendering
  const daysArray = [];

  // Padding from previous month
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    daysArray.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  // Padding from next month to complete standard 6 rows (42 cells)
  const remainingCells = 42 - daysArray.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysArray.push({
      day: i,
      isCurrentMonth: false,
      dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  // Filter events of the current month
  const getEventsForDay = (dateStr: string) => {
    return events.filter(e => e.start.startsWith(dateStr));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Create Event Submission
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    setIsSubmittingEvent(true);
    try {
      const startIso = `${eventDate}T${eventTime}:00`;
      // Calculate end date (default 1 hour after start)
      const startDateObj = new Date(startIso);
      startDateObj.setHours(startDateObj.getHours() + 1);
      const endIso = startDateObj.toISOString();

      await onAddEvent({
        title: eventTitle,
        description: eventDesc || undefined,
        start: startIso,
        end: endIso,
        type: eventType,
        recurrence: eventRecurrence,
        isCompleted: false,
        amount: eventType === 'bill' && eventAmount ? parseFloat(eventAmount) : undefined
      });

      // Clear fields
      setEventTitle('');
      setEventDesc('');
      setEventAmount('');
      setIsOpenEventForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Create Task Submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmittingTask(true);
    try {
      await onAddTask({
        title: taskTitle,
        isCompleted: false,
        dueDate: selectedDayStr
      });
      setTaskTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const getMonthLabel = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[month]} de ${year}`;
  };

  const activeEventsOnSelectedDay = getEventsForDay(selectedDayStr);
  const activeTasksOnSelectedDay = tasks.filter(t => t.dueDate === selectedDayStr);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="agenda-view-container">
      
      {/* Calendar & Scheduling Main Side (2 cols) */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Agenda & Calendário
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Organize seus compromissos, agende faturas e sincronize tudo com o Google Calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {googleAccessToken ? (
              <button
                id="google-calendar-sync-btn"
                onClick={onSyncGoogleCalendar}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 transition-all flex items-center gap-1.5 shadow-xs shrink-0"
              >
                {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Sincronizar Google Calendar
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono italic px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-sm">
                Conecte-se com Google para sincronizar
              </span>
            )}
            <button
              id="new-event-form-trigger-btn"
              onClick={() => setIsOpenEventForm(!isOpenEventForm)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <Plus size={14} />
              Novo Item
            </button>
          </div>
        </div>

        {/* Collapsible New Event Form */}
        {isOpenEventForm && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm" id="event-form-container">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Novo Compromisso ou Pagamento</h3>
              <button onClick={() => setIsOpenEventForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="event-form">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="event-title-input" className="text-[11px] font-semibold text-slate-400">Título / Nome</label>
                <input
                  type="text"
                  id="event-title-input"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ex: 'Consulta médica' ou 'Fatura de Energia'"
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="event-type-select" className="text-[11px] font-semibold text-slate-400">Tipo</label>
                <select
                  id="event-type-select"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value="event">Evento / Lembrete</option>
                  <option value="bill">Fatura / Pagamento</option>
                </select>
              </div>

              {eventType === 'bill' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="event-amount-input" className="text-[11px] font-semibold text-slate-400">Valor da Fatura (R$)</label>
                  <input
                    type="number"
                    id="event-amount-input"
                    step="0.01"
                    min="0"
                    value={eventAmount}
                    onChange={(e) => setEventAmount(e.target.value)}
                    placeholder="0.00"
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label htmlFor="event-date-input" className="text-[11px] font-semibold text-slate-400">Data</label>
                <input
                  type="date"
                  id="event-date-input"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="event-time-input" className="text-[11px] font-semibold text-slate-400">Horário</label>
                <input
                  type="time"
                  id="event-time-input"
                  required
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="event-desc-input" className="text-[11px] font-semibold text-slate-400">Descrição (Opcional)</label>
                <input
                  type="text"
                  id="event-desc-input"
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Mais informações..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="event-recurrence-select" className="text-[11px] font-semibold text-slate-400">Recorrência</label>
                <select
                  id="event-recurrence-select"
                  value={eventRecurrence}
                  onChange={(e) => setEventRecurrence(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value="none">Única</option>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>

              <div className="flex items-end justify-end sm:col-span-3 pt-2">
                <button
                  type="submit"
                  id="submit-event-btn"
                  disabled={isSubmittingEvent}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1"
                >
                  {isSubmittingEvent ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Adicionar à Agenda
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Calendar Grid Container */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col" id="calendar-grid-container">
          
          {/* Month Navigator Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{getMonthLabel()}</h3>
            <div className="flex items-center gap-1">
              <button
                id="calendar-prev-month-btn"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold"
              >
                Anterior
              </button>
              <button
                id="calendar-next-month-btn"
                onClick={handleNextMonth}
                className="p-1 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold"
              >
                Próximo
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <span key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1" id="calendar-day-cells">
            {daysArray.map((cell, idx) => {
              const dayEvents = getEventsForDay(cell.dateStr);
              const isSelected = selectedDayStr === cell.dateStr;

              return (
                <button
                  key={idx}
                  id={`calendar-cell-${cell.dateStr}`}
                  onClick={() => setSelectedDayStr(cell.dateStr)}
                  className={`min-h-[50px] md:min-h-[75px] p-1 md:p-1.5 rounded-xl border flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all text-left group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-50 dark:border-slate-800/40'
                  } ${cell.isCurrentMonth ? '' : 'opacity-40'}`}
                >
                  <span className={`text-[11px] font-bold ${cell.isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                    {cell.day}
                  </span>

                  {/* Mobile event indicators */}
                  <div className="flex sm:hidden justify-center gap-0.5 w-full mt-1">
                    {dayEvents.some(e => e.type !== 'bill') && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    )}
                    {dayEvents.some(e => e.type === 'bill') && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    )}
                  </div>

                  {/* Day events badges */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1 grow overflow-y-auto max-h-[48px] w-full">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[8px] font-semibold truncate px-1 rounded-sm ${
                          evt.type === 'bill'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                        }`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda Side & Tasks Checklist (1 col) */}
      <div className="flex flex-col gap-5">
        
        {/* Agenda Events details on selected day */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Agenda do Dia
              </h3>
              <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider font-mono">
                {new Date(selectedDayStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1" id="selected-day-events-list">
              {activeEventsOnSelectedDay.length > 0 ? (
                activeEventsOnSelectedDay.map((evt) => {
                  const evTime = evt.start.split('T')[1]?.substring(0, 5) || '12:00';
                  return (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      id={`day-event-${evt.id}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          evt.type === 'bill'
                            ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20'
                            : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20'
                        }`}>
                          <Clock size={14} />
                        </div>
                        <div className="text-left overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{evt.title}</h4>
                          <span className="text-[9px] text-slate-400 font-semibold font-mono">{evTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleEventCompleted(evt.id, !evt.isCompleted)}
                          className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                            evt.isCompleted ? 'text-emerald-500' : 'text-slate-300'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(evt.id)}
                          className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Calendar size={18} className="mx-auto mb-1.5 text-slate-300" />
                  <p className="text-xs">Nenhum evento agendado para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Tasks Checklist Panel */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ListTodo size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tarefas do Dia
                </h3>
              </div>
            </div>

            {/* Tasks Creator Form */}
            <form onSubmit={handleTaskSubmit} className="flex gap-2 mb-3.5" id="task-creator-form">
              <input
                type="text"
                id="task-title-input"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ex: 'Entrar em contato com o banco'"
                className="grow px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
              />
              <button
                type="submit"
                id="task-submit-btn"
                disabled={isSubmittingTask}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {isSubmittingTask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              </button>
            </form>

            {/* Checklist of Tasks */}
            <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1" id="selected-day-tasks-list">
              {activeTasksOnSelectedDay.length > 0 ? (
                activeTasksOnSelectedDay.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    id={`task-item-${task.id}`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer grow overflow-hidden">
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => onToggleTask(task.id, !task.isCompleted)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 shrink-0"
                      />
                      <span className={`text-xs truncate text-slate-700 dark:text-slate-300 ${
                        task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'font-semibold'
                      }`}>
                        {task.title}
                      </span>
                    </label>

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <ListTodo size={18} className="mx-auto mb-1.5 text-slate-300" />
                  <p className="text-xs">Nenhuma tarefa pendente para hoje.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
