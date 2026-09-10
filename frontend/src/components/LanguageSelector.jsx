import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LANGUAGES = [
  { code: 'uz', name: 'Oʻzbekcha', flag: '🇺🇿' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSelector({ className = '' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleSelect = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        title="Change Language"
      >
        <Languages size={18} className="text-gray-600 dark:text-gray-300" />
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="font-medium flex-1 text-left text-sm text-gray-800 dark:text-gray-100">{currentLanguage.name}</span>
        <svg className={`w-4 h-4 transition-transform text-gray-600 dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 max-h-80 overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  lang.code === i18n.language ? 'bg-blue-50 dark:bg-blue-950/50 border-l-4 border-blue-600' : ''
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lang.name}</div>
                </div>
                {lang.code === i18n.language && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

