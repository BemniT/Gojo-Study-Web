export function validatePasswordChange(currentValue, value, confirmValue) {
  const nextErrors = {};
  const currentPasswordValue = String(currentValue || '');
  const passwordValue = String(value || '');
  const confirmPasswordValue = String(confirmValue || '');
  const hasPasswordInput = Boolean(currentPasswordValue || passwordValue || confirmPasswordValue);

  if (!hasPasswordInput) return nextErrors;

  if (!currentPasswordValue) nextErrors.currentPassword = 'Enter your current password.';

  if (!passwordValue) {
    nextErrors.password = 'Enter a new password.';
    return nextErrors;
  }

  if (passwordValue.length < 8) {
    nextErrors.password = 'Password must be at least 8 characters.';
  } else if (!/[a-z]/.test(passwordValue) || !/[A-Z]/.test(passwordValue) || !/\d/.test(passwordValue)) {
    nextErrors.password = 'Password must include uppercase, lowercase, and a number.';
  }

  if (!confirmPasswordValue) {
    nextErrors.confirmPassword = 'Please confirm the new password.';
  } else if (passwordValue !== confirmPasswordValue) {
    nextErrors.confirmPassword = 'Passwords do not match.';
  }

  return nextErrors;
}

export function getPasswordChecks(password) {
  const next = String(password || '');
  return [
    { label: 'At least 8 characters', ok: next.length >= 8 },
    { label: 'Contains uppercase', ok: /[A-Z]/.test(next) },
    { label: 'Contains lowercase', ok: /[a-z]/.test(next) },
    { label: 'Contains a number', ok: /\d/.test(next) },
  ];
}

export function sanitizeProfileImageValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === '/default-profile.png') return '';
  if (lower.startsWith('file://') || lower.startsWith('content://')) return '';
  return raw;
}
