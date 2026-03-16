# Fix: Problème de formatage automatique des fichiers Astro

## Problème
Les fichiers `.astro` sont automatiquement corrompus lors de la sauvegarde, avec les imports qui sont mal formatés.

## Solution immédiate

### 1. Redémarrer Cursor complètement
- `Cmd+Shift+P` → "Developer: Reload Window"
- Ou fermer et rouvrir Cursor

### 2. Vérifier les extensions installées

Ouvrez les extensions (`Cmd+Shift+X`) et **désactivez temporairement** :

- ✅ **Prettier - Code formatter** (esbenp.prettier-vscode)
- ✅ **Astro** (astro-build.astro-vscode) 
- ✅ **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- ✅ **ESLint** (dbaeumer.vscode-eslint)

### 3. Vérifier les paramètres utilisateur globaux

1. Ouvrez les paramètres : `Cmd+,`
2. Recherchez "format on save"
3. Assurez-vous que c'est **désactivé** globalement
4. Recherchez "organize imports"
5. Assurez-vous que c'est **désactivé** globalement

### 4. Vérifier les paramètres workspace

Les fichiers suivants sont déjà configurés :
- `.vscode/settings.json` ✅
- `.cursor/settings.json` ✅
- `.prettierignore` ✅ (tous les fichiers `*.astro` sont ignorés)
- `.prettierrc` ✅ (pas de plugin Astro)

## Si le problème persiste

### Option 1: Désactiver toutes les extensions de formatage
1. Ouvrez les extensions
2. Désactivez **toutes** les extensions liées au formatage
3. Redémarrez Cursor
4. Réactivez une par une pour identifier la coupable

### Option 2: Vérifier les hooks Git
```bash
cd app
ls -la .git/hooks/
```
Si des hooks existent, vérifiez leur contenu.

### Option 3: Vérifier les scripts package.json
Le script `format` dans `package.json` utilise maintenant `.prettierignore` pour exclure les fichiers Astro.

## Configuration actuelle

Tous les fichiers Astro sont protégés par :
- ✅ `.prettierignore` : `*.astro` ignoré
- ✅ `.vscode/settings.json` : formatage désactivé pour Astro
- ✅ `.cursor/settings.json` : formatage désactivé pour Astro
- ✅ `astro.format.enabled: false` dans les settings
- ✅ `prettier.enable: false` dans les settings

## Test

1. Ouvrez un fichier `.astro`
2. Modifiez-le légèrement
3. Sauvegardez (`Cmd+S`)
4. Vérifiez que les imports ne sont pas corrompus

Si le problème persiste après ces étapes, c'est probablement une extension Cursor spécifique qui n'est pas contrôlée par les paramètres standards.
