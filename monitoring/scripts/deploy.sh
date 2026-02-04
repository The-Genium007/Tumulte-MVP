#!/bin/bash
# =============================================================================
# Tumulte Monitoring Stack - Deploy Script
# =============================================================================
#
# Usage:
#   ./scripts/deploy.sh [environment] [options]
#
# Environments:
#   staging            - Environnement de staging (ENV_SUFFIX=staging)
#   prod, production   - Environnement de production (ENV_SUFFIX=prod)
#
# Options:
#   --down             - Arrêter la stack
#   --restart          - Redémarrer la stack
#   --logs             - Afficher les logs
#   --status           - Afficher le statut
#   --help             - Afficher cette aide
#
# Exemples:
#   ./scripts/deploy.sh staging              # Démarre staging
#   ./scripts/deploy.sh prod                 # Démarre production
#   ./scripts/deploy.sh staging --down       # Arrête staging
#   ./scripts/deploy.sh prod --logs          # Logs de prod
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
ENV_SUFFIX="prod"
ACTION="up"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    head -30 "$0" | tail -25
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        staging)
            ENV_SUFFIX="staging"
            shift
            ;;
        prod|production)
            ENV_SUFFIX="prod"
            shift
            ;;
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

# Fichier .env selon l'environnement
if [[ "$ENV_SUFFIX" == "staging" ]]; then
    ENV_FILE=".env.staging"
else
    ENV_FILE=".env.production"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    log_warning "Fichier $ENV_FILE non trouvé, utilisation de .env"
    ENV_FILE=".env"
fi

# Générer prometheus.yml à partir du template
generate_prometheus_config() {
    log_info "Génération de prometheus.yml pour ENV_SUFFIX=$ENV_SUFFIX..."

    PROMETHEUS_TEMPLATE="prometheus/prometheus.yml.template"
    PROMETHEUS_CONFIG="prometheus/prometheus.yml"

    if [[ ! -f "$PROMETHEUS_TEMPLATE" ]]; then
        log_error "Template $PROMETHEUS_TEMPLATE non trouvé!"
        exit 1
    fi

    # Remplacer le placeholder par la valeur réelle de ENV_SUFFIX
    sed "s/ENV_SUFFIX_PLACEHOLDER/${ENV_SUFFIX}/g" "$PROMETHEUS_TEMPLATE" > "$PROMETHEUS_CONFIG"

    log_success "prometheus.yml généré avec ENV_SUFFIX=$ENV_SUFFIX"
}

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

# Générer datasources.yml à partir du template
generate_grafana_datasources() {
    log_info "Génération de datasources.yml pour ENV_SUFFIX=$ENV_SUFFIX..."

    DATASOURCES_TEMPLATE="grafana/provisioning/datasources/datasources.yml.template"
    DATASOURCES_CONFIG="grafana/provisioning/datasources/datasources.yml"

    if [[ ! -f "$DATASOURCES_TEMPLATE" ]]; then
        log_error "Template $DATASOURCES_TEMPLATE non trouvé!"
        exit 1
    fi

    # Remplacer le placeholder par la valeur réelle de ENV_SUFFIX
    sed "s/ENV_SUFFIX_PLACEHOLDER/${ENV_SUFFIX}/g" "$DATASOURCES_TEMPLATE" > "$DATASOURCES_CONFIG"

    log_success "datasources.yml généré avec URL: http://tumulte-prometheus-${ENV_SUFFIX}:9090"
}

# Générer les targets Prometheus dynamiquement
generate_prometheus_targets() {
    log_info "Génération des targets Prometheus pour ENV_SUFFIX=$ENV_SUFFIX..."

    cat > prometheus/targets/apps.yml << EOF
# Généré automatiquement par deploy.sh - Ne pas modifier
# ENV_SUFFIX: $ENV_SUFFIX
# Date: $(date -Iseconds)

- targets:
    - 'tumulte-backend-${ENV_SUFFIX}:3333'
  labels:
    service: 'backend'
    app: 'tumulte'
    environment: '${ENV_SUFFIX}'

- targets:
    - 'tumulte-frontend-${ENV_SUFFIX}:3000'
  labels:
    service: 'frontend'
    app: 'tumulte'
    environment: '${ENV_SUFFIX}'
EOF

    log_success "Targets générés: tumulte-backend-${ENV_SUFFIX}, tumulte-frontend-${ENV_SUFFIX}"
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
        log_info "Démarrage monitoring (ENV_SUFFIX=$ENV_SUFFIX)..."
        generate_prometheus_config
        generate_prometheus_targets
        generate_grafana_datasources
        ensure_dashboards_directory
        prepare_alertmanager_config

        export ENV_SUFFIX
        $DOCKER_COMPOSE up -d

        log_success "Stack monitoring démarrée!"
        echo ""
        log_info "Containers:"
        echo "  - tumulte-grafana-${ENV_SUFFIX}"
        echo "  - tumulte-prometheus-${ENV_SUFFIX}"
        echo "  - tumulte-alertmanager-${ENV_SUFFIX}"
        echo ""
        log_info "Targets Prometheus:"
        echo "  - tumulte-backend-${ENV_SUFFIX}:3333"
        echo "  - tumulte-frontend-${ENV_SUFFIX}:3000"
        echo ""
        log_info "Le tunnel Cloudflare existant peut router vers:"
        echo "  - tumulte-grafana-${ENV_SUFFIX}:3000"
        ;;
    down)
        log_info "Arrêt monitoring (ENV_SUFFIX=$ENV_SUFFIX)..."
        export ENV_SUFFIX
        $DOCKER_COMPOSE down
        log_success "Stack arrêtée"
        ;;
    restart)
        log_info "Redémarrage monitoring (ENV_SUFFIX=$ENV_SUFFIX)..."
        export ENV_SUFFIX
        $DOCKER_COMPOSE down
        generate_prometheus_config
        generate_prometheus_targets
        generate_grafana_datasources
        ensure_dashboards_directory
        prepare_alertmanager_config
        $DOCKER_COMPOSE up -d
        log_success "Stack redémarrée"
        ;;
    logs)
        export ENV_SUFFIX
        $DOCKER_COMPOSE logs -f
        ;;
    status)
        log_info "Statut monitoring (ENV_SUFFIX=$ENV_SUFFIX):"
        export ENV_SUFFIX
        $DOCKER_COMPOSE ps
        ;;
esac
