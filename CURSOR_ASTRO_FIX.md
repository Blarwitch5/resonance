# Solution : Cursor corrompt les imports Astro (sans Giga AI)

## Problème

Cursor corrompt automatiquement les imports dans les fichiers `.astro` lors de la sauvegarde. Ce n'est **PAS** un problème de contexte AI comme mentionné dans l'article, mais un problème d'**extension/formatter** qui s'exécute automatiquement.

## Solutions (sans Giga AI)

D'après l'article [Cursor Breaking Astro Code](https://gigamind.dev/blog/ai-breaking-code-cursor-breaking-astro-code), voici les solutions applicables **sans Giga AI** :

### 1. Créer des fichiers de contexte détaillés ✅ (Déjà fait)

Nous avons créé :
- `.cursorrules` - Règles pour Cursor
- `DISABLE_ASTRO_PLUGIN.md` - Guide de désactivation
- `.cursor/settings.json` - Configuration stricte

### 2. Désactiver l'extension Astro (Solution principale)

**C'est la solution la plus importante** :

1. Ouvrez les extensions : `Cmd+Shift+X`
2. Recherchez "Astro"
3. **Désactivez** ou **désinstallez** :
   - `astro-build.astro-vscode`
   - `astro.astro-vscode`
   - Toute extension Astro

### 3. Configuration stricte (Déjà en place)

Les fichiers suivants sont configurés :
- ✅ `.cursor/settings.json` - Association `.astro` → `plaintext`
- ✅ `.vscode/settings.json` - Formatage désactivé
- ✅ `.prettierignore` - `*.astro` ignoré
- ✅ `.prettierrc` - Pas de plugin Astro

### 4. Vérifier les paramètres utilisateur globaux

1. `Cmd+,` → Recherchez "format on save" → **Désactivé**
2. Recherchez "organize imports" → **Désactivé**
3. Recherchez "astro" → Désactivez toutes les options

### 5. Redémarrer Cursor

Après avoir désactivé l'extension Astro :
1. Fermez complètement Cursor
2. Rouvrez Cursor
3. Testez avec un fichier `.astro`

## Différence avec l'article

L'article parle de **Cursor qui génère du mauvais code** (problème de contexte), mais votre problème est différent : **Cursor corrompt les imports existants au save** (problème d'extension/formatter).

## Solution finale

**Désactivez complètement l'extension Astro dans Cursor**. C'est la seule solution qui fonctionne vraiment pour ce problème spécifique.
