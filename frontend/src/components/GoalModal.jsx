import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';

const ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '📚', '💰', '🎓', '🏖️', '🎮', '📱', '⌚', '🎸', '🏋️', '🎨'];
const PRIORITIES = ['low', 'medium', 'high'];
const SUPPORTED_CURRENCIES = ['UZS', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'VND', 'THB', 'SGD', 'MYR', 'IDR', 'PHP', 'INR', 'AUD', 'CAD'];

const GoalModal = ({ goal, onClose }) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    target_amount: goal?.target_amount || '',
    currency: goal?.currency || currency || 'USD',
    deadline: goal?.deadline || '',
    category: goal?.category || '',
    icon: goal?.icon || '🎯',
    priority: goal?.priority || 'medium',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Clean up form data - convert empty strings to null
      const submitData = {
        ...formData,
        deadline: formData.deadline || null,
        category: formData.category || null,
      };
      
      if (goal) {
        await api.put(`/goals/${goal.id}`, submitData);
        toast.success(t('goals.updateSuccess'));
      } else {
        await api.post('/goals', submitData);
        toast.success(t('goals.createSuccess'));
      }
      onClose();
    } catch (error) {
      console.error('Goal submit error:', error.response?.data);
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => e.msg).join(', ')
        : error.response?.data?.error || t('common.error');
      toast.error(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-gray-100">
            {goal ? t('goals.editGoal') : t('goals.newGoal')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.name')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.targetAmount')} *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                {t('goals.currency') || t('common.currency') || 'Currency'}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.deadline')}</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.category')}</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
              placeholder={t('goals.categoryPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.icon')}</label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                    formData.icon === icon
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">{t('goals.priorityLabel')}</label>
            <div className="flex gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    formData.priority === priority
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t(`goals.priority.${priority}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              {goal ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;
