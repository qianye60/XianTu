export const getMemoryTime = (memory: unknown): string => {
  if (typeof memory === 'string') {
    return '未知时间';
  } else if (memory && typeof memory === 'object') {
    return (memory as { 时间?: string }).时间 || '未知时间';
  }
  return '未知时间';
};

export const getMemoryEvent = (memory: unknown): string => {
  if (typeof memory === 'string') {
    return memory;
  } else if (memory && typeof memory === 'object') {
    return (memory as { 事件?: string }).事件 || '';
  }
  return '';
};