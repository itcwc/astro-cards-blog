// 阅读时长估算：中文按 ~350 字/分钟，英文按 ~200 词/分钟
export function readingTime(text: string): number {
  const cn = (text.match(/[一-龥]/g) || []).length;
  const en = (text.match(/[a-zA-Z]+/g) || []).length;
  const minutes = Math.ceil(cn / 350 + en / 200);
  return Math.max(1, minutes);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}
