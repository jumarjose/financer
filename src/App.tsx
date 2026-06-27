/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, googleSignIn, logout, initAuth } from './firebase';
import { Transaction, AgendaEvent, FinancialGoal, Task } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import FinanceView from './components/FinanceView';
import AgendaView from './components/AgendaView';
import GoalsView from './components/GoalsView';
import ProductivityView from './components/ProductivityView';
import AiAssistant from './components/AiAssistant';
import { ThemeProvider } from './components/ThemeContext';
import { Loader2, Sparkles, CheckCircle, CalendarDays, Wallet } from 'lucide-react';

type ViewType = 'dashboard' | 'finance' | 'agenda' | 'goals' | 'productivity' | 'ai';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active View State
  const [currentView, setView] = useState<ViewType>('dashboard');
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense' | null>(null);

  // Core App Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Google Syncing states
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Initialize Authentication State
  useEffect(() => {
    const unsubscribe = initAuth(
      (userInstance, token) => {
        setUser(userInstance);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch all user's data once authenticated
  useEffect(() => {
    if (user) {
      fetchUserData(user.uid);
    } else {
      // Clear data if not logged in
      setTransactions([]);
      setEvents([]);
      setGoals([]);
      setTasks([]);
    }
  }, [user]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      // Query Firestore collections for this user
      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
      const eventsQuery = query(collection(db, 'events'), where('userId', '==', userId));
      const goalsQuery = query(collection(db, 'goals'), where('userId', '==', userId));
      const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));

      // Fetch each collection individually to isolate potential permission or indexing errors
      let transSnap: any = null;
      let eventsSnap: any = null;
      let goalsSnap: any = null;
      let tasksSnap: any = null;

      try {
        transSnap = await getDocs(transactionsQuery);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }

      try {
        eventsSnap = await getDocs(eventsQuery);
      } catch (err) {
        console.error('Error fetching events:', err);
      }

      try {
        goalsSnap = await getDocs(goalsQuery);
      } catch (err) {
        console.error('Error fetching goals:', err);
      }

      try {
        tasksSnap = await getDocs(tasksQuery);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }

      // Fetch user configuration/metadata doc to see if they already completed initial seeding
      let userDocSnap: any = null;
      try {
        userDocSnap = await getDoc(doc(db, 'users', userId));
      } catch (err) {
        console.error('Error fetching user config document:', err);
      }

      const transList: Transaction[] = [];
      if (transSnap) {
        transSnap.forEach((doc: any) => transList.push({ id: doc.id, ...doc.data() } as Transaction));
      }

      const eventsList: AgendaEvent[] = [];
      if (eventsSnap) {
        eventsSnap.forEach((doc: any) => eventsList.push({ id: doc.id, ...doc.data() } as AgendaEvent));
      }

      const goalsList: FinancialGoal[] = [];
      if (goalsSnap) {
        goalsSnap.forEach((doc: any) => goalsList.push({ id: doc.id, ...doc.data() } as FinancialGoal));
      }

      const tasksList: Task[] = [];
      if (tasksSnap) {
        tasksSnap.forEach((doc: any) => tasksList.push({ id: doc.id, ...doc.data() } as Task));
      }

      const hasSeeded = (userDocSnap && userDocSnap.exists() && userDocSnap.data()?.hasSeeded) || localStorage.getItem(`financer_seeded_${userId}`) === 'true';

      // Check if user has no data and has not been seeded yet
      if (!hasSeeded && transList.length === 0 && goalsList.length === 0) {
        await seedDefaultData(userId);
        try {
          await setDoc(doc(db, 'users', userId), { hasSeeded: true });
        } catch (err) {
          console.error('Error updating user seeding status:', err);
        }
        try {
          localStorage.setItem(`financer_seeded_${userId}`, 'true');
        } catch (e) {
          console.error('Error writing to localStorage:', e);
        }
      } else {
        // If they already have some data but hasSeeded is not marked in the user doc, let's mark it as true now
        if (!hasSeeded) {
          try {
            await setDoc(doc(db, 'users', userId), { hasSeeded: true });
          } catch (err) {
            console.error('Error updating user seeding status in else:', err);
          }
          try {
            localStorage.setItem(`financer_seeded_${userId}`, 'true');
          } catch (e) {
            console.error('Error writing to localStorage:', e);
          }
        }
        setTransactions(transList);
        setEvents(eventsList);
        setGoals(goalsList);
        setTasks(tasksList);
      }
    } catch (error) {
      console.error('Error fetching user data from Firestore:', error);
    } finally {
      setLoading(false);
    }
  };

  // Seed helpful starter data for a polished first-run experience
  const seedDefaultData = async (userId: string) => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

      const initialTransactions: Omit<Transaction, 'id' | 'createdAt'>[] = [
        {
          date: `${currentMonthStr}-05`,
          description: 'Salário Principal',
          amount: 5000.00,
          type: 'income',
          category: 'salario',
          recurrence: 'monthly',
          isPaid: true,
          userId
        },
        {
          date: `${currentMonthStr}-10`,
          description: 'Projeto Freelance Web',
          amount: 1200.00,
          type: 'income',
          category: 'freela',
          recurrence: 'none',
          isPaid: true,
          userId
        },
        {
          date: `${currentMonthStr}-08`,
          description: 'Supermercado Mensal',
          amount: 650.00,
          type: 'expense',
          category: 'alimentacao',
          recurrence: 'monthly',
          isPaid: true,
          userId
        },
        {
          date: `${currentMonthStr}-12`,
          description: 'Mensalidade Faculdade',
          amount: 450.00,
          type: 'expense',
          category: 'estudos',
          recurrence: 'monthly',
          isPaid: true,
          userId
        },
        {
          date: `${currentMonthStr}-15`,
          description: 'Assinatura Streaming (Netflix/Spotify)',
          amount: 65.90,
          type: 'expense',
          category: 'lazer',
          recurrence: 'monthly',
          isPaid: true,
          userId
        },
        {
          date: `${currentMonthStr}-22`,
          description: 'Fatura de Internet',
          amount: 119.90,
          type: 'expense',
          category: 'contas',
          recurrence: 'monthly',
          isPaid: false,
          userId
        },
        {
          date: `${currentMonthStr}-28`,
          description: 'Combustível Posto Ipiranga',
          amount: 180.00,
          type: 'expense',
          category: 'transporte',
          recurrence: 'none',
          isPaid: true,
          userId
        }
      ];

      const initialGoals: Omit<FinancialGoal, 'id' | 'createdAt'>[] = [
        {
          title: 'Reserva de Emergência',
          targetAmount: 10000.00,
          currentAmount: 3200.00,
          category: 'Reserva',
          deadline: `${now.getFullYear() + 1}-12-31`,
          userId
        },
        {
          title: 'Viagem de Férias',
          targetAmount: 5000.00,
          currentAmount: 1500.00,
          category: 'Viagem',
          deadline: `${now.getFullYear() + 1}-06-30`,
          userId
        }
      ];

      const initialEvents: Omit<AgendaEvent, 'id' | 'createdAt'>[] = [
        {
          title: 'Pagamento Faculdade',
          description: 'Vencimento mensal',
          start: `${currentMonthStr}-12T10:00:00`,
          end: `${currentMonthStr}-12T11:00:00`,
          type: 'bill',
          recurrence: 'monthly',
          isCompleted: true,
          amount: 450.00,
          userId
        },
        {
          title: 'Internet Mensal',
          description: 'Contas Fixas',
          start: `${currentMonthStr}-22T14:00:00`,
          end: `${currentMonthStr}-22T15:00:00`,
          type: 'bill',
          recurrence: 'monthly',
          isCompleted: false,
          amount: 119.90,
          userId
        }
      ];

      const initialTasks: Omit<Task, 'id' | 'createdAt'>[] = [
        {
          title: 'Organizar comprovantes da semana',
          isCompleted: false,
          dueDate: `${currentMonthStr}-15`,
          userId
        },
        {
          title: 'Simular novos investimentos no Tesouro',
          isCompleted: true,
          dueDate: `${currentMonthStr}-10`,
          userId
        }
      ];

      // Save seeded data to firestore sequentially
      const addedTrans: Transaction[] = [];
      const addedGoals: FinancialGoal[] = [];
      const addedEvents: AgendaEvent[] = [];
      const addedTasks: Task[] = [];

      for (const t of initialTransactions) {
        const docRef = await addDoc(collection(db, 'transactions'), { ...t, createdAt: new Date().toISOString() });
        addedTrans.push({ id: docRef.id, ...t, createdAt: new Date().toISOString() } as Transaction);
      }

      for (const g of initialGoals) {
        const docRef = await addDoc(collection(db, 'goals'), { ...g, createdAt: new Date().toISOString() });
        addedGoals.push({ id: docRef.id, ...g, createdAt: new Date().toISOString() } as FinancialGoal);
      }

      for (const e of initialEvents) {
        const docRef = await addDoc(collection(db, 'events'), { ...e, createdAt: new Date().toISOString() });
        addedEvents.push({ id: docRef.id, ...e, createdAt: new Date().toISOString() } as AgendaEvent);
      }

      for (const tk of initialTasks) {
        const docRef = await addDoc(collection(db, 'tasks'), { ...tk, createdAt: new Date().toISOString() });
        addedTasks.push({ id: docRef.id, ...tk, createdAt: new Date().toISOString() } as Task);
      }

      setTransactions(addedTrans);
      setGoals(addedGoals);
      setEvents(addedEvents);
      setTasks(addedTasks);
    } catch (e) {
      console.error('Error seeding data:', e);
    }
  };

  // Auth Handlers
  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
  };

  const handleResetDatabase = async () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Todos os Dados',
      message: 'Tem certeza que deseja apagar DEFINITIVAMENTE todos os seus dados (transações, metas, agenda e tarefas)? Esta ação não pode ser revertida e deixará sua conta vazia.',
      onConfirm: async () => {
        setLoading(true);
        try {
          // 1. Delete all transactions
          const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
          const transactionsSnap = await getDocs(transactionsQuery);
          const transBatch = writeBatch(db);
          transactionsSnap.forEach(d => transBatch.delete(d.ref));
          await transBatch.commit();

          // 2. Delete all goals
          const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
          const goalsSnap = await getDocs(goalsQuery);
          const goalsBatch = writeBatch(db);
          goalsSnap.forEach(d => goalsBatch.delete(d.ref));
          await goalsBatch.commit();

          // 3. Delete all events
          const eventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid));
          const eventsSnap = await getDocs(eventsQuery);
          const eventsBatch = writeBatch(db);
          eventsSnap.forEach(d => eventsBatch.delete(d.ref));
          await eventsBatch.commit();

          // 4. Delete all tasks
          const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
          const tasksSnap = await getDocs(tasksQuery);
          const tasksBatch = writeBatch(db);
          tasksSnap.forEach(d => tasksBatch.delete(d.ref));
          await tasksBatch.commit();

          // 5. Ensure the user's config document hasSeeded is set to true so they remain with clean slate
          await setDoc(doc(db, 'users', user.uid), { hasSeeded: true });
          try {
            localStorage.setItem(`financer_seeded_${user.uid}`, 'true');
          } catch (e) {
            console.error('Error writing to localStorage:', e);
          }

          // 6. Reset local react states
          setTransactions([]);
          setEvents([]);
          setGoals([]);
          setTasks([]);

          alert('Todos os dados foram apagados com sucesso! Sua conta está limpa.');
        } catch (err: any) {
          console.error('Erro ao limpar base de dados:', err);
          alert('Erro ao limpar dados da base de dados. Verifique sua conexão ativa.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Transaction Mutation Handlers
  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) {
      throw new Error('Você precisa estar autenticado com sua conta Google para adicionar uma transação.');
    }
    const item: any = {
      ...newT,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    // Remove undefined properties to prevent Firestore errors
    Object.keys(item).forEach(key => {
      if (item[key] === undefined) {
        delete item[key];
      }
    });

    try {
      const docRef = await addDoc(collection(db, 'transactions'), item);
      setTransactions(prev => [...prev, { id: docRef.id, ...item } as Transaction]);
    } catch (err: any) {
      console.error('Erro ao adicionar transação no Firestore:', err);
      throw new Error(err.message || 'Erro ao salvar transação no Firestore. Verifique suas regras ou conexão.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Transação',
      message: 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'transactions', id));
          setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
          console.error('Erro ao excluir transação no Firestore:', err);
          alert('Erro ao excluir transação no Firestore. Verifique se você tem permissão ou conexão ativa.');
        }
      }
    });
  };

  const handleTogglePaid = async (id: string, isPaid: boolean) => {
    try {
      await updateDoc(doc(db, 'transactions', id), { isPaid });
      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, isPaid } : t)));
    } catch (err: any) {
      console.error('Erro ao alterar status de pagamento no Firestore:', err);
      alert('Erro ao alterar status de pagamento. Verifique se você tem permissão ou conexão ativa.');
    }
  };

  const handleUpdateTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    if (!user) {
      throw new Error('Você precisa estar autenticado com sua conta Google para atualizar uma transação.');
    }
    const fieldsToUpdate = { ...updatedFields };
    // Remove undefined properties to prevent Firestore errors
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key as keyof typeof fieldsToUpdate] === undefined) {
        delete fieldsToUpdate[key as keyof typeof fieldsToUpdate];
      }
    });

    try {
      await updateDoc(doc(db, 'transactions', id), fieldsToUpdate);
      setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...fieldsToUpdate } : t)));
    } catch (err: any) {
      console.error('Erro ao atualizar transação no Firestore:', err);
      throw new Error(err.message || 'Erro ao salvar alterações no Firestore. Verifique suas regras ou conexão.');
    }
  };

  // Agenda Event Mutation Handlers
  const handleAddEvent = async (newE: Omit<AgendaEvent, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    const item = {
      ...newE,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };

    let googleEventId: string | undefined = undefined;

    // Optional: Real Google Calendar Sync (API call) if Google Access Token exists
    if (accessToken) {
      try {
        const body = {
          summary: newE.title,
          description: newE.description || '',
          start: { dateTime: new Date(newE.start).toISOString() },
          end: { dateTime: new Date(newE.end).toISOString() },
          recurrence: newE.recurrence !== 'none'
            ? [`RRULE:FREQ=${newE.recurrence.toUpperCase()}`]
            : undefined
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const apiData = await response.json();
          googleEventId = apiData.id;
        }
      } catch (err) {
        console.warn('Could not post event to Google Calendar, saving locally only.', err);
      }
    }

    const writeItem: any = { ...item };
    if (googleEventId !== undefined) {
      writeItem.googleEventId = googleEventId;
    }

    // Clean undefined fields to prevent Firestore errors
    Object.keys(writeItem).forEach(key => {
      if (writeItem[key] === undefined) {
        delete writeItem[key];
      }
    });

    const docRef = await addDoc(collection(db, 'events'), writeItem);
    setEvents(prev => [...prev, { id: docRef.id, ...writeItem } as AgendaEvent]);
  };

  const handleDeleteEvent = async (id: string) => {
    const target = events.find(e => e.id === id);
    if (!target) return;

    setConfirmModal({
      isOpen: true,
      title: 'Remover Compromisso',
      message: 'Tem certeza que deseja remover este compromisso de sua agenda?',
      onConfirm: async () => {
        // Optional Google Calendar delete if synced
        if (accessToken && target.googleEventId) {
          try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${target.googleEventId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
          } catch (err) {
            console.warn('Could not delete from Google Calendar:', err);
          }
        }

        try {
          await deleteDoc(doc(db, 'events', id));
          setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
          console.error('Erro ao excluir evento no Firestore:', err);
          alert('Erro ao excluir o compromisso da agenda. Verifique se você tem permissão ou conexão ativa.');
        }
      }
    });
  };

  const handleToggleEventCompleted = async (id: string, isCompleted: boolean) => {
    try {
      await updateDoc(doc(db, 'events', id), { isCompleted });
      setEvents(prev => prev.map(e => (e.id === id ? { ...e, isCompleted } : e)));
    } catch (err: any) {
      console.error('Erro ao alterar status de conclusão do evento no Firestore:', err);
      alert('Erro ao alterar o status do compromisso. Verifique sua permissão ou conexão ativa.');
    }
  };

  // Goals Mutation Handlers
  const handleAddGoal = async (newG: Omit<FinancialGoal, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    const item: any = {
      ...newG,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    // Clean undefined fields to prevent Firestore errors
    Object.keys(item).forEach(key => {
      if (item[key] === undefined) {
        delete item[key];
      }
    });

    try {
      const docRef = await addDoc(collection(db, 'goals'), item);
      setGoals(prev => [...prev, { id: docRef.id, ...item } as FinancialGoal]);
    } catch (err: any) {
      console.error('Erro ao adicionar meta no Firestore:', err);
      alert('Erro ao adicionar meta financeira. Verifique sua conexão ativa.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Meta Financeira',
      message: 'Tem certeza que deseja excluir esta meta financeira?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'goals', id));
          setGoals(prev => prev.filter(g => g.id !== id));
        } catch (err: any) {
          console.error('Erro ao excluir meta no Firestore:', err);
          alert('Erro ao excluir meta financeira. Verifique se você tem permissão ou conexão ativa.');
        }
      }
    });
  };

  const handleUpdateGoalAmount = async (id: string, newAmount: number) => {
    try {
      await updateDoc(doc(db, 'goals', id), { currentAmount: newAmount });
      setGoals(prev => prev.map(g => (g.id === id ? { ...g, currentAmount: newAmount } : g)));
    } catch (err: any) {
      console.error('Erro ao atualizar meta no Firestore:', err);
      alert('Erro ao atualizar meta financeira. Verifique se você tem permissão ou conexão ativa.');
    }
  };

  // Productivity Task Mutation Handlers
  const handleAddTask = async (newT: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) return;
    const item: any = {
      ...newT,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };

    // Clean undefined fields to prevent Firestore errors
    Object.keys(item).forEach(key => {
      if (item[key] === undefined) {
        delete item[key];
      }
    });

    try {
      const docRef = await addDoc(collection(db, 'tasks'), item);
      setTasks(prev => [...prev, { id: docRef.id, ...item } as Task]);
    } catch (err: any) {
      console.error('Erro ao adicionar tarefa no Firestore:', err);
      alert('Erro ao adicionar tarefa. Verifique sua conexão ativa.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir tarefa no Firestore:', err);
      alert('Erro ao excluir tarefa. Verifique se você tem permissão ou conexão ativa.');
    }
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { isCompleted });
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, isCompleted } : t)));
    } catch (err: any) {
      console.error('Erro ao alterar status de conclusão da tarefa no Firestore:', err);
      alert('Erro ao alterar status da tarefa. Verifique se você tem permissão ou conexão ativa.');
    }
  };

  // Real-Time Google Calendar Synchronization (Fetch from Google API and write to Firestore)
  const handleSyncGoogleCalendar = async () => {
    if (!accessToken || !user) return;
    setIsSyncingCalendar(true);

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=30', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter eventos do Google Calendar API');
      }

      const data = await response.json();
      const items = data.items || [];

      // Filter events to check which are new
      const currentGoogleIds = events.map(e => e.googleEventId).filter(Boolean);
      
      const newEventsToSync = items.filter((item: any) => {
        return item.summary && item.start && !currentGoogleIds.includes(item.id);
      });

      if (newEventsToSync.length === 0) {
        alert('Sua agenda já está sincronizada com o Google Calendar!');
        return;
      }

      // Add new events to state & Firestore
      const added: AgendaEvent[] = [];
      for (const item of newEventsToSync) {
        const startStr = item.start.dateTime || item.start.date || new Date().toISOString();
        const endStr = item.end?.dateTime || item.end?.date || startStr;
        
        const eventItem = {
          title: item.summary,
          description: item.description || '',
          start: startStr,
          end: endStr,
          type: 'event' as const,
          recurrence: 'none' as const,
          isCompleted: false,
          userId: user.uid,
          googleEventId: item.id,
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'events'), eventItem);
        added.push({ id: docRef.id, ...eventItem });
      }

      setEvents(prev => [...prev, ...added]);
      alert(`Sincronização concluída com sucesso! ${newEventsToSync.length} novos eventos sincronizados.`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao sincronizar com Google Calendar: ' + err.message);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Render individual views dynamically
  const renderViewContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            transactions={transactions}
            goals={goals}
            events={events}
            setView={setView}
            onQuickAdd={(type) => {
              setQuickAddType(type);
              setView('finance');
            }}
          />
        );
      case 'finance':
        return (
          <FinanceView
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onTogglePaid={handleTogglePaid}
            goals={goals}
            initialType={quickAddType}
            clearInitialType={() => setQuickAddType(null)}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            events={events}
            tasks={tasks}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            onToggleEventCompleted={handleToggleEventCompleted}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            googleAccessToken={accessToken}
            onSyncGoogleCalendar={handleSyncGoogleCalendar}
            isSyncing={isSyncingCalendar}
          />
        );
      case 'goals':
        return (
          <GoalsView
            goals={goals}
            transactions={transactions}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            onUpdateGoalAmount={handleUpdateGoalAmount}
          />
        );
      case 'productivity':
        return (
          <ProductivityView
            transactions={transactions}
            events={events}
            tasks={tasks}
            goals={goals}
            onToggleTask={handleToggleTask}
          />
        );
      case 'ai':
        return <AiAssistant transactions={transactions} goals={goals} />;
      default:
        return <div>View não encontrada</div>;
    }
  };

  // Initial Full Screen Loader
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <span className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-widest">Carregando Financer...</span>
      </div>
    );
  }

  // Pre-login / Onboarding Screen if Authentication is Required
  if (needsAuth) {
    return (
      <ThemeProvider>
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-8 text-center flex flex-col gap-6">
            
            {/* Elegant logo mark */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse">
              F
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Financer Inteligente
              </h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
                Gestão Pessoal & Agenda Unificada
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                  <Wallet size={16} />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Controle total de receitas e saídas por categoria
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays size={16} />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Agenda sincronizada com Google Calendar
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={16} />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Previsão e busca inteligente via Gemini AI
                </div>
              </div>
            </div>

            {/* Google GSI Sign in Button */}
            <button
              id="google-signin-auth-btn"
              onClick={handleLogin}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:scale-102"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0 bg-white p-0.5 rounded-full">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Acessar com o Google Account
            </button>
            <span className="text-[10px] text-slate-400">
              Conexão criptografada e segura via Firebase Auth.
            </span>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Active App screen once logged in
  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100" id="main-app-container">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          setView={setView}
          user={user}
          onLogout={handleLogout}
          onLoginClick={handleLogin}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          onResetDatabase={handleResetDatabase}
        />

        {/* Content canvas */}
        <main className="grow overflow-y-auto p-5 md:p-8 pt-16 md:pt-8" id="main-content-canvas">
          {renderViewContent()}
        </main>

        {/* Custom Confirmation Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="custom-confirm-modal">
            <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col gap-4 animate-scale-in">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50 font-sans tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (action) {
                      await action();
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-600/20 active:scale-98 transition-all font-sans"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
