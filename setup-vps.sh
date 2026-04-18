#!/bin/bash
# =============================================================
#  setup-vps.sh — À exécuter UNE SEULE FOIS sur le VPS
#  Compatible : Ubuntu 22.04 / 24.04
#  Usage : bash setup-vps.sh
# =============================================================

set -e  # Arrête le script si une commande échoue

# ── Couleurs ──────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Variables à personnaliser ─────────────────────────────────
APP_NAME="monapp"          # Nom de ton app (sans espaces)
APP_PORT=3000              # Port sur lequel tourne Next.js
DOMAIN=""                  # Ton domaine, ex: monsite.com (laisser vide si pas de domaine)
NODE_VERSION="20"          # Version LTS de Node.js

# =============================================================
echo ""
echo "============================================="
echo "   🚀  Setup VPS — Ubuntu 22.04/24.04"
echo "============================================="
echo ""

# ── 1. Mise à jour système ────────────────────────────────────
info "Mise à jour des paquets système..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git wget unzip ufw nginx certbot python3-certbot-nginx

# ── 2. Installation de Node.js via nvm ────────────────────────
info "Installation de nvm + Node.js ${NODE_VERSION}..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Charger nvm dans le shell courant
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install "$NODE_VERSION"
nvm use "$NODE_VERSION"
nvm alias default "$NODE_VERSION"

# Rendre node/npm disponibles globalement
NODE_PATH=$(nvm which default)
ln -sf "$NODE_PATH" /usr/local/bin/node
ln -sf "$(dirname $NODE_PATH)/npm" /usr/local/bin/npm
ln -sf "$(dirname $NODE_PATH)/npx" /usr/local/bin/npx

info "Node.js $(node -v) installé ✓"
info "npm $(npm -v) installé ✓"

# ── 3. Installation de PM2 ────────────────────────────────────
info "Installation de PM2 (gestionnaire de processus)..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
info "PM2 $(pm2 -v) installé ✓"

# ── 4. Installation de Claude Code ───────────────────────────
info "Installation de Claude Code..."
npm install -g @anthropic-ai/claude-code
info "Claude Code installé ✓"
echo ""
warning "⚠️  Authentification requise après le setup :"
warning "   Connecte-toi avec ton compte Claude.ai en lançant :"
warning "   claude login"
warning "   (Un lien s'affichera — ouvre-le dans ton navigateur pour autoriser)"
echo ""

# ── 5. Dossier de l'application ───────────────────────────────
info "Création du dossier /var/www/${APP_NAME}..."
mkdir -p /var/www/${APP_NAME}

# ── 6. Configuration Nginx ────────────────────────────────────
info "Configuration de Nginx comme reverse proxy..."

cat > /etc/nginx/sites-available/${APP_NAME} <<EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};

    # Logs
    access_log /var/log/nginx/${APP_NAME}.access.log;
    error_log  /var/log/nginx/${APP_NAME}.error.log;

    location / {
        proxy_pass         http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
info "Nginx configuré ✓"

# ── 7. Firewall (ufw) ─────────────────────────────────────────
info "Configuration du firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
info "Firewall activé ✓"

# ── 8. SSL avec Certbot (optionnel) ───────────────────────────
if [ -n "$DOMAIN" ]; then
  info "Installation du certificat SSL pour ${DOMAIN}..."
  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN} || \
    warning "Certbot a échoué — configure le DNS de ${DOMAIN} d'abord, puis relance : certbot --nginx -d ${DOMAIN}"
else
  warning "Aucun domaine défini — SSL ignoré. Renseigne DOMAIN= en haut du script pour l'activer."
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo "============================================="
echo "   ✅  Setup terminé !"
echo "============================================="
echo ""
echo "  App folder  : /var/www/${APP_NAME}"
echo "  Node.js     : $(node -v)"
echo "  PM2         : $(pm2 -v)"
echo "  Nginx       : actif (port 80 → ${APP_PORT})"
echo "  Claude Code : $(claude --version 2>/dev/null || echo 'installé')"
echo ""
echo "  ➡️  Lance 'claude login' pour connecter ton compte Claude.ai"
echo "  ➡️  Ensuite déploie ton app avec ./deploy.sh"
echo ""
