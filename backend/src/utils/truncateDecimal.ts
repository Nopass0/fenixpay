export function truncateToTwoDecimals(value: number): number {
  // Умножаем на 100, отбрасываем дробную часть, делим обратно на 100
  return Math.trunc(value * 100) / 100;
}