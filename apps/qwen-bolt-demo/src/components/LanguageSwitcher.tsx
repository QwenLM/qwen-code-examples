'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/ui/Tooltip';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Tooltip side="bottom" content={t('language.switch')}>
      <button
        onClick={toggleLanguage}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        aria-label="Switch language"
      >
        <Languages className="w-5 h-5 text-gray-400" />
      </button>
    </Tooltip>
  );
}
