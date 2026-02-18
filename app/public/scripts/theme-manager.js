/**
 * Gestionnaire de thème global pour Resonance
 * Compatible avec les View Transitions Astro
 */

class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'dark'
    this.html = document.documentElement
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    this.init()
  }

  init() {
    this.applyTheme()
    this.watchSystemTheme()
    this.setupAstroTransitions()
  }

  applyTheme() {
    this.html.classList.toggle('dark', this.theme === 'dark')
  }

  toggleTheme() {
    // Ajouter une classe de transition pour une animation fluide
    this.html.classList.add('transitioning')

    this.theme = this.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', this.theme)
    this.applyTheme()

    // Retirer la classe de transition après l'animation
    setTimeout(() => {
      this.html.classList.remove('transitioning')
    }, 200)

    // Déclencher un événement personnalisé
    this.dispatchThemeChange()
  }

  dispatchThemeChange() {
    window.dispatchEvent(
      new CustomEvent('themeChanged', {
        detail: { theme: this.theme },
      })
    )
  }

  watchSystemTheme() {
    this.mediaQuery.addEventListener('change', (event) => {
      // Seulement si l'utilisateur n'a pas de préférence sauvegardée
      if (!localStorage.getItem('theme')) {
        this.theme = event.matches ? 'dark' : 'light'
        this.applyTheme()
      }
    })
  }

  setupAstroTransitions() {
    // Réappliquer le thème après les transitions Astro
    document.addEventListener('astro:after-swap', () => {
      this.applyTheme()
      this.reinitializeThemeToggle()
    })

    // Réappliquer le thème après le chargement initial
    document.addEventListener('astro:page-load', () => {
      this.applyTheme()
    })
  }

  reinitializeThemeToggle() {
    // Gérer le bouton principal theme-toggle
    const toggleButton = document.getElementById('theme-toggle')
    if (toggleButton) {
      // Supprimer les anciens event listeners
      toggleButton.replaceWith(toggleButton.cloneNode(true))

      // Réattacher l'événement
      const newToggleButton = document.getElementById('theme-toggle')
      if (newToggleButton) {
        newToggleButton.addEventListener('click', () => this.toggleTheme())
      }
    }

    // Gérer le bouton theme-switcher (composant ThemeSwitcher)
    const switcherButton = document.getElementById('theme-switcher')
    if (switcherButton) {
      // Supprimer les anciens event listeners
      switcherButton.replaceWith(switcherButton.cloneNode(true))

      // Réattacher l'événement
      const newSwitcherButton = document.getElementById('theme-switcher')
      if (newSwitcherButton) {
        newSwitcherButton.addEventListener('click', () => this.toggleTheme())
      }
    }

    // Déclencher un événement pour réinitialiser les composants
    window.dispatchEvent(new CustomEvent('themeSwitcherReinitialize'))
  }

  getCurrentTheme() {
    return this.theme
  }

  setTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      this.theme = theme
      localStorage.setItem('theme', this.theme)
      this.applyTheme()
    }
  }
}

// Initialiser le gestionnaire de thème
const themeManager = new ThemeManager()

// Exposer globalement pour les composants
window.themeManager = themeManager

// Écouter les changements de thème pour mettre à jour les composants
window.addEventListener('themeChanged', (event) => {
  console.log('Thème changé:', event.detail.theme)
})

export default themeManager
