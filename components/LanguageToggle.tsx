'use client';

import { useState, useEffect } from 'react';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  onLanguageChange?: (lang: 'en' | 'hi') => void;
}

export default function LanguageToggle({ onLanguageChange }: LanguageToggleProps) {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    // Load language from localStorage
    const saved = localStorage.getItem('language') as 'en' | 'hi';
    if (saved) {
      setLanguage(saved);
      onLanguageChange?.(saved);
    }
  }, [onLanguageChange]);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    onLanguageChange?.(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold min-h-[48px]"
      aria-label="Toggle language"
    >
      <Languages size={20} />
      <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
    </button>
  );
}

