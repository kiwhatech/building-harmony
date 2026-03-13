import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { defaultTranslations, Locale } from '@/i18n/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectBrowserLocale(): Locale {
  const stored = localStorage.getItem('harmony-locale');
  if (stored === 'it' || stored === 'en') return stored;
  
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('it')) return 'it';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectBrowserLocale);
  const [dbTranslations, setDbTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('harmony-locale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  // Fetch DB translations for current locale
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('key, value')
          .eq('locale', locale);

        if (error) {
          console.error('Error fetching translations:', error);
        } else if (data) {
          const map: Record<string, string> = {};
          data.forEach(row => { map[row.key] = row.value; });
          setDbTranslations(map);
        }
      } catch (err) {
        console.error('Error fetching translations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, [locale]);

  // Set html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // DB translations override defaults
    let value = dbTranslations[key] || defaultTranslations[locale]?.[key] || key;
    
    // Replace template params like {{name}}
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
      });
    }
    
    return value;
  }, [locale, dbTranslations]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', options).format(value);
  }, [locale]);

  const formatCurrency = useCallback((value: number, currency = 'EUR'): string => {
    return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-US', {
      style: 'currency',
      currency,
    }).format(value);
  }, [locale]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading, formatNumber, formatCurrency, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
