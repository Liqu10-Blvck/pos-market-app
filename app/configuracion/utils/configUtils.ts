/**
 * Utilidades para el módulo de configuración.
 */

/**
 * Valida si el formato de correo es correcto.
 */
export const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Valida si la contraseña tiene la longitud mínima requerida.
 */
export const validarPassword = (password: string): boolean => {
  return password.length >= 6;
};
