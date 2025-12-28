import { configApp } from '@adonisjs/eslint-config'

export default configApp({}, {
  rules: {
    // Enforce camelCase naming convention
    'camelcase': ['error', {
      properties: 'always',
      ignoreDestructuring: false,
      ignoreImports: false,
      ignoreGlobals: false,
      allow: [
        // Database column names
        'created_at',
        'updated_at',
        'deleted_at',

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

        // Twitch API fields
        'twitch_user_id',
        'twitch_login',
        'twitch_display_name',
        'profile_image_url',
        'broadcaster_type',

        // Status fields
        'is_active',

        // Entity IDs
        'user_id',
        'owner_id',
        'streamer_id',
        'campaign_id',
        'membership_id',
        'poll_id',
        'session_id',
        'template_id',
        'instance_id',

        // Timestamps
        'invited_at',
        'accepted_at',
        'started_at',
        'ended_at',
        'expires_at',
        'granted_at',
      ],
    }],

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
          // Allow snake_case for API fields, OAuth parameters, and database columns
          regex:
            '^(created_at|updated_at|deleted_at|access_token|refresh_token|token_type|expires_in|client_id|client_secret|grant_type|redirect_uri|response_type|force_verify|twitch_user_id|twitch_login|twitch_display_name|profile_image_url|broadcaster_type|is_active|user_id|owner_id|streamer_id|campaign_id|membership_id|poll_id|session_id|template_id|instance_id|invited_at|accepted_at|started_at|ended_at|expires_at|granted_at)$',
          match: false,
        },
      },
      {
        selector: 'objectLiteralProperty',
        format: null,
      },
    ],
  },
})
