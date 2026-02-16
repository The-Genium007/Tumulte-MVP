#!/bin/bash
# =============================================================================
# Tumulte Monitoring Stack - Deploy Script (Production only)
# =============================================================================
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --down             - Arrêter la stack
#   --restart          - Redémarrer la stack
#   --logs             - Afficher les logs
#   --status           - Afficher le statut
#   --help             - Afficher cette aide
#
# Exemples:
#   ./scripts/deploy.sh              # Démarre la stack
#   ./scripts/deploy.sh --down       # Arrête la stack
#   ./scripts/deploy.sh --logs       # Affiche les logs
#
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$(dirname "$SCRIPT_DIR")"
ACTION="up"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    head -22 "$0" | tail -17
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --down)
            ACTION="down"
            shift
            ;;
        --restart)
            ACTION="restart"
            shift
            ;;
        --logs)
            ACTION="logs"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            ;;
    esac
done

cd "$MONITORING_DIR"

# Fichier .env
ENV_FILE=".env.production"

if [[ ! -f "$ENV_FILE" ]]; then
    log_warning "Fichier $ENV_FILE non trouvé, utilisation de .env"
    ENV_FILE=".env"
fi

# Ensure dashboards directory exists
ensure_dashboards_directory() {
    log_info "Vérification du répertoire des dashboards..."

    DASHBOARDS_DIR="grafana/dashboards"

    if [[ ! -d "$DASHBOARDS_DIR" ]]; then
        log_warning "Répertoire $DASHBOARDS_DIR non trouvé, création..."
        mkdir -p "$DASHBOARDS_DIR"
        log_success "Répertoire créé: $DASHBOARDS_DIR"
    fi

    # Check if there are any dashboard files
    DASHBOARD_COUNT=$(find "$DASHBOARDS_DIR" -name "*.json" 2>/dev/null | wc -l)
    if [[ "$DASHBOARD_COUNT" -eq 0 ]]; then
        log_warning "Aucun fichier dashboard (.json) trouvé dans $DASHBOARDS_DIR"
        log_warning "Les dashboards ne seront pas provisionnés automatiquement"
    else
        log_success "$DASHBOARD_COUNT dashboard(s) trouvé(s) dans $DASHBOARDS_DIR"
    fi
}

# Générer les targets Prometheus
generate_prometheus_targets() {
    log_info "Génération des targets Prometheus..."

    cat > prometheus/targets/apps.yml << 'EOF'
# Généré automatiquement par deploy.sh - Ne pas modifier

- targets:
    - 'tumulte-backend-prod:3333'
  labels:
    service: 'backend'
    app: 'tumulte'

- targets:
    - 'tumulte-frontend-prod:3000'
  labels:
    service: 'frontend'
    app: 'tumulte'
EOF

    log_success "Targets générés: tumulte-backend-prod, tumulte-frontend-prod"
}

# Préparer alertmanager.yml avec les webhooks Discord
prepare_alertmanager_config() {
    log_info "Préparation d'Alertmanager..."

    if [[ -f "$ENV_FILE" ]]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi

    ALERTMANAGER_SRC="alertmanager/alertmanager.yml"
    ALERTMANAGER_GEN="alertmanager/alertmanager.generated.yml"

    cp "$ALERTMANAGER_SRC" "$ALERTMANAGER_GEN"

    if [[ -n "$DISCORD_MONITORING_WEBHOOK_URL" ]]; then
        sed -i.bak "s|DISCORD_MONITORING_WEBHOOK_PLACEHOLDER|$DISCORD_MONITORING_WEBHOOK_URL|g" "$ALERTMANAGER_GEN"
        rm -f "$ALERTMANAGER_GEN.bak"
        log_success "Webhook monitoring configuré"
    else
        log_warning "DISCORD_MONITORING_WEBHOOK_URL non défini"
    fi

    if [[ -n "$DISCORD_CRITICAL_WEBHOOK_URL" ]]; then
        sed -i.bak "s|DISCORD_CRITICAL_WEBHOOK_PLACEHOLDER|$DISCORD_CRITICAL_WEBHOOK_URL|g" "$ALERTMANAGER_GEN"
        rm -f "$ALERTMANAGER_GEN.bak"
        log_success "Webhook critical configuré"
    else
        log_warning "DISCORD_CRITICAL_WEBHOOK_URL non défini"
    fi
}

# Commande Docker Compose
DOCKER_COMPOSE="docker compose --env-file $ENV_FILE"

case $ACTION in
    up)
        log_info "Démarrage monitoring (production)..."
        generate_prometheus_targets
        ensure_dashboards_directory
        prepare_alertmanager_config

        $DOCKER_COMPOSE up -d

        log_success "Stack monitoring démarrée!"
        echo ""
        log_info "Containers:"
        echo "  - tumulte-grafana"
        echo "  - tumulte-prometheus"
        echo "  - tumulte-alertmanager"
        echo ""
        log_info "Targets Prometheus:"
        echo "  - tumulte-backend-prod:3333"
        echo "  - tumulte-frontend-prod:3000"
        echo ""
        log_info "Le tunnel Cloudflare route vers:"
        echo "  - tumulte-grafana:3000"
        ;;
    down)
        log_info "Arrêt monitoring..."
        $DOCKER_COMPOSE down
        log_success "Stack arrêtée"
        ;;
    restart)
        log_info "Redémarrage monitoring..."
        $DOCKER_COMPOSE down
        generate_prometheus_targets
        ensure_dashboards_directory
        prepare_alertmanager_config
        $DOCKER_COMPOSE up -d
        log_success "Stack redémarrée"
        ;;
    logs)
        $DOCKER_COMPOSE logs -f
        ;;
    status)
        log_info "Statut monitoring:"
        $DOCKER_COMPOSE ps
        ;;
esac
