/** Label singkat nominal sharing untuk dropdown yang sempit, mis. 18000 → "18rb", 1500000 → "1,5jt". */
export function formatSharingShort(nominal: number): string {
  if (nominal >= 1_000_000) {
    return `${(nominal / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })}jt`;
  }
  if (nominal >= 1000) {
    return `${(nominal / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}rb`;
  }
  return String(nominal);
}
