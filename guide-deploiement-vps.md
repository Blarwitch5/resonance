# Guide de déploiement — Next.js + Claude Code sur VPS Ubuntu

## Vue d'ensemble

```
Ta machine locale  ──deploy.sh──▶  VPS Ubuntu
                                     ├── Nginx (port 80/443)
                                     ├── Next.js via PM2 (port 3000)
                                     └── Claude Code (CLI)
```

---

## Étape 1 — Préparer ta clé SSH

Si tu n'as pas encore de clé SSH, génères-en une sur ta machine locale :

```bash
ssh-keygen -t ed25519 -C "ton@email.com"
# Appuie sur Entrée pour accepter les valeurs par défaut
```

Puis copie ta clé publique sur le VPS :

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@IP_DU_VPS
```

Teste la connexion :

```bash
ssh -i ~/.ssh/id_ed25519 root@IP_DU_VPS
# Tu dois être connecté sans mot de passe
```

---

## Étape 2 — Configurer les scripts

### Dans `setup-vps.sh`

Ouvre le fichier et modifie les variables en haut :

| Variable | Valeur |
|---|---|
| `APP_NAME` | Le nom de ton app (ex: `monapp`) |
| `APP_PORT` | Le port de Next.js (par défaut `3000`) |
| `DOMAIN` | Ton nom de domaine si tu en as un (sinon laisser vide) |
| `NODE_VERSION` | `20` (LTS recommandée) |

### Dans `deploy.sh`

| Variable | Valeur |
|---|---|
| `VPS_USER` | `root` (ou ton utilisateur SSH) |
| `VPS_HOST` | L'IP de ton VPS (ex: `51.75.12.34`) |
| `VPS_KEY` | Chemin vers ta clé SSH (ex: `~/.ssh/id_ed25519`) |
| `APP_NAME` | Même valeur que dans `setup-vps.sh` |
| `APP_PORT` | Même valeur que dans `setup-vps.sh` |

---

## Étape 3 — Setup du VPS (1 seule fois)

Copie `setup-vps.sh` sur le VPS et exécute-le :

```bash
# Depuis ta machine locale
scp -i ~/.ssh/id_ed25519 setup-vps.sh root@IP_DU_VPS:/root/
ssh -i ~/.ssh/id_ed25519 root@IP_DU_VPS "bash /root/setup-vps.sh"
```

Ce script installe automatiquement :
- **Node.js 20 LTS** via nvm
- **PM2** — gestionnaire de processus (garde ton app vivante après reboot)
- **Nginx** — reverse proxy (port 80 → port 3000)
- **Certbot** — certificats SSL gratuits (si domaine configuré)
- **Claude Code** — CLI Anthropic
- **UFW** — firewall (SSH + HTTP/HTTPS autorisés)

---

## Étape 4 — Connecter ton compte Claude.ai sur le VPS

Une fois connecté en SSH, lance :

```bash
claude login
```

Claude Code va afficher une URL. Copie-la et ouvre-la dans ton navigateur sur ta machine locale pour autoriser la connexion. Une fois validé dans le navigateur, Claude Code sera authentifié sur le VPS via ton compte Claude.ai.

Vérifie que ça fonctionne :

```bash
claude --version
# ou
claude -p "dis bonjour"
```

> 💡 L'authentification est persistante — tu n'as pas besoin de relancer `claude login` à chaque session SSH.

---

## Étape 5 — Déployer l'application

Depuis la **racine de ton projet Next.js** sur ta machine locale :

```bash
# Rendre le script exécutable (une seule fois)
chmod +x deploy.sh

# Déployer
./deploy.sh
```

Le script :
1. Build l'app en local (`npm run build`)
2. Transfère les fichiers sur le VPS via `rsync` (sans `.env`, `node_modules`, `.git`)
3. Installe les dépendances sur le VPS
4. Démarre/redémarre l'app avec PM2
5. Vérifie que l'app répond

---

## Étape 6 (optionnel) — Ajouter un domaine + SSL

Si tu as un domaine, pointe son DNS vers l'IP de ton VPS (enregistrement A), puis sur le VPS :

```bash
certbot --nginx -d mondomaine.com
```

Certbot configure automatiquement HTTPS et renouvelle le certificat tous les 90 jours.

---

## Commandes utiles sur le VPS

```bash
# État des processus
pm2 status

# Logs en temps réel
pm2 logs monapp

# Redémarrer l'app
pm2 restart monapp

# Recharger Nginx
systemctl reload nginx

# Utiliser Claude Code
claude
```

---

## Résolution de problèmes courants

**L'app ne démarre pas**
```bash
pm2 logs monapp --lines 50
```

**Nginx affiche une erreur 502**
```bash
# Vérifie que PM2 tourne bien
pm2 status
# Vérifie le port
curl http://localhost:3000
```

**Connexion SSH refusée**
```bash
# Vérifie que ta clé est bien autorisée
cat ~/.ssh/authorized_keys
```

**Reboot du VPS**
PM2 est configuré pour se relancer automatiquement. Vérifie avec :
```bash
pm2 list
```
