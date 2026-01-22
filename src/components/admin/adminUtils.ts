export const formatDate = (isoText: string): string => {
  if (!isoText) return '-';
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;
  return date.toLocaleString();
};

export const parseJsonSafe = (value: string): { ok: true; data: any } | { ok: false; error: string } => {
  if (!value.trim()) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(value) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'JSON解析失败' };
  }
};
