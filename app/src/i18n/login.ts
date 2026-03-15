import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'Sign In - Resonance',
      description: 'Sign in to your account.',
    },
    title: 'Sign in to Resonance',
    backToHome: 'Back to home',
    form: {
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      submit: 'Sign In',
      signingIn: 'Signing in...',
      forgotPassword: 'Forgot your password?',
      noAccountPrefix: "Don't have an account?",
      createAccount: 'Create an account',
    },
    errors: {
      fillRequired: 'Please fill in all required fields.',
      signInError: 'Error while signing in',
      generic: 'An error occurred',
    },
    toasts: {
      signedOutSuccess: 'You have been signed out successfully. See you soon!',
      oauthNotConfigured: 'OAuth sign-in is not configured yet. Please use email sign-in.',
    },
  },
  fr: {
    meta: {
      title: 'Connexion - Resonance',
      description: 'Connecte-toi à ton compte.',
    },
    title: 'Connexion à Resonance',
    backToHome: 'Retour à l’accueil',
    form: {
      emailLabel: 'Email',
      emailPlaceholder: 'toi@example.com',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      showPassword: 'Afficher le mot de passe',
      hidePassword: 'Masquer le mot de passe',
      submit: 'Se connecter',
      signingIn: 'Connexion...',
      forgotPassword: 'Mot de passe oublié ?',
      noAccountPrefix: 'Pas encore de compte ?',
      createAccount: 'Créer un compte',
    },
    errors: {
      fillRequired: 'Renseigne tous les champs obligatoires.',
      signInError: 'Erreur lors de la connexion',
      generic: 'Une erreur s\'est produite',
    },
    toasts: {
      signedOutSuccess: 'Tu as été déconnecté avec succès. À bientôt !',
      oauthNotConfigured: 'La connexion OAuth n\'est pas encore configurée. Utilise la connexion par email.',
    },
  },
} satisfies Record<Locale, unknown>

export type LoginMessages = (typeof messages)['en']

export function getLoginMessages(locale: Locale): LoginMessages {
  return messages[locale] as LoginMessages
}
