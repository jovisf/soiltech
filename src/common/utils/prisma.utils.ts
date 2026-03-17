import { User } from '@prisma/client';

/**
 * Excludes the password field from a User object.
 */
export function excludePassword<T extends User>(user: T): Omit<T, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reason: password is sensitive and should not be returned
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
