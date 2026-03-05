export const version = '1.4.54';
export const ping = () => 'pong';

export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('Division by zero is not allowed');
  return a / b;
};
