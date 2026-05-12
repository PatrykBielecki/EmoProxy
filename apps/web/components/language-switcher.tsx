'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import { useI18n } from './providers';
import { LOCALES, type Locale } from '../lib/i18n';

type LanguageOption = {
  value: Locale;
  label: string;
};

const LOCALE_FLAG: Record<Locale, string> = {
  en: '🇬🇧',
  pl: '🇵🇱'
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const options: LanguageOption[] = LOCALES.map((item) => ({
    value: item,
    label: `${LOCALE_FLAG[item]} ${item === 'en' ? t('language.english') : t('language.polish')}`
  }));

  return (
    <div className="fixed left-3 top-3 z-[100] w-44 rounded bg-white/90 p-1 shadow backdrop-blur">
      <Select<LanguageOption, false>
        instanceId="language-switcher"
        inputId="language-switcher"
        options={options}
        value={options.find((option) => option.value === locale) ?? null}
        isSearchable={false}
        classNamePrefix="language-select"
        onChange={(option) => {
          if (!option) return;
          setLocale(option.value);
        }}
        styles={{
          control: (base) => ({ ...base, borderColor: 'rgba(177, 116, 87, 0.4)', minHeight: 36 }),
          menuPortal: (base) => ({ ...base, zIndex: 110 }),
          menu: (base) => ({ ...base, zIndex: 110 })
        }}
      />
    </div>
  );
}
