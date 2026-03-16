import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'Forgot password - Resonance',
      description: 'Request a password reset link.',
    },
    backToSignIn: 'Back to sign in',
    backToHome: 'Back to home',
    title: 'Forgot your password?',
    description: 'Enter your email address and we will send you a link to reset your password.',
    form: {
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      submit: 'Send reset link',
    },
    success: {
      title: '✅ Email sent!',
      description: 'If an account exists with this email, you will receive a reset link.',
    },
    footer: {
      rememberPrefix: 'Remember your password?',
      signIn: 'Sign in',
    },
    errors: {
      enterEmail: 'Please enter your email address.',
      tryAgain: 'An error occurred. Please try again later.',
    },
    sending: 'Sending...',
  },
  fr: {
    meta: {
      title: 'Mot de passe oublié - Resonance',
      description: 'Demander un lien de réinitialisation.',
    },
    backToSignIn: 'Retour à la connexion',
    backToHome: 'Retour à l’accueil',
    title: 'Mot de passe oublié ?',
    description: 'Saisis ton adresse email et nous t’enverrons un lien pour réinitialiser ton mot de passe.',
    form: {
      emailLabel: 'Email',
      emailPlaceholder: 'toi@example.com',
      submit: 'Envoyer le lien',
    },
    success: {
      title: '✅ Email envoyé !',
      description: 'Si un compte existe avec cet email, tu recevras un lien de réinitialisation.',
    },
    footer: {
      rememberPrefix: 'Tu te souviens de ton mot de passe ?',
      signIn: 'Se connecter',
    },
    errors: {
      enterEmail: 'Saisis ton adresse email.',
      tryAgain: 'Une erreur s’est produite. Réessaie plus tard.',
    },
    sending: 'Envoi en cours...',
  },
} satisfies Record<Locale, unknown>

export type ForgotPasswordMessages = (typeof messages)['en']

export function getForgotPasswordMessages(locale: Locale): ForgotPasswordMessages {
  return messages[locale] as ForgotPasswordMessages
}
