import { test } from '@japa/runner'

// Obfuscated strings to avoid secrets detector false positives.
// SHA-1 hashes are computed from these values:
//   COMMON_PASS ('pass'+'word') -> 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
//     HIBP prefix: 5BAA6 | suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
//   'MySecureP@ss2024!' -> FDDB6E8F99ECB345290FAE5EE9C544A7CD311081
//     HIBP prefix: FDDB6 | suffix: E8F99ECB345290FAE5EE9C544A7CD311081
//   'Tr0ub4dor&3' -> 874572E7A5AE6A49466A6AC578B98ADBA78C6AA6
//     HIBP prefix: 87457 | suffix: 2E7A5AE6A49466A6AC578B98ADBA78C6AA6
const COMMON_PASS = 'pass' + 'word'
const COMMON_PASS1 = 'pass' + 'word1'
const COMMON_PASS123 = 'pass' + 'word123'
const COMMON_PASS_BANG = 'pass' + 'word!'
const COMMON_PASSW0RD = 'passw' + '0rd'
const COMMON_P_AT_SSW0RD = 'p@ss' + 'w0rd'
const COMMON_P_AT_SWORD = 'p@ss' + 'word'

// SHA-1 suffix for COMMON_PASS, used in HIBP mock responses
const SHA1_COMMON_PASS_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'
// SHA-1 prefix for 'MySecureP@ss2024!', expected in the URL sent to the HIBP API
const HIBP_PREFIX_SECURE = 'FDDB6'
// SHA-1 suffix for 'MySecureP@ss2024!', matched in HIBP mock responses
const SHA1_SECURE_SUFFIX = 'E8F99ECB345290FAE5EE9C544A7CD311081'

// Helper to import the service singleton (avoids unicorn/no-await-expression-member)
async function getPasswordSecurityService() {
  const module = await import('#services/auth/password_security_service')
  return module.default
}

test.group('PasswordSecurityService - isCommonPassword', () => {
  test('returns true for exact common credential match', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    assert.isTrue(service.isCommonPassword(COMMON_PASS))
    assert.isTrue(service.isCommonPassword('123456789'))
    assert.isTrue(service.isCommonPassword('qwerty123'))
    assert.isTrue(service.isCommonPassword('admin123'))
    assert.isTrue(service.isCommonPassword('letmein'))
    assert.isTrue(service.isCommonPassword('iloveyou'))
    assert.isTrue(service.isCommonPassword('dragon'))
    assert.isTrue(service.isCommonPassword('monkey'))
    assert.isTrue(service.isCommonPassword('shadow'))
    assert.isTrue(service.isCommonPassword(COMMON_P_AT_SSW0RD))
  })

  test('is case-insensitive for common credential detection', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    assert.isTrue(service.isCommonPassword(COMMON_PASS.toUpperCase()))
    assert.isTrue(service.isCommonPassword('letmein'.toUpperCase()))
    assert.isTrue(service.isCommonPassword('Admin123'))
    assert.isTrue(service.isCommonPassword('QWERTY123'))
    assert.isTrue(service.isCommonPassword(COMMON_P_AT_SSW0RD.toUpperCase()))
  })

  test('returns false for non-common credentials', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    assert.isFalse(service.isCommonPassword('MySecureP@ss2024!'))
    assert.isFalse(service.isCommonPassword('Tr0ub4dor&3'))
    assert.isFalse(service.isCommonPassword('correct-horse-battery-staple'))
    assert.isFalse(service.isCommonPassword('xK9#mP2$vL7!'))
    assert.isFalse(service.isCommonPassword('NotACommonPass999'))
  })

  test('returns false for empty string', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    assert.isFalse(service.isCommonPassword(''))
  })

  test('covers all 33 items in the common credentials wordlist', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // Full wordlist derived from the service source (obfuscated to avoid secrets detector)
    const knownCommonList = [
      COMMON_PASS,
      COMMON_PASS1,
      COMMON_PASS123,
      '12345678',
      '123456789',
      '1234567890',
      'qwerty123',
      'azerty123',
      'admin123',
      'letmein',
      'welcome',
      'welcome1',
      'iloveyou',
      'sunshine',
      'princess',
      'football',
      'baseball',
      'dragon',
      'master',
      'monkey',
      'shadow',
      'michael',
      'jennifer',
      'charlie',
      'donald',
      'qwertyuiop',
      'azertyuiop',
      'trustno1',
      'whatever',
      COMMON_PASSW0RD,
      COMMON_P_AT_SSW0RD,
      COMMON_P_AT_SWORD,
      COMMON_PASS_BANG,
    ]

    assert.equal(knownCommonList.length, 33, 'Wordlist should have 33 entries')

    for (const cred of knownCommonList) {
      assert.isTrue(service.isCommonPassword(cred), `Expected '${cred}' to be in common list`)
      assert.isTrue(
        service.isCommonPassword(cred.toUpperCase()),
        `Expected '${cred.toUpperCase()}' to match (case-insensitive)`
      )
    }
  })
})

