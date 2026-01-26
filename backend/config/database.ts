import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      /**
       * Connection pool configuration for high availability
       * Formula: DB_POOL_MAX × REPLICAS < PostgreSQL max_connections
       *
       * With 3 replicas and DB_POOL_MAX=20: 60 connections used
       * With 5 replicas and DB_POOL_MAX=15: 75 connections used
       * PostgreSQL default max_connections: 100
       */
      pool: {
        min: env.get('DB_POOL_MIN', 2),
        max: env.get('DB_POOL_MAX', 20),
        acquireTimeoutMillis: 30000, // Wait up to 30s to acquire connection
        createTimeoutMillis: 30000, // Wait up to 30s to create connection
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        reapIntervalMillis: 1000, // Check for dead connections every 1s
        createRetryIntervalMillis: 200, // Retry connection creation every 200ms
      },
      debug: env.get('NODE_ENV') === 'development',
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

// Configuration du naming strategy pour utiliser camelCase
import { BaseModel } from '@adonisjs/lucid/orm'
import string from '@poppinss/utils/string'

BaseModel.namingStrategy = {
  tableName(model) {
    return string.pluralize(string.snakeCase(model.name))
  },
  columnName(_model, propertyName) {
    return string.snakeCase(propertyName)
  },
  serializedName(_model, propertyName) {
    return propertyName
  },
  relationLocalKey(_relation, _model, relatedModel) {
    return relatedModel.primaryKey
  },
  relationForeignKey(_relation, _model, relatedModel) {
    return `${string.camelCase(relatedModel.name)}Id`
  },
  relationPivotTable(_relation, model, relatedModel) {
    return string.snakeCase([relatedModel.name, model.name].sort().join('_'))
  },
  relationPivotForeignKey(_relation, model) {
    return `${string.camelCase(model.name)}Id`
  },
  paginationMetaKeys() {
    return {
      total: 'total',
      perPage: 'perPage',
      currentPage: 'currentPage',
      lastPage: 'lastPage',
      firstPage: 'firstPage',
      firstPageUrl: 'firstPageUrl',
      lastPageUrl: 'lastPageUrl',
      nextPageUrl: 'nextPageUrl',
      previousPageUrl: 'previousPageUrl',
    }
  },
}

export default dbConfig
