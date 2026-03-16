# Désactiver le plugin Astro de Cursor

## Problème

Le plugin Astro de Cursor corrompt automatiquement les imports dans les fichiers `.astro` lors de la sauvegarde, transformant :
```typescript
import Plus from '@lucide/astro/icons/plus'
```
en :
```
impoPlusble from '@lucide/astro/icoplusble'
```

## Solution : Désactiver le plugin Astro

### Étape 1 : Vérifier les extensions installées

1. Ouvrez les extensions dans Cursor : `Cmd+Shift+X`
2. Recherchez "Astro" dans les extensions installées
3. **Désactivez** ou **désinstallez** les extensions suivantes :
   - `astro-build.astro-vscode` (Astro)
   - Toute autre extension liée à Astro

### Étape 2 : Vérifier les paramètres utilisateur globaux

1. Ouvrez les paramètres : `Cmd+,`
2. Recherchez "format on save"
3. Assurez-vous que c'est **désactivé** globalement
4. Recherchez "organize imports"
5. Assurez-vous que c'est **désactivé** globalement
6. Recherchez "astro"
7. Désactivez toutes les options liées à Astro :
   - `astro.format.enabled` → `false`
   - `astro.autoRenameTags` → `false`

### Étape 3 : Vérifier les paramètres workspace

Les fichiers suivants sont déjà configurés dans ce projet :
- ✅ `.cursor/settings.json` - Désactive le formatage pour Astro
- ✅ `.vscode/settings.json` - Désactive le formatage pour Astro
- ✅ `.prettierignore` - Ignore tous les fichiers `*.astro`
- ✅ `.prettierrc` - Pas de plugin Astro

### Étape 4 : Redémarrer Cursor

Après avoir désactivé les extensions :
1. Fermez complètement Cursor
2. Rouvrez Cursor
3. Testez en modifiant un fichier `.astro` et sauvegardez

## Si le problème persiste

### Option 1 : Vérifier les hooks Git

```bash
cd app
ls -la .git/hooks/
```

Si des hooks existent, vérifiez leur contenu pour voir s'ils formatent automatiquement.

### Option 2 : Vérifier les scripts package.json

Le script `format` dans `package.json` utilise maintenant `.prettierignore` pour exclure les fichiers Astro.

### Option 3 : Désactiver toutes les extensions de formatage

1. Ouvrez les extensions
2. Désactivez **toutes** les extensions liées au formatage :
   - Prettier
   - ESLint
   - Astro
   - Tailwind CSS IntelliSense
3. Redémarrez Cursor
4. Réactivez une par une pour identifier la coupable

## Configuration actuelle

Tous les fichiers Astro sont protégés par :
- ✅ `.prettierignore` : `*.astro` ignoré
- ✅ `.cursor/settings.json` : formatage désactivé pour Astro
- ✅ `.vscode/settings.json` : formatage désactivé pour Astro
- ✅ `astro.format.enabled: false` dans les settings
- ✅ `prettier.enable: false` dans les settings

## Test

1. Ouvrez un fichier `.astro`
2. Modifiez-le légèrement
3. Sauvegardez (`Cmd+S`)
4. Vérifiez que les imports ne sont **pas** corrompus

Si le problème persiste après ces étapes, c'est probablement une extension Cursor spécifique qui n'est pas contrôlée par les paramètres standards.
