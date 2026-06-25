export function createGeneratedPassword(length = 8) {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const allChars = `${lower}${upper}${digits}`;

  const pick = (source) => source[Math.floor(Math.random() * source.length)];
  const nextPassword = [pick(lower), pick(upper), pick(digits)];

  while (nextPassword.length < Math.max(8, length)) {
    nextPassword.push(pick(allChars));
  }

  return nextPassword.sort(() => Math.random() - 0.5).join('');
}
