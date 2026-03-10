import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={className}>
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="rounded-xl border border-ink-900/10 bg-surface px-3 py-1.5 text-sm text-ink-700 hover:bg-surface-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-0"
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
    </div>
  );
};