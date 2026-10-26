export function authErrorMessage(error, fallback) {
  if (error?.status === 429) {
    return 'Too many attempts. Wait a little while and try again.'
  }

  switch (error?.code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'email_not_confirmed':
      return 'Confirm your email address before signing in.'
    case 'user_already_exists':
      return 'Unable to create this account. If it already exists, try signing in or resetting the password.'
    case 'weak_password':
      return 'Choose a stronger password that meets the project password requirements.'
    case 'over_email_send_rate_limit':
      return 'Email requests are temporarily limited. Wait before trying again.'
    default:
      return fallback
  }
}
