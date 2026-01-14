/**
 * Catalogue exhaustif des messages d'erreur pour le système de support automatique
 * Version Alpha - Couverture complète de toutes les interactions et processus
 */

/* eslint-disable camelcase */

export type SupportActionType =
  // ===== AUTHENTIFICATION (4) =====
  | "auth_login"
  | "auth_callback"
  | "auth_logout"
  | "auth_fetch_me"

  // ===== CAMPAGNES MJ (8) =====
  | "campaign_fetch"
  | "campaign_fetch_detail"
  | "campaign_create"
  | "campaign_update"
  | "campaign_delete"
  | "campaign_invite"
  | "campaign_members_fetch"
  | "campaign_member_remove"

  // ===== SESSIONS (6) =====
  | "session_fetch"
  | "session_create"
  | "session_update"
  | "session_delete"
  | "session_launch"
  | "session_close"

  // ===== TEMPLATES SONDAGES (5) =====
  | "template_fetch"
  | "template_create"
  | "template_update"
  | "template_delete"
  | "template_add_to_session"

  // ===== SONDAGES CRUD (4) =====
  | "polls_fetch"
  | "poll_create"
  | "poll_update"
  | "poll_delete"

  // ===== CONTRÔLE SONDAGES (7) =====
  | "poll_launch"
  | "poll_cancel"
  | "poll_fetch_results"
  | "poll_fetch_live"
  | "poll_next"
  | "poll_previous"
  | "poll_reorder"

  // ===== STREAMER CAMPAGNES (5) =====
  | "streamer_invitations_fetch"
  | "streamer_invitation_accept"
  | "streamer_invitation_decline"
  | "streamer_campaigns_fetch"
  | "streamer_campaign_leave"

  // ===== AUTORISATION TWITCH (4) =====
  | "authorization_status_fetch"
  | "authorization_grant"
  | "authorization_revoke"
  | "twitch_revoke_all"

  // ===== NOTIFICATIONS PUSH (6) =====
  | "push_permission_request"
  | "push_subscribe"
  | "push_unsubscribe"
  | "push_subscriptions_fetch"
  | "push_subscription_delete"
  | "push_preferences_update"

  // ===== TEMPS RÉEL (4) =====
  | "websocket_connect"
  | "websocket_subscribe"
  | "websocket_message_parse"
  | "websocket_reconnect"

  // ===== HEALTH CHECK (4) =====
  | "health_check_global"
  | "health_check_twitch"
  | "health_check_redis"
  | "health_check_tokens"

  // ===== OVERLAY (4) =====
  | "overlay_url_fetch"
  | "overlay_campaigns_fetch"
  | "overlay_poll_subscribe"
  | "overlay_poll_display"

  // ===== OVERLAY STUDIO (6) =====
  | "overlay_configs_fetch"
  | "overlay_config_fetch"
  | "overlay_config_create"
  | "overlay_config_update"
  | "overlay_config_delete"
  | "overlay_config_activate"

  // ===== COMPTE (2) =====
  | "account_delete"
  | "settings_update"

  // ===== SUPPORT (1) =====
  | "support_send"

  // ===== PROCESSUS FOND (5) =====
  | "token_refresh_auto"
  | "poll_polling_cycle"
  | "poll_aggregation"
  | "twitch_chat_message"
  | "push_notification_send"

  // ===== GÉNÉRIQUES (3) =====
  | "generic_server_error"
  | "generic_network_error"
  | "generic_timeout";

/**
 * Messages d'erreur pré-remplis en français
 * Ces messages seront affichés dans le widget de support
 */
