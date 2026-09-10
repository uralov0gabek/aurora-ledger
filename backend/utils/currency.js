import axios from 'axios';
import pool from '../config/database.js';

const API_KEY = process.env.EXCHANGE_RATE_API_KEY || '0fe9acb002e50ab852947697';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// Get exchange rate with caching
export async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    // If same currency, return 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    // Check cache first (valid for 24 hours)
    const cachedRate = await getCachedRate(fromCurrency, toCurrency);
    if (cachedRate) {
      return parseFloat(cachedRate.rate);
    }

    // Fetch from API
    const response = await axios.get(
      `${BASE_URL}/${API_KEY}/pair/${fromCurrency}/${toCurrency}`
    );

    if (response.data.result === 'success') {
      const rate = response.data.conversion_rate;
      
      // Cache it
      await cacheRate(fromCurrency, toCurrency, rate);
      
      return rate;
    } else {
      throw new Error('Failed to fetch exchange rate');
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    
    // If API fails, try to use stale cache
    const staleCache = await getCachedRate(fromCurrency, toCurrency, false);
    if (staleCache) {
      console.log('Using stale cache due to API failure');
      return parseFloat(staleCache.rate);
    }
    
    throw error;
  }
}

// Get all rates for a base currency
export async function getAllRates(baseCurrency) {
  try {
    const response = await axios.get(
      `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`
    );

    if (response.data.result === 'success') {
      return response.data.conversion_rates;
    } else {
      throw new Error('Failed to fetch rates');
    }
  } catch (error) {
    console.error('Error fetching all rates:', error.message);
    throw error;
  }
}

// Convert amount from one currency to another
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  // Handle same currency conversion
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Get exchange rate and convert
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

// Format currency with proper symbol
export function formatCurrency(amount, currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    VND: '₫',
    KRW: '₩',
    THB: '฿',
    SGD: 'S$',
    MYR: 'RM',
    IDR: 'Rp',
    PHP: '₱',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    HKD: 'HK$',
    NZD: 'NZ$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    RUB: '₽',
    BRL: 'R$',
    MXN: '$',
    ZAR: 'R',
    TRY: '₺',
    AED: 'د.إ',
    SAR: 'ر.س',
    UZS: 'soʻm'
  };

  const symbol = symbols[currency] || currency + ' ';
  
  // Currencies without decimal places
  const noDecimalCurrencies = ['VND', 'JPY', 'KRW', 'IDR', 'UZS'];
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: noDecimalCurrencies.includes(currency) ? 0 : 2,
    maximumFractionDigits: noDecimalCurrencies.includes(currency) ? 0 : 2
  }).format(amount);

  // Currencies that put symbol after amount
  const symbolAfterCurrencies = ['VND', 'JPY', 'KRW', 'IDR', 'SEK', 'NOK', 'DKK', 'PLN', 'UZS'];
  
  if (symbolAfterCurrencies.includes(currency)) {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}

// Get cached rate from database
async function getCachedRate(fromCurrency, toCurrency, checkExpiry = true) {
  try {
    let query = `
      SELECT rate, updated_at 
      FROM exchange_rates 
      WHERE from_currency = $1 AND to_currency = $2
    `;

    if (checkExpiry) {
      query += ` AND updated_at > NOW() - INTERVAL '24 hours'`;
    }

    const result = await pool.query(query, [fromCurrency, toCurrency]);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting cached rate:', error);
    return null;
  }
}

// Cache rate in database
async function cacheRate(fromCurrency, toCurrency, rate) {
  try {
    await pool.query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (from_currency, to_currency)
       DO UPDATE SET rate = $3, updated_at = NOW()`,
      [fromCurrency, toCurrency, rate]
    );
  } catch (error) {
    console.error('Error caching rate:', error);
  }
}

// Popular currencies list
export const POPULAR_CURRENCIES = [
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm', flag: '🇺🇿' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' }
];

