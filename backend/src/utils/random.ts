/**
 * Linear Congruential Generator (LCG) for deterministic pseudo-random numbers
 * Using parameters from Numerical Recipes
 */
export class SeededRandom {
  private seed: number;
  private readonly m = 2147483647; // 2^31 - 1
  private readonly a = 1664525;
  private readonly c = 1013904223;

  constructor(seed: number = Date.now()) {
    this.seed = seed % this.m;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate random delay with jitter
   */
  nextDelay(baseMs: number, jitterPercent: number = 0.2): number {
    const jitter = baseMs * jitterPercent;
    return Math.round(baseMs + this.nextFloat(-jitter, jitter));
  }

  /**
   * Generate random phone number
   */
  nextPhoneNumber(prefix: string = "+7"): string {
    const number = this.nextInt(9000000000, 9999999999);
    return `${prefix}${number}`;
  }

  /**
   * Generate random amount within range
   */
  nextAmount(min: number, max: number, step: number = 1): number {
    const steps = Math.floor((max - min) / step);
    return min + this.nextInt(0, steps) * step;
  }

  /**
   * Reset seed
   */
  reset(seed: number): void {
    this.seed = seed % this.m;
  }
}

/**
 * Generate random string of given length
 */
export function randomString(length: number, chars: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random device fingerprint
 */
export function randomDeviceFingerprint(): string {
  return randomString(16, "0123456789abcdef");
}