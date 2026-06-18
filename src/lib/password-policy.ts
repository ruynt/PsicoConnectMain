export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MIN_LENGTH_MESSAGE = `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;

export function isPasswordLongEnough(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH;
}