export const SUPPORT_ERROR_MESSAGES: Record<SupportActionType, string> = {
  // ===== AUTHENTIFICATION =====
  auth_login: "Une erreur est survenue lors de la connexion.",
  auth_callback: "Une erreur est survenue lors du retour Twitch.",
  auth_logout: "Une erreur est survenue lors de la déconnexion.",
  auth_fetch_me: "Une erreur est survenue lors du chargement du profil.",

  // ===== CAMPAGNES MJ =====
  campaign_fetch: "Une erreur est survenue lors du chargement des campagnes.",
  campaign_fetch_detail:
    "Une erreur est survenue lors du chargement de la campagne.",
  campaign_create:
    "Une erreur est survenue lors de la création de la campagne.",
  campaign_update:
    "Une erreur est survenue lors de la modification de la campagne.",
  campaign_delete:
    "Une erreur est survenue lors de la suppression de la campagne.",
  campaign_invite: "Une erreur est survenue lors de l'invitation du streamer.",
  campaign_members_fetch:
    "Une erreur est survenue lors du chargement des membres.",
  campaign_member_remove: "Une erreur est survenue lors du retrait du membre.",

  // ===== SESSIONS =====
  session_fetch: "Une erreur est survenue lors du chargement des sessions.",
  session_create: "Une erreur est survenue lors de la création de la session.",
  session_update:
    "Une erreur est survenue lors de la modification de la session.",
  session_delete:
    "Une erreur est survenue lors de la suppression de la session.",
  session_launch: "Une erreur est survenue lors du lancement de la session.",
  session_close: "Une erreur est survenue lors de la fermeture de la session.",

  // ===== TEMPLATES =====
  template_fetch: "Une erreur est survenue lors du chargement des modèles.",
  template_create: "Une erreur est survenue lors de la création du modèle.",
  template_update: "Une erreur est survenue lors de la modification du modèle.",
  template_delete: "Une erreur est survenue lors de la suppression du modèle.",
  template_add_to_session:
    "Une erreur est survenue lors de l'ajout à la session.",

  // ===== SONDAGES CRUD =====
  polls_fetch: "Une erreur est survenue lors du chargement des sondages.",
  poll_create: "Une erreur est survenue lors de la création du sondage.",
  poll_update: "Une erreur est survenue lors de la modification du sondage.",
  poll_delete: "Une erreur est survenue lors de la suppression du sondage.",

  // ===== CONTRÔLE SONDAGES =====
  poll_launch: "Une erreur est survenue lors du lancement du sondage.",
  poll_cancel: "Une erreur est survenue lors de l'annulation du sondage.",
  poll_fetch_results:
    "Une erreur est survenue lors du chargement des résultats.",
  poll_fetch_live: "Une erreur est survenue lors du chargement en temps réel.",
  poll_next: "Une erreur est survenue lors du passage au sondage suivant.",
  poll_previous: "Une erreur est survenue lors du retour au sondage précédent.",
  poll_reorder: "Une erreur est survenue lors du réordonnancement.",

  // ===== STREAMER CAMPAGNES =====
  streamer_invitations_fetch:
    "Une erreur est survenue lors du chargement des invitations.",
  streamer_invitation_accept: "Une erreur est survenue lors de l'acceptation.",
  streamer_invitation_decline: "Une erreur est survenue lors du refus.",
  streamer_campaigns_fetch:
    "Une erreur est survenue lors du chargement des campagnes.",
  streamer_campaign_leave:
    "Une erreur est survenue lors du départ de la campagne.",

  // ===== AUTORISATION TWITCH =====
  authorization_status_fetch:
    "Une erreur est survenue lors du chargement du statut.",
  authorization_grant: "Une erreur est survenue lors de l'autorisation.",
  authorization_revoke: "Une erreur est survenue lors de la révocation.",
  twitch_revoke_all: "Une erreur est survenue lors de la déconnexion Twitch.",

  // ===== NOTIFICATIONS PUSH =====
  push_permission_request:
    "Une erreur est survenue lors de la demande de permission.",
  push_subscribe:
    "Une erreur est survenue lors de l'abonnement aux notifications.",
  push_unsubscribe: "Une erreur est survenue lors du désabonnement.",
  push_subscriptions_fetch:
    "Une erreur est survenue lors du chargement des appareils.",
  push_subscription_delete:
    "Une erreur est survenue lors de la suppression de l'appareil.",
  push_preferences_update:
    "Une erreur est survenue lors de la mise à jour des préférences.",

  // ===== TEMPS RÉEL =====
  websocket_connect: "Une erreur est survenue lors de la connexion temps réel.",
  websocket_subscribe: "Une erreur est survenue lors de l'abonnement au canal.",
  websocket_message_parse:
    "Une erreur est survenue lors de la lecture des données.",
  websocket_reconnect: "Une erreur est survenue lors de la reconnexion.",

  // ===== HEALTH CHECK =====
  health_check_global:
    "Une erreur est survenue lors de la vérification système.",
  health_check_twitch: "Twitch API indisponible.",
  health_check_redis: "Service de cache indisponible.",
  health_check_tokens: "Certains tokens sont invalides.",

  // ===== OVERLAY =====
  overlay_url_fetch:
    "Une erreur est survenue lors de la génération de l'URL overlay.",
  overlay_campaigns_fetch:
    "Une erreur est survenue lors du chargement overlay.",
  overlay_poll_subscribe:
    "Une erreur est survenue lors de l'écoute des sondages.",
  overlay_poll_display:
    "Une erreur est survenue lors de l'affichage du sondage.",

  // ===== OVERLAY STUDIO =====
  overlay_configs_fetch:
    "Une erreur est survenue lors du chargement des configurations.",
  overlay_config_fetch:
    "Une erreur est survenue lors du chargement de la configuration.",
  overlay_config_create:
    "Une erreur est survenue lors de la création de la configuration.",
  overlay_config_update:
    "Une erreur est survenue lors de la mise à jour de la configuration.",
  overlay_config_delete:
    "Une erreur est survenue lors de la suppression de la configuration.",
  overlay_config_activate:
    "Une erreur est survenue lors de l'activation de la configuration.",

  // ===== COMPTE =====
  account_delete: "Une erreur est survenue lors de la suppression du compte.",
  settings_update:
    "Une erreur est survenue lors de la mise à jour des paramètres.",

  // ===== SUPPORT =====
  support_send: "Une erreur est survenue lors de l'envoi du ticket.",

  // ===== PROCESSUS FOND =====
  token_refresh_auto:
    "Une erreur est survenue lors du renouvellement automatique.",
  poll_polling_cycle:
    "Une erreur est survenue lors de la récupération des votes.",
  poll_aggregation:
    "Une erreur est survenue lors de l'agrégation des résultats.",
  twitch_chat_message: "Une erreur est survenue lors de l'envoi au chat.",
  push_notification_send:
    "Une erreur est survenue lors de l'envoi de notification.",

  // ===== GÉNÉRIQUES =====
  generic_server_error: "Une erreur serveur est survenue.",
  generic_network_error: "Connexion au serveur impossible.",
  generic_timeout: "La requête a expiré.",
};

