/** Format server decimal strings without converting the integer part to an imprecise Number. */
export function formatIDR(value: string | null, locale: 'id-ID' | 'en-US') {
  if (value === null) return '—';
  const [whole, cents = ''] = value.split('.');
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).formatToParts(BigInt(whole));
  const lastInteger = parts.map(p => p.type).lastIndexOf('integer');
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')!.value;
  const fraction = cents.replace(/0+$/, '');
  return parts.map((p, i) => p.value + (i === lastInteger && fraction ? decimal + fraction : '')).join('');
}
