import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vue 3 Composition API (auto-imported by Nuxt)
        ref: 'readonly',
        reactive: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        onUpdated: 'readonly',
        onBeforeUpdate: 'readonly',
        nextTick: 'readonly',
        toRef: 'readonly',
        toRefs: 'readonly',
        shallowRef: 'readonly',
        triggerRef: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        defineModel: 'readonly',
        withDefaults: 'readonly',
        // Nuxt 3 auto-imports
        definePageMeta: 'readonly',
        navigateTo: 'readonly',
        useRouter: 'readonly',
        useRoute: 'readonly',
        useNuxtApp: 'readonly',
        useFetch: 'readonly',
        useAsyncData: 'readonly',
        useState: 'readonly',
        useRuntimeConfig: 'readonly',
        useCookie: 'readonly',
        useHead: 'readonly',
        useSeoMeta: 'readonly',
        clearError: 'readonly',
        // Nuxt UI composables
        useToast: 'readonly',
        useModal: 'readonly',
        useColorMode: 'readonly',
        // Project composables (auto-imported by Nuxt from composables/)
        useAppVersion: 'readonly',
        useActionButton: 'readonly',
        useAuth: 'readonly',
        useCampaigns: 'readonly',
        useNotifications: 'readonly',
        useOverlayConfig: 'readonly',
        usePollInstance: 'readonly',
        usePollTemplates: 'readonly',
        usePushNotifications: 'readonly',
        useReadiness: 'readonly',
        useResilientWebSocket: 'readonly',
        useSettings: 'readonly',
        useSupportReporter: 'readonly',
        useSupportWidget: 'readonly',
        useOBSEvents: 'readonly',
        useWebSocket: 'readonly',
        useWorkerTimer: 'readonly',
        useOnlineStatus: 'readonly',
        useSelectedCampaign: 'readonly',
        useOfflineFirst: 'readonly',
        useDevice: 'readonly',
        usePwaInstall: 'readonly',
        useLoadingScreen: 'readonly',
        useTimeFormat: 'readonly',
        useCampaignEvents: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      // Enforce camelCase naming convention
      camelcase: [
        'error',
        {
          properties: 'always',
          ignoreDestructuring: false,
          ignoreImports: false,
          ignoreGlobals: false,
          allow: [
            // OAuth/Authentication tokens
            'access_token',
            'refresh_token',
            'token_type',
            'expires_in',

            // OAuth URL parameters (Twitch API)
            'client_id',
            'client_secret',
            'grant_type',
            'redirect_uri',
            'response_type',
            'force_verify',

            // Twitch API fields (external API)
            'twitch_user_id',
            'twitch_login',
            'twitch_display_name',
            'profile_image_url',
            'broadcaster_type',

            // Status and boolean fields
            'is_active',
            'is_authorized',
            'is_poll_authorized',

            // Entity IDs
            'campaign_id',
            'user_id',
            'streamer_id',
            'membership_id',
            'poll_id',
            'session_id',
            'template_id',
            'instance_id',

            // Timestamps and dates
            'invited_at',
            'accepted_at',
            'started_at',
            'ended_at',
            'expires_at',
            'granted_at',
            'created_at',
            'updated_at',
            'deleted_at',

            // Duration and time-related fields
            'remaining_seconds',
            'default_duration_seconds',

            // Counters and aggregates
            'polls_count',

            // Gamification event types (database slugs)
            'gamification_dice_reverse',
          ],
        },
      ],

      // TypeScript naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'property',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          filter: {
            // Allow snake_case for API response fields, OAuth parameters, and database column names
            regex:
              '^(access_token|refresh_token|token_type|expires_in|client_id|client_secret|grant_type|redirect_uri|response_type|force_verify|twitch_user_id|twitch_login|twitch_display_name|profile_image_url|broadcaster_type|is_active|is_authorized|is_poll_authorized|campaign_id|user_id|streamer_id|membership_id|poll_id|session_id|template_id|instance_id|invited_at|accepted_at|started_at|ended_at|expires_at|granted_at|created_at|updated_at|deleted_at|remaining_seconds|default_duration_seconds|polls_count)$',
            match: false,
          },
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
        {
          // Allow Vue emit convention "update:*" and "update-*"
          selector: 'typeProperty',
          format: null,
          filter: {
            regex: '^update[-:]',
            match: true,
          },
        },
        {
          // Allow snake_case for API response type properties
          selector: 'typeProperty',
          format: null,
          filter: {
            regex:
              '^(access_token|refresh_token|token_type|expires_in|client_id|client_secret|grant_type|redirect_uri|response_type|force_verify|twitch_user_id|twitch_login|twitch_display_name|profile_image_url|broadcaster_type|is_active|is_authorized|is_poll_authorized|campaign_id|user_id|streamer_id|membership_id|poll_id|session_id|template_id|instance_id|invited_at|accepted_at|started_at|ended_at|expires_at|granted_at|created_at|updated_at|deleted_at|remaining_seconds|default_duration_seconds|polls_count)$',
            match: true,
          },
        },
      ],

      // Allow single-word component names for UI components and pages
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: [
            'Button',
            'Card',
            'Modal',
            'default',
            'authenticated',
            'index',
            'home',
            'about',
            'login',
            'create',
            'edit',
            'callback',
            'campaigns',
            '[id]',
            '[pollId]',
            '[sessionId]',
            'studio',
            'import',
            'character',
            'settings',
            'error',
            'auth',
            'landing',
            'register',
            'password',
          ],
        },
      ],

      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'coverage/**',
      'nuxt.config.ts',
      'tailwind.config.ts',
      // DiceBox - code externe copié tel quel (voir ~/Downloads/dice-box-threejs-main)
      'lib/dicebox/**',
    ],
  },
  // Prettier must be last to override formatting rules
  eslintPluginPrettier,
]
