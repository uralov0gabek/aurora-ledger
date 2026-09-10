import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { X, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TransactionModal = ({ transaction, categories: initialCategories, onClose }) => {
  const { t } = useTranslation();
  const { currency: userCurrency } = useCurrency();
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    currency: userCurrency || 'USD',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringData, setRecurringData] = useState({
    frequency: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (transaction) {
      // Format date properly
      const date = transaction.transaction_date ? 
        format(new Date(transaction.transaction_date), 'yyyy-MM-dd') : 
        format(new Date(), 'yyyy-MM-dd');
        
      setFormData({
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency || 'USD',
        transaction_date: date,
        category_id: transaction.category_id || '',
        description: transaction.description || ''
      });
    }
  }, [transaction]);

  const filteredCategories = categories.filter(cat => cat.type === formData.type);
  
  const CURRENCIES = [
    { code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'KRW', name: 'Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  ];

  // Real-time validation
  const validateForm = () => {
    const errors = {};
    
    const amount = parseFloat(formData.amount);
    if (!formData.amount) {
      errors.amount = t('transactions.amountRequired') || 'Amount is required';
    } else if (isNaN(amount) || amount <= 0) {
      errors.amount = t('transactions.amountInvalid') || 'Must be greater than 0';
    } else if (amount > 999999999999.99) {
      errors.amount = t('transactions.amountTooLarge') || 'Amount too large';
    }
    
    if (!formData.transaction_date) {
      errors.date = t('transactions.dateRequired') || 'Date is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    setLoading(true);

    try {
      // Validate and format data
      const amount = parseFloat(formData.amount);

      const data = {
        type: formData.type,
        amount: amount,
        currency: formData.currency,
        transaction_date: formData.transaction_date, // Already in yyyy-MM-dd format
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        description: formData.description || ''
      };

      console.log('📤 Sending transaction data:', data);

      if (transaction) {
        await api.put(`/transactions/${transaction.id}`, data);
        toast.success(t('transactions.transactionUpdated'));
      } else {
        await api.post('/transactions', data);
        toast.success(t('transactions.transactionCreated'));
        
        // If recurring is checked, create recurring transaction
        if (isRecurring) {
          try {
            const recurringPayload = {
              type: formData.type,
              amount: amount,
              currency: formData.currency,
              category_id: formData.category_id ? parseInt(formData.category_id) : null,
              description: formData.description || '',
              frequency: recurringData.frequency,
              start_date: recurringData.startDate,
              end_date: recurringData.endDate || null
            };
            
            await api.post('/recurring', recurringPayload);
            toast.success(t('recurring.recurringCreated'));
            
            // Reload page to refresh both transactions and recurring list
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } catch (recurError) {
            console.error('Failed to create recurring:', recurError);
            toast.error('Transaction created but failed to setup recurring');
          }
        } else {
          // Just close if not recurring
          onClose();
        }
      }
    } catch (error) {
      console.error('❌ Transaction error:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Status:', error.response?.status);
      
      // Show detailed error message
      let errorMessage = transaction ? t('transactions.failedToUpdate') : t('transactions.failedToCreate');
      
      if (error.response?.data?.errors) {
        // Backend validation errors
        const errorDetails = error.response.data.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
        errorMessage = errorDetails;
        console.table(error.response.data.errors);
      } else if (error.response?.data?.error) {
        // Backend error message
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset category when type changes
      ...(name === 'type' ? { category_id: '' } : {})
    }));
  };

  const handleQuickAddCategory = async () => {
    if (!quickAddName.trim()) {
      toast.error(t('categories.name') + ' is required');
      return;
    }

    try {
      const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      const response = await api.post('/categories', {
        name: quickAddName,
        type: formData.type,
        color: randomColor,
        icon: 'folder'
      });

      // Add new category to list
      const newCategory = response.data;
      setCategories([...categories, newCategory]);
      
      // Auto-select the new category
      setFormData({ ...formData, category_id: newCategory.id });
      
      // Reset quick add
      setQuickAddName('');
      setShowQuickAdd(false);
      
      toast.success(t('categories.categoryCreated'));
    } catch (error) {
      toast.error(t('categories.failedToCreate'));
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            {transaction ? t('transactions.editTransaction') : t('transactions.addTransaction')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Close">
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transactions.type')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income', category_id: '' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'income'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('transactions.income')}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense', category_id: '' })}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('transactions.expense')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('transactions.amount')}
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="any"
                min="0.01"
                max="999999999999.99"
                className="input"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.currency')}
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="input"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            {t('transactions.maxAmount')} • {t('transactions.willConvert')}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transactions.date')}
            </label>
            <input
              type="date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
              <span>{t('transactions.category')}</span>
              <button
                type="button"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={14} />
                {t('categories.addCategory')}
              </button>
            </label>
            
            {showQuickAdd && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAddName}
                    onChange={(e) => setQuickAddName(e.target.value)}
                    className="input flex-1"
                    placeholder={t('categories.categoryName')}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddCategory())}
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {t('common.save')}
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  💡 Quick add {formData.type} category with random color
                </p>
              </div>
            )}
            
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="input"
            >
              <option value="">{t('transactions.uncategorized')}</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transactions.description')} ({t('transactions.optional')})
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input"
              rows="3"
              placeholder={t('transactions.addNote')}
            ></textarea>
          </div>

          {/* Recurring Options */}
          <div className="border-t dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  🔄 {t('recurring.makeRecurring')}
                </span>
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('recurring.frequency')}
                    </label>
                    <select
                      value={recurringData.frequency}
                      onChange={(e) => setRecurringData({...recurringData, frequency: e.target.value})}
                      className="input text-sm"
                    >
                      <option value="daily">{t('recurring.daily')}</option>
                      <option value="weekly">{t('recurring.weekly')}</option>
                      <option value="monthly">{t('recurring.monthly')}</option>
                      <option value="yearly">{t('recurring.yearly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('recurring.startDate')}
                    </label>
                    <input
                      type="date"
                      value={recurringData.startDate}
                      onChange={(e) => setRecurringData({...recurringData, startDate: e.target.value})}
                      className="input text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  💡 {t('recurring.willCreateOn')} {recurringData.frequency === 'monthly' ? t('recurring.month') : recurringData.frequency === 'weekly' ? t('recurring.week') : recurringData.frequency === 'yearly' ? t('recurring.year') : t('recurring.day')}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              {t('transactions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? t('transactions.saving') : (transaction ? t('transactions.update') : t('transactions.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;

