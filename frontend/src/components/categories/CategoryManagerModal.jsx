import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLedger } from '../../context/LedgerContext';
import { useToast } from '../../context/ToastContext';
import { createCategory, updateCategory, deleteCategory } from '../../services/api';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const CategoryManagerModal = ({ isOpen, onClose }) => {
  const { categories, loadCategories } = useLedger();
  const { addToast } = useToast();

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('expense');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('expense');
  const [deletingId, setDeletingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      setError('');
      await createCategory({ name: newName.trim(), type: newType });
      addToast('Category added', 'success');
      setNewName('');
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      await updateCategory(id, { name: editName.trim(), type: editType });
      addToast('Category updated', 'success');
      setEditingId(null);
      loadCategories();
    } catch (err) {
      addToast(err.message || 'Failed to update category', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCategory(deletingId);
      addToast('Category deleted', 'success');
      setDeletingId(null);
      loadCategories();
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Office Categories" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Add new category form */}
        <form onSubmit={handleAdd} className="p-3 bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200 dark:border-zinc-800 rounded-xl space-y-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
            Add New Category
          </span>
          {error && <div className="text-xs text-rose-500 dark:text-rose-400 font-medium">{error}</div>}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g., Software Subscriptions / Courier"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-black focus:outline-none focus:border-[#ff5e00]"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-black focus:outline-none focus:border-[#ff5e00] cursor-pointer"
            >
              <option value="expense" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Expense</option>
              <option value="incoming" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Incoming</option>
              <option value="both" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Both</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5e00] hover:bg-[#ff7b29] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </form>

        {/* Existing Categories List */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {categories.map((c) => {
            const isEditing = editingId === c._id;

            return (
              <div
                key={c._id || c.name}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#0d0d0d] hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-xs transition-colors"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white bg-white dark:bg-black"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-1 text-xs text-slate-900 dark:text-white bg-white dark:bg-black cursor-pointer"
                    >
                      <option value="expense" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Expense</option>
                      <option value="incoming" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Incoming</option>
                      <option value="both" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Both</option>
                    </select>
                    <button
                      onClick={() => handleSaveEdit(c._id)}
                      className="p-1 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-200 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                      <span className="font-medium text-slate-800 dark:text-zinc-200">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 uppercase">
                        {c.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(c._id);
                          setEditName(c.name);
                          setEditType(c.type || 'expense');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(c._id)}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white border border-slate-200 dark:border-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Existing transactions with this category will keep their text."
      />
    </Modal>
  );
};
