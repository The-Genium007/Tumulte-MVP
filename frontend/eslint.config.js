import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,vue}"]
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
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
        // Nuxt UI composables
        useToast: 'readonly',
        useModal: 'readonly',
        useColorMode: 'readonly',
      }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    rules: {
      // Enforce camelCase naming convention
      "camelcase": ["error", {
        "properties": "always",
        "ignoreDestructuring": false,
        "ignoreImports": false,
        "ignoreGlobals": false,
        "allow": [
          // OAuth/Authentication tokens
          "access_token",
          "refresh_token",
          "token_type",
          "expires_in",

          // OAuth URL parameters (Twitch API)
          "client_id",
          "client_secret",
          "grant_type",
          "redirect_uri",
          "response_type",
          "force_verify",

          // Twitch API fields (external API)
          "twitch_user_id",
          "twitch_login",
          "twitch_display_name",
          "profile_image_url",
          "broadcaster_type",

          // Status and boolean fields
          "is_active",
          "is_authorized",
          "is_poll_authorized",

          // Entity IDs
          "campaign_id",
          "user_id",
          "streamer_id",
          "membership_id",
          "poll_id",
          "session_id",
          "template_id",
          "instance_id",

          // Timestamps and dates
          "invited_at",
          "accepted_at",
          "started_at",
          "ended_at",
          "expires_at",
          "granted_at",
          "created_at",
          "updated_at",
          "deleted_at",

          // Duration and time-related fields
          "remaining_seconds",
          "default_duration_seconds",

          // Counters and aggregates
          "polls_count"
        ]
      }],

      // TypeScript naming conventions
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "default",
          "format": ["camelCase"],
          "leadingUnderscore": "allow",
          "trailingUnderscore": "allow"
        },
        {
          "selector": "variable",
          "format": ["camelCase", "UPPER_CASE"],
          "leadingUnderscore": "allow",
          "trailingUnderscore": "allow"
        },
        {
          "selector": "import",
          "format": ["camelCase", "PascalCase"],
          "leadingUnderscore": "allow"
        },
        {
          "selector": "typeLike",
          "format": ["PascalCase"]
        },
        {
          "selector": "enumMember",
          "format": ["UPPER_CASE"]
        },
        {
          "selector": "property",
          "format": ["camelCase"],
          "leadingUnderscore": "allow",
          "filter": {
            // Allow snake_case for API response fields, OAuth parameters, and database column names
            "regex": "^(access_token|refresh_token|token_type|expires_in|client_id|client_secret|grant_type|redirect_uri|response_type|force_verify|twitch_user_id|twitch_login|twitch_display_name|profile_image_url|broadcaster_type|is_active|is_authorized|is_poll_authorized|campaign_id|user_id|streamer_id|membership_id|poll_id|session_id|template_id|instance_id|invited_at|accepted_at|started_at|ended_at|expires_at|granted_at|created_at|updated_at|deleted_at|remaining_seconds|default_duration_seconds|polls_count)$",
            "match": false
          }
        },
        {
          "selector": "objectLiteralProperty",
          "format": null
        }
      ],

      // Allow single-word component names for UI components and pages
      "vue/multi-word-component-names": ["error", {
        "ignores": ["Button", "Card", "Modal", "default", "authenticated", "index", "home", "about", "login", "create", "callback", "campaigns", "[id]", "[sessionId]"]
      }],

      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".nuxt/**",
      ".output/**",
      "*.config.js",
      "*.config.ts"
    ]
  }
];
