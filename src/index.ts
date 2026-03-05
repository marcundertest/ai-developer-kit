/** The current version of the package, kept in sync with package.json. */
export const version = '1.4.56';

/** Returns the string 'pong'. Used as a liveness probe. */
export const ping = () => 'pong';

/**
 * Divides two numbers.
 * @param a - The dividend.
 * @param b - The divisor.
 * @returns The result of dividing a by b.
 * @throws {Error} If the divisor is zero.
 */
export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('Division by zero is not allowed');
  return a / b;
};