/**
 * Labels courts pour le badge UI
 * Affichés dans le widget de support pour identifier le type d'erreur
 */
export const ACTION_TYPE_LABELS: Record<SupportActionType, string> = {
  // Auth
  auth_login: "Connexion",
  auth_callback: "Callback Twitch",
  auth_logout: "Déconnexion",
  auth_fetch_me: "Profil",

  // Campaigns
  campaign_fetch: "Liste campagnes",
  campaign_fetch_detail: "Détail campagne",
  campaign_create: "Création campagne",
  campaign_update: "Modif campagne",
  campaign_delete: "Suppression campagne",
  campaign_invite: "Invitation",
  campaign_members_fetch: "Membres",
  campaign_member_remove: "Retrait membre",

  // Sessions
  session_fetch: "Liste sessions",
  session_create: "Création session",
  session_update: "Modif session",
  session_delete: "Suppression session",
  session_launch: "Lancement session",
  session_close: "Fermeture session",

  // Templates
  template_fetch: "Liste modèles",
  template_create: "Création modèle",
  template_update: "Modif modèle",
  template_delete: "Suppression modèle",
  template_add_to_session: "Ajout session",

  // Polls CRUD
  polls_fetch: "Liste sondages",
  poll_create: "Création sondage",
  poll_update: "Modif sondage",
  poll_delete: "Suppression sondage",

  // Polls Control
  poll_launch: "Lancement sondage",
  poll_cancel: "Annulation sondage",
  poll_fetch_results: "Résultats",
  poll_fetch_live: "Données live",
  poll_next: "Sondage suivant",
  poll_previous: "Sondage précédent",
  poll_reorder: "Réordonnancement",

  // Streamer
  streamer_invitations_fetch: "Invitations",
  streamer_invitation_accept: "Acceptation",
  streamer_invitation_decline: "Refus",
  streamer_campaigns_fetch: "Mes campagnes",
  streamer_campaign_leave: "Départ campagne",

  // Authorization
  authorization_status_fetch: "Statut auth",
  authorization_grant: "Autorisation",
  authorization_revoke: "Révocation",
  twitch_revoke_all: "Déconnexion Twitch",

  // Push
  push_permission_request: "Permission notif",
  push_subscribe: "Abonnement notif",
  push_unsubscribe: "Désabonnement",
  push_subscriptions_fetch: "Appareils",
  push_subscription_delete: "Suppression appareil",
  push_preferences_update: "Préférences notif",

  // WebSocket
  websocket_connect: "Connexion WS",
  websocket_subscribe: "Abonnement canal",
  websocket_message_parse: "Parse message",
  websocket_reconnect: "Reconnexion WS",

  // Health
  health_check_global: "Health check",
  health_check_twitch: "Twitch API",
  health_check_redis: "Redis",
  health_check_tokens: "Tokens",

  // Overlay
  overlay_url_fetch: "URL Overlay",
  overlay_campaigns_fetch: "Overlay load",
  overlay_poll_subscribe: "Overlay subscribe",
  overlay_poll_display: "Overlay display",

  // Overlay Studio
  overlay_configs_fetch: "Liste configs",
  overlay_config_fetch: "Détail config",
  overlay_config_create: "Création config",
  overlay_config_update: "Modif config",
  overlay_config_delete: "Suppression config",
  overlay_config_activate: "Activation config",

  // Account
  account_delete: "Suppression compte",
  settings_update: "Paramètres",

  // Support
  support_send: "Envoi ticket",

  // Background
  token_refresh_auto: "Refresh token",
  poll_polling_cycle: "Polling votes",
  poll_aggregation: "Agrégation",
  twitch_chat_message: "Chat Twitch",
  push_notification_send: "Push notif",

  // Generic
  generic_server_error: "Erreur serveur",
  generic_network_error: "Erreur réseau",
  generic_timeout: "Timeout",
};

