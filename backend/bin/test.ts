/*
|--------------------------------------------------------------------------
| Test runner entrypoint
|--------------------------------------------------------------------------
|
| The "test.ts" file is the entrypoint for running tests using Japa.
|
| Either you can run this file directly or use the "test"
| command to run this file and monitor file changes.
|
*/

process.env.NODE_ENV = 'test'

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { configure, processCLIArgs, run } from '@japa/runner'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .testRunner()
  .configure(async (app) => {
    const { plugins, runnerHooks, reporters, suites } = await import('../tests/bootstrap.js')

    // Check for --suite parameter to filter suites
    const args = process.argv.slice(2)
    const suiteIndex = args.findIndex((arg: string) => arg.startsWith('--suite='))
    let filteredSuites = suites

    if (suiteIndex !== -1) {
      const suiteName = args[suiteIndex].split('=')[1]
      filteredSuites = suites.filter((s: { name: string }) => s.name === suiteName)
      // Remove --suite from args before processCLIArgs
      args.splice(suiteIndex, 1)
    }

    processCLIArgs(args)
    configure({
      ...app.rcFile.tests,
      plugins,
      reporters,
      suites: filteredSuites,
      ...runnerHooks,
      teardown: [...(runnerHooks.teardown || []), () => app.terminate()],
    })
  })
  .run(() => run())
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
