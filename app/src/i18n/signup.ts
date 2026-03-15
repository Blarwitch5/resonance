import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'Sign Up - Resonance',
      description: 'Create your account.',
    },
    backToHome: 'Back to home',
    form: {
      nameLabel: 'Full Name',
      namePlaceholder: 'John Doe',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Minimum 8 characters',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      submit: 'Create Account',
      creating: 'Creating account...',
      hasAccountPrefix: 'Already have an account?',
      signIn: 'Sign In',
    },
    errors: {
      fillRequired: 'Please fill in all required fields.',
      createAccountError: 'Error while creating account',
      generic: 'An error occurred',
    },
  },
  fr: {
    meta: {
      title: 'Inscription - Resonance',
      description: 'Crée ton compte.',
    },
    backToHome: 'Retour à l’accueil',
    form: {
      nameLabel: 'Nom complet',
      namePlaceholder: 'Jean Dupont',
      emailLabel: 'Email',
      emailPlaceholder: 'toi@example.com',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Minimum 8 caractères',
      showPassword: 'Afficher le mot de passe',
      hidePassword: 'Masquer le mot de passe',
      submit: 'Créer le compte',
      creating: 'Création du compte...',
      hasAccountPrefix: 'Tu as déjà un compte ?',
      signIn: 'Se connecter',
    },
    errors: {
      fillRequired: 'Renseigne tous les champs obligatoires.',
      createAccountError: 'Erreur lors de la création du compte',
      generic: 'Une erreur s\'est produite',
    },
  },
} satisfies Record<Locale, unknown>

export type SignupMessages = (typeof messages)['en']

export function getSignupMessages(locale: Locale): SignupMessages {
  return messages[locale] as SignupMessages
}