/**
 * Catégories d'actions pour le regroupement dans les analytics
 */
export type ActionCategory =
  | "auth"
  | "campaign"
  | "session"
  | "template"
  | "poll"
  | "streamer"
  | "authorization"
  | "push"
  | "websocket"
  | "health"
  | "overlay"
  | "account"
  | "support"
  | "background"
  | "generic";

/**
 * Mapping action type → catégorie
 */
export const ACTION_CATEGORIES: Record<SupportActionType, ActionCategory> = {
  auth_login: "auth",
  auth_callback: "auth",
  auth_logout: "auth",
  auth_fetch_me: "auth",

  campaign_fetch: "campaign",
  campaign_fetch_detail: "campaign",
  campaign_create: "campaign",
  campaign_update: "campaign",
  campaign_delete: "campaign",
  campaign_invite: "campaign",
  campaign_members_fetch: "campaign",
  campaign_member_remove: "campaign",

  session_fetch: "session",
  session_create: "session",
  session_update: "session",
  session_delete: "session",
  session_launch: "session",
  session_close: "session",

  template_fetch: "template",
  template_create: "template",
  template_update: "template",
  template_delete: "template",
  template_add_to_session: "template",

  polls_fetch: "poll",
  poll_create: "poll",
  poll_update: "poll",
  poll_delete: "poll",

  poll_launch: "poll",
  poll_cancel: "poll",
  poll_fetch_results: "poll",
  poll_fetch_live: "poll",
  poll_next: "poll",
  poll_previous: "poll",
  poll_reorder: "poll",

  streamer_invitations_fetch: "streamer",
  streamer_invitation_accept: "streamer",
  streamer_invitation_decline: "streamer",
  streamer_campaigns_fetch: "streamer",
  streamer_campaign_leave: "streamer",

  authorization_status_fetch: "authorization",
  authorization_grant: "authorization",
  authorization_revoke: "authorization",
  twitch_revoke_all: "authorization",

  push_permission_request: "push",
  push_subscribe: "push",
  push_unsubscribe: "push",
  push_subscriptions_fetch: "push",
  push_subscription_delete: "push",
  push_preferences_update: "push",

  websocket_connect: "websocket",
  websocket_subscribe: "websocket",
  websocket_message_parse: "websocket",
  websocket_reconnect: "websocket",

  health_check_global: "health",
  health_check_twitch: "health",
  health_check_redis: "health",
  health_check_tokens: "health",

  overlay_url_fetch: "overlay",
  overlay_campaigns_fetch: "overlay",
  overlay_poll_subscribe: "overlay",
  overlay_poll_display: "overlay",

  overlay_configs_fetch: "overlay",
  overlay_config_fetch: "overlay",
  overlay_config_create: "overlay",
  overlay_config_update: "overlay",
  overlay_config_delete: "overlay",
  overlay_config_activate: "overlay",

  account_delete: "account",
  settings_update: "account",

  support_send: "support",

  token_refresh_auto: "background",
  poll_polling_cycle: "background",
  poll_aggregation: "background",
  twitch_chat_message: "background",
  push_notification_send: "background",

  generic_server_error: "generic",
  generic_network_error: "generic",
  generic_timeout: "generic",
};
