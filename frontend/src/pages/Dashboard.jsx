import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { useDashboardData, useForecast } from '../hooks/useTransactions';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight,
  Calendar 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { enUS, vi, es, fr, de, zhCN, ja, ko, pt, ru } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { formatCurrency, formatAmount, convertAmount, currency } = useCurrency();
  const [viewMode, setViewMode] = useState('month'); // 'month', 'last30', 'all'

  const currentDate = new Date();  const getDateLocale = () => {
    const locales = {
      en: enUS,
      vi: vi,
      es: es,
      fr: fr,
      de: de,
      zh: zhCN,
      ja: ja,
      ko: ko,
      pt: pt,
      ru: ru
    };
    return locales[i18n.language] || enUS;
  };

  const getDateRange = () => {
    const today = new Date();
    const locale = getDateLocale();
    
    switch (viewMode) {
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd'),
          label: format(today, 'MMMM yyyy', { locale })
        };
      case 'last30':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start: format(thirtyDaysAgo, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
          label: t('dashboard.last30Days')
        };
      case 'all':
        return {
          start: '2020-01-01',
          end: format(today, 'yyyy-MM-dd'),
          label: t('dashboard.allTime')
        };
      default:
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd'),
          label: format(today, 'MMMM yyyy', { locale })
        };
    }
  };

  const dateRange = useMemo(() => getDateRange(), [viewMode]);

  // Use React Query hooks - data is automatically cached!
  const { data: transactions = [], isLoading: transactionsLoading } = useDashboardData(dateRange);
  const { data: forecastData, isLoading: forecastLoading } = useForecast();

  const loading = transactionsLoading || forecastLoading;

  // Calculate stats from cached data
  const stats = useMemo(() => {
    if (!transactions.length) return null;

    let totalIncome = 0;
    let totalExpense = 0;
    const categorySpending = {};
    
    transactions.forEach(t => {
      const amount = parseFloat(t.amount || 0);
        
      if (t.type === 'income') {
        totalIncome += amount;
      } else if (t.type === 'expense') {
        totalExpense += amount;
        
        // Aggregate by category
        const catName = t.category_name || 'Uncategorized';
        if (!categorySpending[catName]) {
          categorySpending[catName] = {
            name: catName,
            category_name: catName,
            color: t.category_color || '#6B7280',
            category_color: t.category_color || '#6B7280',
            icon: t.category_icon || '📦',
            total: 0,
            transaction_count: 0
          };
        }
        categorySpending[catName].total += amount;
        categorySpending[catName].transaction_count += 1;
      }
    });
    
    // Convert category spending to array and sort
    const topCategories = Object.values(categorySpending)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    
    const savings = totalIncome - totalExpense;
    
    return {
      month: {
        income: totalIncome,
        expense: totalExpense,
        savings: savings,
        savingsRate: totalIncome > 0 
          ? ((savings / totalIncome) * 100).toFixed(1)
          : 0
      },
      topCategories: topCategories,
      recentActivity: {
        transactions: transactions.slice(0, 5)
      }
    };
  }, [transactions]);

  const recentTransactions = useMemo(() => 
    transactions.slice(0, 5), 
    [transactions]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Extract data from computed stats
  const month = stats?.month || {};
  const balance = (month.income || 0) - (month.expense || 0);
  const income = month.income || 0;
  const expense = month.expense || 0;

  // Map top categories from computed stats
  const expenseByCategoryConverted = stats?.topCategories || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('dashboard.overviewFor')} {dateRange.label}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dashboard.thisMonth')}
          </button>
          <button
            onClick={() => setViewMode('last30')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'last30' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dashboard.last30Days')}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('dashboard.allTime')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('dashboard.balance')}</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {balance >= 0 ? formatCurrency(balance) : '-' + formatCurrency(Math.abs(balance))}
              </p>
            </div>
            <Wallet className="text-blue-500 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('dashboard.income')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(income)}
              </p>
            </div>
            <TrendingUp className="text-green-500 dark:text-green-400" size={32} />
          </div>
        </div>

        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('dashboard.expenses')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(expense)}
              </p>
            </div>
            <TrendingDown className="text-red-500 dark:text-red-400" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="card">
          <h2 className="text-lg sm:text-xl font-bold mb-4">{t('dashboard.expenseBreakdown')}</h2>
          {expenseByCategoryConverted.length > 0 ? (
            <>
              <div className="w-full" style={{ minHeight: '280px' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expenseByCategoryConverted}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {expenseByCategoryConverted.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.category_color || '#8884d8'} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {expenseByCategoryConverted.map((cat, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.category_color }}
                    ></div>
                    <span className="truncate dark:text-gray-200">{cat.category_name}</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400 ml-auto">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('dashboard.noExpenseData')}
            </div>
          )}
        </div>

        {/* Spending Forecast */}
        {forecastData && forecastData.forecasts && forecastData.forecasts.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold dark:text-gray-100">📈 Next Month Forecast</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">Based on last 3 months</span>
            </div>
            <div className="space-y-3">
              {forecastData.forecasts.map((item, index) => {
                const change = ((item.forecast - item.lastMonth) / item.lastMonth * 100);
                const isIncreasing = change > 5;
                const isDecreasing = change < -5;
                
                return (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.category_color }}
                        ></div>
                        <span className="font-medium dark:text-gray-100">{item.category_name}</span>
                      </div>
                      {isIncreasing && <TrendingUp size={16} className="text-red-500" />}
                      {isDecreasing && <TrendingDown size={16} className="text-green-500" />}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Predicted</div>
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.forecast)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-600 dark:text-gray-400">Last Month</div>
                        <div className="font-semibold dark:text-gray-100">
                          {formatCurrency(item.lastMonth)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-600 dark:text-gray-400">Change</div>
                        <div className={`font-semibold ${
                          change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> Forecasts are based on your spending patterns. Large changes may indicate seasonal variations or lifestyle changes.
              </p>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold dark:text-gray-100">{t('dashboard.recentTransactions')}</h2>
            <Link to="/transactions" className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: transaction.category_color + '20' }}
                    >
                      <span className="text-xl">
                        {transaction.type === 'income' ? '↑' : '↓'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium dark:text-gray-200">{transaction.category_name || t('transactions.uncategorized')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy', { locale: getDateLocale() })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {/* Backend already converted, just format */}
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('dashboard.noTransactions')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {expenseByCategoryConverted.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 dark:text-gray-100">{t('dashboard.topSpendingCategories')}</h2>
          <div className="space-y-3">
            {expenseByCategoryConverted.slice(0, 5).map((category) => {
              const percentage = expense > 0 ? (category.total / expense * 100).toFixed(1) : 0;
              return (
                <div key={category.category_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium dark:text-gray-200">{category.category_name}</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatCurrency(category.total)} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: category.category_color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

