import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { RecurringModal } from '../components/recurring/RecurringModal';
import { ConfirmRecurringOccurrenceModal } from '../components/recurring/ConfirmRecurringOccurrenceModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';
import {
  fetchRecurringSchedules,
  updateRecurringSchedule,
  deleteRecurringSchedule,
} from '../services/api';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/date';
import {
  Repeat,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle,
} from 'lucide-react';

export const RecurringPage = () => {
  const { addToast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmOccurrenceSchedule, setConfirmOccurrenceSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const res = await fetchRecurringSchedules(params);
      if (res.success) {
        setSchedules(res.schedules);
      }
    } catch (err) {
      console.error('Error fetching recurring schedules:', err);
      setError(err.message || 'Failed to load recurring schedules');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleToggleStatus = async (schedule) => {
    const nextStatus = schedule.status === 'Active' ? 'Paused' : 'Active';
    try {
      await updateRecurringSchedule(schedule._id, { status: nextStatus });
      addToast(`Schedule marked as ${nextStatus}`, 'success');
      loadSchedules();
    } catch (err) {
      addToast(err.message || 'Failed to update schedule status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRecurringSchedule(deletingId);
      addToast('Recurring schedule deleted', 'success');
      setDeletingId(null);
      loadSchedules();
    } catch (err) {
      addToast(err.message || 'Failed to delete schedule', 'error');
    }
  };

  return (
    <Layout
      title="Recurring Schedules"
      subtitle="Manage predictable office rent, vendor bills, client retainers, and recurring income"
      actions={
        <button
          onClick={() => {
            setEditingSchedule(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Accounting Banner */}
        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#ff5e00]/10 text-[#ff5e00] border border-[#ff5e00]/20">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Safe Recurring Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Recurring schedules act as reminders and automation queues. They do <strong>not</strong> alter your actual Office Balance until you click <strong>Mark as Paid</strong> or <strong>Mark as Received</strong>.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a0a0a] p-3 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Status:
            </span>
            {['all', 'Active', 'Paused', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#ff5e00] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-800'
                }`}
              >
                {st === 'all' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Type:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">All Types</option>
              <option value="expense" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Expenses Only</option>
              <option value="incoming" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Incoming Only</option>
            </select>
          </div>
        </div>

        {/* Schedules Grid / List */}
        {isLoading ? (
          <LoadingSpinner text="Loading recurring schedules..." />
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            title="No recurring schedules"
            description="Create recurring schedules for rent, regular maintenance, monthly salaries, or retainer payments."
            actionText="+ Create Recurring Schedule"
            onAction={() => {
              setEditingSchedule(null);
              setIsModalOpen(true);
            }}
            icon={Repeat}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {schedules.map((schedule) => {
              const isIncoming = schedule.type === 'incoming';
              const isCancelled = schedule.status === 'Cancelled';
              const isPaused = schedule.status === 'Paused';

              return (
                <div
                  key={schedule._id}
                  className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border mt-0.5 ${
                          isIncoming
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {schedule.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
                            {schedule.frequency}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400">
                            {schedule.category} • {schedule.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold text-lg ${
                          isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatINR(schedule.amount)}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          schedule.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : schedule.status === 'Paused'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700'
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg text-xs border border-slate-200 dark:border-zinc-800">
                    <div>
                      <span className="text-slate-500 dark:text-zinc-400 block font-medium">Next Due Date:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {formatDate(schedule.nextScheduledDate, 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-zinc-400 block font-medium">Completed Occurrences:</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {schedule.completedTransactions?.length || 0} times
                      </span>
                    </div>
                  </div>

                  {schedule.notes && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-black/40 p-2 rounded border border-slate-200 dark:border-zinc-800 italic">
                      "{schedule.notes}"
                    </p>
                  )}

                  {/* Actions & Confirmation Workflow */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 gap-2">
                    {/* Execution Action Button */}
                    {!isCancelled ? (
                      <button
                        onClick={() => setConfirmOccurrenceSchedule(schedule)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer ${
                          isIncoming
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isIncoming ? 'Mark as Received' : 'Mark as Paid'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-zinc-500">Schedule Cancelled</span>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      {!isCancelled && (
                        <button
                          title={isPaused ? 'Resume Schedule' : 'Pause Schedule'}
                          onClick={() => handleToggleStatus(schedule)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        title="Edit schedule"
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Delete schedule"
                        onClick={() => setDeletingId(schedule._id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Edit / Create Modal */}
      <RecurringModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        schedule={editingSchedule}
        onSaved={loadSchedules}
      />

      {/* Confirmation Workflow Modal (Mark as Paid / Received) */}
      <ConfirmRecurringOccurrenceModal
        isOpen={Boolean(confirmOccurrenceSchedule)}
        onClose={() => setConfirmOccurrenceSchedule(null)}
        schedule={confirmOccurrenceSchedule}
        onConfirmed={loadSchedules}
      />

      {/* Delete Safeguard Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Recurring Schedule"
        message="Are you sure you want to delete this schedule? Any previously recorded past completed transactions will remain safe in your ledger."
      />
    </Layout>
  );
};