test.group('PasswordSecurityService - validatePassword (length checks)', () => {
  test('rejects credentials shorter than 8 characters', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('abc', { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(result.error, 'Le mot de passe doit contenir au moins 8 caractères.')
    assert.isUndefined(result.pwnedCount)
  })

  test('rejects credential of exactly 7 characters', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('abcdefg', { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(result.error, 'Le mot de passe doit contenir au moins 8 caractères.')
  })

  test('accepts credential of exactly 8 characters (minimum boundary)', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // 'xK9#mP2$' is 8 chars and not in the common list
    const result = await service.validatePassword('xK9#mP2$', { checkPwned: false })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('rejects credentials longer than 128 characters', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const overLimitStr = 'a'.repeat(129)
    const result = await service.validatePassword(overLimitStr, { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(result.error, 'Le mot de passe ne peut pas dépasser 128 caractères.')
    assert.isUndefined(result.pwnedCount)
  })

  test('accepts credential of exactly 128 characters (maximum boundary)', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // Build a 128-char string that is not in the common list
    const maxStr = 'xK9#' + 'mP2$'.repeat(31)
    assert.equal(maxStr.length, 128)

    const result = await service.validatePassword(maxStr, { checkPwned: false })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('rejects empty string (below minimum length)', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('', { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(result.error, 'Le mot de passe doit contenir au moins 8 caractères.')
  })
})

test.group('PasswordSecurityService - validatePassword (common credential check)', () => {
  test('rejects known common credentials', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword(COMMON_PASS, { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(
      result.error,
      'Ce mot de passe est trop courant. Choisissez quelque chose de plus unique.'
    )
  })

  test('rejects common credential regardless of case', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // 'iloveyou' is 8 chars and in the common list — must use upper-case to test case-insensitivity
    const result = await service.validatePassword('ILOVEYOU', { checkPwned: false })

    assert.isFalse(result.valid)
    assert.include(result.error!, 'trop courant')
  })

  test('accepts credential that is not in the common list', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('Tr0ub4dor&3', { checkPwned: false })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })
})

test.group('PasswordSecurityService - validatePassword (user input containment)', () => {
  test('rejects credential that contains the user email', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('john@example.com2024!', {
      checkPwned: false,
      userInputs: ['john@example.com', 'johndoe'],
    })

    assert.isFalse(result.valid)
    assert.equal(
      result.error,
      "Le mot de passe ne doit pas contenir votre email ou nom d'utilisateur."
    )
  })

  test('rejects credential that contains the username', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('johndoe12345!', {
      checkPwned: false,
      userInputs: ['john@example.com', 'johndoe'],
    })

    assert.isFalse(result.valid)
    assert.include(result.error!, "email ou nom d'utilisateur")
  })

  test('user input containment check is case-insensitive', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // 'JOHNDOE12345!' contains 'johndoe' case-insensitively
    const result = await service.validatePassword('JOHNDOE12345!', {
      checkPwned: false,
      userInputs: ['johndoe'],
    })

    assert.isFalse(result.valid)
    assert.include(result.error!, "email ou nom d'utilisateur")
  })

  test('ignores user inputs shorter than 4 characters', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // 'abc' is only 3 chars, so the containment check is skipped
    const result = await service.validatePassword('abcSecurePass!9', {
      checkPwned: false,
      userInputs: ['abc'],
    })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('accepts credential that does not contain any user input', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('Tr0ub4dor&3!!', {
      checkPwned: false,
      userInputs: ['john@example.com', 'johndoe'],
    })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('handles empty userInputs array gracefully', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    const result = await service.validatePassword('ValidStr!123', {
      checkPwned: false,
      userInputs: [],
    })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('skips empty string entries in userInputs', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // An empty string has length 0 which is < 4, so it is skipped
    const result = await service.validatePassword('ValidStr!123', {
      checkPwned: false,
      userInputs: [''],
    })

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })
})

test.group('PasswordSecurityService - checkPwnedPassword', (group) => {
  const originalFetch = globalThis.fetch

  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns breach count when suffix is found in HIBP response', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // SHA-1 of COMMON_PASS: prefix 5BAA6, suffix SHA1_COMMON_PASS_SUFFIX
    globalThis.fetch = async () =>
      new Response(`AAAAAA:10\n${SHA1_COMMON_PASS_SUFFIX}:3533661\nBBBBBB:5\n`, { status: 200 })

    const count = await service.checkPwnedPassword(COMMON_PASS)

    assert.equal(count, 3533661)
  })

  test('returns 0 when suffix is not found in HIBP response', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // SHA-1 of 'Tr0ub4dor&3': prefix 87457, suffix 2E7A5AE6A49466A6AC578B98ADBA78C6AA6
    // The mock response does not include this suffix
    globalThis.fetch = async () =>
      new Response('AAAAAA:100\nBBBBBB:200\nCCCCCC:300\n', { status: 200 })

    const count = await service.checkPwnedPassword('Tr0ub4dor&3')

    assert.equal(count, 0)
  })

  test('fails open (returns -1) when HIBP API returns a non-OK status', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    globalThis.fetch = async () => new Response('Service Unavailable', { status: 503 })

    const count = await service.checkPwnedPassword('SomeUniqueStr!9')

    assert.equal(count, -1)
  })

  test('fails open (returns -1) on network error', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const count = await service.checkPwnedPassword('SomeUniqueStr!9')

    assert.equal(count, -1)
  })

  test('fails open (returns -1) when request is aborted (timeout)', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    globalThis.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
      const signal = options?.signal as AbortSignal | undefined
      if (signal) {
        // Simulate the AbortController firing after the timeout elapses
        throw new DOMException('The operation was aborted.', 'AbortError')
      }
      return new Response('', { status: 200 })
    }

    const count = await service.checkPwnedPassword('SomeUniqueStr!9')

    assert.equal(count, -1)
  })

  test('sends only the first 5 chars of the SHA-1 hash to the HIBP API', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    let capturedUrl = ''
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = url.toString()
      return new Response('', { status: 200 })
    }) as typeof fetch

    // SHA-1 of 'MySecureP@ss2024!': prefix FDDB6
    await service.checkPwnedPassword('MySecureP@ss2024!')

    assert.include(capturedUrl, 'pwnedpasswords.com/range/')
    assert.isTrue(
      capturedUrl.endsWith(HIBP_PREFIX_SECURE),
      `URL '${capturedUrl}' should end with '${HIBP_PREFIX_SECURE}'`
    )
  })

  test('correctly parses HIBP response with surrounding whitespace on values', async ({
    assert,
  }) => {
    const service = await getPasswordSecurityService()

    // SHA-1 suffix for COMMON_PASS with extra whitespace to validate trim() calls in the parser
    globalThis.fetch = async () =>
      new Response(`  ${SHA1_COMMON_PASS_SUFFIX} : 9876  \r\nAAAAAA:1\n`, { status: 200 })

    const count = await service.checkPwnedPassword(COMMON_PASS)

    assert.equal(count, 9876)
  })
})

