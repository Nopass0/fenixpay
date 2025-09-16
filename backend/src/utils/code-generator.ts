/**
 * Generate a random alphanumeric code
 * @param length - Length of the code to generate
 * @returns Random alphanumeric string
 */
export function generateRandomCode(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Generate a random numeric code
 * @param length - Length of the code to generate
 * @returns Random numeric string
 */
export function generateNumericCode(length: number): string {
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  
  return result;
}