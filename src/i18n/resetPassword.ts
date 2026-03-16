import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'Reset password - Resonance',
      description: 'Set a new password.',
    },
    backToSignIn: 'Back to sign in',
    backToHome: 'Back to home',
    title: 'Reset password',
    description: 'Enter your new password below.',
    form: {
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Minimum 8 characters, with uppercase, lowercase, number, and special character.',
      submit: 'Reset password',
    },
    noToken: {
      title: 'Missing token',
      description: 'The reset link is invalid or has expired.',
      requestNew: 'Request a new link',
    },
    success: {
      title: '✅ Password reset!',
      redirecting: 'Redirecting to the sign-in page...',
    },
    errors: {
      minLength: 'Password must be at least 8 characters long',
      lowercase: 'Password must contain at least one lowercase letter',
      uppercase: 'Password must contain at least one uppercase letter',
      number: 'Password must contain at least one number',
      special: 'Password must contain at least one special character',
      noMatch: 'Passwords do not match',
      generic: 'Error while resetting password.',
      tryAgain: 'An error occurred. Please try again later.',
    },
    submitting: 'Resetting...',
  },
  fr: {
    meta: {
      title: 'Réinitialiser le mot de passe - Resonance',
      description: 'Définir un nouveau mot de passe.',
    },
    backToSignIn: 'Retour à la connexion',
    backToHome: 'Retour à l’accueil',
    title: 'Réinitialiser le mot de passe',
    description: 'Saisis ton nouveau mot de passe ci-dessous.',
    form: {
      newPasswordLabel: 'Nouveau mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Minimum 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial.',
      submit: 'Réinitialiser le mot de passe',
    },
    noToken: {
      title: 'Lien invalide',
      description: 'Le lien de réinitialisation est invalide ou a expiré.',
      requestNew: 'Demander un nouveau lien',
    },
    success: {
      title: '✅ Mot de passe réinitialisé !',
      redirecting: 'Redirection vers la page de connexion...',
    },
    errors: {
      minLength: 'Le mot de passe doit contenir au moins 8 caractères',
      lowercase: 'Le mot de passe doit contenir au moins une minuscule',
      uppercase: 'Le mot de passe doit contenir au moins une majuscule',
      number: 'Le mot de passe doit contenir au moins un chiffre',
      special: 'Le mot de passe doit contenir au moins un caractère spécial',
      noMatch: 'Les mots de passe ne correspondent pas',
      generic: 'Erreur lors de la réinitialisation du mot de passe.',
      tryAgain: 'Une erreur s’est produite. Réessaie plus tard.',
    },
    submitting: 'Réinitialisation...',
  },
} satisfies Record<Locale, unknown>

export type ResetPasswordMessages = (typeof messages)['en']

export function getResetPasswordMessages(locale: Locale): ResetPasswordMessages {
  return messages[locale] as ResetPasswordMessages
}
