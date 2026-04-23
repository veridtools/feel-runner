const MONTH_NAMES: Record<string, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  pt: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  es: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  fr: [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ],
  it: [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ],
  nl: [
    'Januari',
    'Februari',
    'Maart',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Augustus',
    'September',
    'Oktober',
    'November',
    'December',
  ],
};

export function monthNames(locale: string): string[] {
  const lang = locale.split('-')[0]!.toLowerCase();
  return MONTH_NAMES[lang] ?? MONTH_NAMES.en!;
}

export function monthFromName(name: string, locale: string): number | null {
  const lower = name.toLowerCase();
  const tryNames = (names: string[]): number | null => {
    for (let i = 0; i < names.length; i++) {
      const m = names[i]!;
      if (m.toLowerCase() === lower || m.toLowerCase().startsWith(lower)) return i + 1;
    }
    return null;
  };
  const result = tryNames(monthNames(locale));
  if (result !== null) return result;
  for (const lang of Object.keys(MONTH_NAMES)) {
    if (lang === locale.split('-')[0]!.toLowerCase()) continue;
    const r = tryNames(MONTH_NAMES[lang]!);
    if (r !== null) return r;
  }
  return null;
}
