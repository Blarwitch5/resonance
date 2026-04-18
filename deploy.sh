#!/bin/bash
# =============================================================
#  deploy.sh — À exécuter depuis ta MACHINE LOCALE
#  Envoie le code sur le VPS et relance l'application
#  Usage : bash deploy.sh
# =============================================================

set -e

# ── Couleurs ──────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ══════════════════════════════════════════════════════════════
# ⚙️  CONFIGURATION — à modifier avant la première utilisation
# ══════════════════════════════════════════════════════════════
VPS_USER="root"                        # Utilisateur SSH sur le VPS
VPS_HOST="0.0.0.0"                     # IP ou domaine de ton VPS
VPS_KEY="~/.ssh/id_ed25519"            # Chemin vers ta clé SSH privée
APP_NAME="monapp"                      # Même valeur que dans setup-vps.sh
APP_PORT=3000                          # Port Next.js
REMOTE_DIR="/var/www/${APP_NAME}"      # Dossier sur le VPS
LOCAL_DIR="."                          # Dossier local à envoyer (. = dossier courant)
# ══════════════════════════════════════════════════════════════

SSH_CMD="ssh -i ${VPS_KEY} -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST}"

echo ""
echo "============================================="
echo "   🚀  Déploiement → ${VPS_HOST}"
echo "============================================="
echo ""

# ── Vérifications locales ─────────────────────────────────────
info "Vérification de la configuration..."

[ "$VPS_HOST" = "0.0.0.0" ] && error "Configure VPS_HOST avec l'IP de ton VPS !"
[ -f "package.json" ] || error "Lance ce script depuis la racine de ton projet Next.js (package.json introuvable)"
command -v rsync >/dev/null 2>&1 || error "rsync n'est pas installé sur ta machine (brew install rsync)"

# ── Build local ───────────────────────────────────────────────
info "Build de l'application Next.js..."
npm run build || error "Le build a échoué. Corrige les erreurs avant de déployer."
info "Build réussi ✓"

# ── Envoi du code sur le VPS ──────────────────────────────────
info "Transfert des fichiers vers le VPS..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='.env*' \
  --exclude='node_modules' \
  --exclude='.next/cache' \
  -e "ssh -i ${VPS_KEY} -o StrictHostKeyChecking=no" \
  "${LOCAL_DIR}/" \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"
info "Transfert terminé ✓"

# ── Installation des dépendances sur le VPS ───────────────────
info "Installation des dépendances sur le VPS..."
$SSH_CMD "cd ${REMOTE_DIR} && npm ci --omit=dev"
info "Dépendances installées ✓"

# ── Redémarrage de l'app avec PM2 ────────────────────────────
info "Redémarrage de l'application..."
$SSH_CMD bash <<EOF
  cd ${REMOTE_DIR}

  # Crée le fichier ecosystem PM2 si inexistant
  if [ ! -f ecosystem.config.js ]; then
    cat > ecosystem.config.js <<PMEOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: 'node_modules/.bin/next',
    args: 'start -p ${APP_PORT}',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    restart_delay: 3000,
    max_restarts: 10
  }]
}
PMEOF
  fi

  # Redémarre ou démarre l'app
  pm2 describe ${APP_NAME} > /dev/null 2>&1 \
    && pm2 reload ${APP_NAME} \
    || pm2 start ecosystem.config.js

  pm2 save
EOF
info "Application redémarrée ✓"

# ── Vérification santé ────────────────────────────────────────
info "Vérification que l'app répond..."
sleep 3
$SSH_CMD "curl -sf http://localhost:${APP_PORT} > /dev/null" \
  && info "App accessible sur le port ${APP_PORT} ✓" \
  || warning "L'app ne répond pas encore — vérifie avec : pm2 logs ${APP_NAME}"

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo "============================================="
echo "   ✅  Déploiement réussi !"
echo "============================================="
echo ""
echo "  URL locale VPS : http://${VPS_HOST}"
echo ""
echo "  Commandes utiles sur le VPS :"
echo "    pm2 logs ${APP_NAME}      → voir les logs"
echo "    pm2 status                → état des processus"
echo "    pm2 restart ${APP_NAME}   → redémarrer manuellement"
echo ""
