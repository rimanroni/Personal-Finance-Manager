export const money = (n: number, compact = false) => {
  if (compact && Math.abs(n) >= 1000) return '৳' + (n / 1000).toFixed(1) + 'k';
  return '৳ ' + Math.round(n).toLocaleString('en-US');
};

export const num = (n: number) => Math.round(n).toLocaleString('en-US');

export const monthName = (key: string, lang = 'en') => {
  const [y, m] = key.split('-').map(Number);
  const bn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${(lang === 'bn' ? bn : en)[m - 1]} ${y}`;
};

export const shortDate = (d: string, lang = 'en') => {
  const [y, m, day] = d.split('-').map(Number);
  const months = lang === 'bn' ? ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(day).padStart(2, '0')} ${months[m - 1]} ${y}`;
};

export const dayLabel = (d: string) => {
  const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const y = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  if (d === t) return 'Today';
  if (d === y) return 'Yesterday';
  return shortDate(d);
};

export const daysUntil = (date: string) => Math.round((new Date(date + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
