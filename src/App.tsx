import { useState } from 'react';
import { Layout, type PageId } from './components/Layout';
import { TransactionSheet } from './components/TransactionSheet';
import { Onboarding } from './components/Onboarding';
import { Celebration, ConfirmDialog, Toast } from './components/ui';
import { useData } from './context/DataContext';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Accounts } from './pages/Accounts';
import { Reports } from './pages/Reports';
import { BudgetPage, CalendarPage, CategoriesPage, RecurringPage } from './pages/Extras';
import { SettingsPage } from './pages/Settings';
import type { Transaction, TxType } from './types';

export default function App() {
  const { loading, settings, deleteTransaction, showToast } = useData();
  const [page, setPage] = useState<PageId>('home');
  const [sheet, setSheet] = useState<{ open: boolean; type: TxType; edit: Transaction | null }>({ open: false, type: 'expense', edit: null });
  const [delTx, setDelTx] = useState<Transaction | null>(null);

  const openAdd = (type: TxType = 'expense') => setSheet({ open: true, type, edit: null });
  const openEdit = (tx: Transaction) => setSheet({ open: true, type: tx.type, edit: tx });
  const askDelete = (tx: Transaction) => setDelTx(tx);

  if (loading) {
    return (
      <div className="boot-shell min-h-screen flex flex-col items-center justify-center gap-3" style={{ color: '#fff' }}>
        <div className="relative w-16 h-16 flex items-center justify-center">
          <span className="boot-ring absolute inset-0 rounded-3xl border border-white/60" />
          <div className="w-16 h-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center display text-3xl shadow-2xl">৳</div>
        </div>
        <div className="display text-[15px]">Personal Finance Manager</div>
        <div className="text-[11px] opacity-75">Opening your local database…</div>
      </div>
    );
  }

  if (!settings.onboardingDone) {
    return (
      <>
        <Onboarding />
        <Toast />
      </>
    );
  }

  return (
    <>
      <Layout page={page} setPage={setPage} onAdd={() => openAdd('expense')}>
        {page === 'home' && <Dashboard onAdd={openAdd} onEdit={openEdit} onDelete={askDelete} onNavigate={setPage} />}
        {page === 'transactions' && <Transactions onAdd={() => openAdd('expense')} onEdit={openEdit} onDelete={askDelete} />}
        {page === 'accounts' && <Accounts onNavigate={(p) => setPage(p)} />}
        {page === 'reports' && <Reports />}
        {page === 'budget' && <BudgetPage />}
        {page === 'calendar' && <CalendarPage onEdit={openEdit} onDelete={askDelete} />}
        {page === 'categories' && <CategoriesPage />}
        {page === 'recurring' && <RecurringPage />}
        {page === 'settings' && <SettingsPage onNavigate={setPage} />}
      </Layout>

      <TransactionSheet open={sheet.open} initialType={sheet.type} edit={sheet.edit} onNavigate={setPage} onClose={() => setSheet({ open: false, type: 'expense', edit: null })} />

      <ConfirmDialog open={!!delTx} title="Delete this entry?"
        message={`“${delTx?.note || 'Transaction'}” · ৳${delTx?.amount || 0} will be removed. This cannot be undone.`}
        onCancel={() => setDelTx(null)}
        onConfirm={async () => {
          if (delTx) { await deleteTransaction(delTx.id); showToast('Entry deleted · totals updated'); }
          setDelTx(null);
        }} />

      <Toast />
      <Celebration />
    </>
  );
}
