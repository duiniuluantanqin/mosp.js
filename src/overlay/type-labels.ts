export const TYPE_LABELS: Record<number, string> = {
  1: '安全帽',
  2: '人'
};

export function getTypeLabel(type: number): string {
  return TYPE_LABELS[type] || `${type}`;
}