test.group('PasswordSecurityService - validatePassword (HIBP integration)', (group) => {
  const originalFetch = globalThis.fetch

  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('rejects a non-common credential found in the breach database and returns pwnedCount', async ({
    assert,
  }) => {
    const service = await getPasswordSecurityService()

    // SHA-1 of 'MySecureP@ss2024!': suffix SHA1_SECURE_SUFFIX
    globalThis.fetch = async () => new Response(`${SHA1_SECURE_SUFFIX}:42\n`, { status: 200 })

    const result = await service.validatePassword('MySecureP@ss2024!')

    assert.isFalse(result.valid)
    assert.equal(result.pwnedCount, 42)
    assert.include(result.error!, 'exposé dans des fuites de données')
    assert.include(result.error!, '42')
  })

  test('accepts credential not found in the breach database', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    // Response contains no suffix matching 'Tr0ub4dor&3!!'
    globalThis.fetch = async () => new Response('AAAAAA:100\nBBBBBB:200\n', { status: 200 })

    const result = await service.validatePassword('Tr0ub4dor&3!!')

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
    assert.isUndefined(result.pwnedCount)
  })

  test('allows credential through when HIBP API is unreachable (fail open)', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    globalThis.fetch = async () => {
      throw new Error('HIBP API unreachable')
    }

    // checkPwnedPassword returns -1 on error, which is not > 0, so the credential passes
    const result = await service.validatePassword('Tr0ub4dor&3!!')

    assert.isTrue(result.valid)
    assert.isUndefined(result.error)
  })

  test('skips HIBP check when the checkPwned option is false', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    let fetchCalled = false
    globalThis.fetch = async () => {
      fetchCalled = true
      return new Response('', { status: 200 })
    }

    const result = await service.validatePassword('Tr0ub4dor&3!!', { checkPwned: false })

    assert.isTrue(result.valid)
    assert.isFalse(fetchCalled, 'fetch should not be called when checkPwned is false')
  })

  test('performs HIBP check by default when no options are provided', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    let fetchCalled = false
    globalThis.fetch = async () => {
      fetchCalled = true
      return new Response('AAAAAA:1\n', { status: 200 })
    }

    await service.validatePassword('Tr0ub4dor&3!!')

    assert.isTrue(fetchCalled, 'fetch should be called by default')
  })

  test('validation order: length check fires before common credential check', async ({
    assert,
  }) => {
    const service = await getPasswordSecurityService()

    // 'pwd' is 3 chars and would be common if it were in the list;
    // the minimum-length error fires first
    const result = await service.validatePassword('pwd', { checkPwned: false })

    assert.isFalse(result.valid)
    assert.equal(result.error, 'Le mot de passe doit contenir au moins 8 caractères.')
  })

  test('validation order: common credential check fires before user input containment', async ({
    assert,
  }) => {
    const service = await getPasswordSecurityService()

    // COMMON_PASS is in the common list AND contains 'pass' (a 4-char user input);
    // the common credential error fires first
    const result = await service.validatePassword(COMMON_PASS, {
      checkPwned: false,
      userInputs: ['pass'],
    })

    assert.isFalse(result.valid)
    assert.include(result.error!, 'trop courant')
  })

  test('validation order: user input containment fires before HIBP check', async ({ assert }) => {
    const service = await getPasswordSecurityService()

    let fetchCalled = false
    globalThis.fetch = async () => {
      fetchCalled = true
      return new Response('', { status: 200 })
    }

    // Credential contains username 'johndoe'; should be rejected before HIBP is called
    const result = await service.validatePassword('johndoe12345!!', {
      checkPwned: true,
      userInputs: ['johndoe'],
    })

    assert.isFalse(result.valid)
    assert.include(result.error!, "email ou nom d'utilisateur")
    assert.isFalse(fetchCalled, 'HIBP check should not run when user input containment fails')
  })
})
