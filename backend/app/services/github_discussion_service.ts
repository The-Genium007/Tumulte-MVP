import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

type GitHubDiscussionResponse = {
  id: string
  number: number
  url: string
  title: string
}

type CreateDiscussionParams = {
  title: string
  body: string
  userDisplayName?: string
}

/**
 * Service pour créer des GitHub Discussions via l'API GraphQL
 * Utilisé pour les suggestions utilisateur dans la catégorie "Idées & Suggestions"
 */
class GitHubDiscussionService {
  private token: string | undefined
  private repo: string | undefined
  private categoryId: string | undefined

  constructor() {
    this.token = env.get('GITHUB_TOKEN')
    this.repo = env.get('GITHUB_REPO')
    this.categoryId = env.get('GITHUB_DISCUSSION_CATEGORY_ID')
  }

  isConfigured(): boolean {
    return !!this.token && !!this.repo && !!this.categoryId
  }

  /**
   * Récupère l'ID du repository via GraphQL
   */
  private async getRepositoryId(): Promise<string | null> {
    if (!this.repo) return null

    const [owner, name] = this.repo.split('/')
    if (!owner || !name) return null

    const query = `
      query GetRepoId($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
        }
      }
    `

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Tumulte-Backend',
        },
        body: JSON.stringify({
          query,
          variables: { owner, name },
        }),
      })

      if (!response.ok) {
        logger.error({
          message: 'Failed to get repository ID',
          status: response.status,
        })
        return null
      }

      const data = (await response.json()) as {
        data?: { repository?: { id?: string } }
        errors?: Array<{ message: string }>
      }

      if (data.errors?.length) {
        logger.error({
          message: 'GraphQL errors getting repository ID',
          errors: data.errors.map((e) => e.message),
        })
        return null
      }

      return data.data?.repository?.id || null
    } catch (error) {
      logger.error({
        message: 'Error getting repository ID',
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Crée une discussion dans la catégorie configurée
   */
  async createDiscussion(params: CreateDiscussionParams): Promise<GitHubDiscussionResponse | null> {
    if (!this.isConfigured()) {
      logger.warn(
        'GitHub Discussion Service not configured (missing GITHUB_TOKEN, GITHUB_REPO, or GITHUB_DISCUSSION_CATEGORY_ID)'
      )
      return null
    }

    const repositoryId = await this.getRepositoryId()
    if (!repositoryId) {
      logger.error('Could not get repository ID for discussion creation')
      return null
    }

    const { title, body, userDisplayName } = params
    const discussionBody = this.buildDiscussionBody(body, userDisplayName)

    const mutation = `
      mutation CreateDiscussion($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repositoryId,
          categoryId: $categoryId,
          title: $title,
          body: $body
        }) {
          discussion {
            id
            number
            url
            title
          }
        }
      }
    `

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Tumulte-Backend',
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            repositoryId,
            categoryId: this.categoryId,
            title,
            body: discussionBody,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        logger.error({
          message: 'Failed to create GitHub discussion',
          status: response.status,
          response: errorText.slice(0, 500),
        })
        return null
      }

      const data = (await response.json()) as {
        data?: {
          createDiscussion?: {
            discussion?: GitHubDiscussionResponse
          }
        }
        errors?: Array<{ message: string }>
      }

      if (data.errors?.length) {
        logger.error({
          message: 'GraphQL errors creating discussion',
          errors: data.errors.map((e) => e.message),
        })
        return null
      }

      const discussion = data.data?.createDiscussion?.discussion
      if (!discussion) {
        logger.error('No discussion returned from GraphQL mutation')
        return null
      }

      logger.info({
        message: 'GitHub discussion created',
        discussionNumber: discussion.number,
        discussionUrl: discussion.url,
      })

      return discussion
    } catch (error) {
      logger.error({
        message: 'Error creating GitHub discussion',
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private buildDiscussionBody(description: string, userDisplayName?: string): string {
    const lines: string[] = []

    lines.push('## Description')
    lines.push('')
    lines.push(description)
    lines.push('')

    if (userDisplayName) {
      lines.push('---')
      lines.push('')
      lines.push(`**Suggéré par:** ${userDisplayName}`)
      lines.push(`**Source:** Widget Support Tumulte`)
      lines.push(`**Date:** ${new Date().toISOString()}`)
    }

    return lines.join('\n')
  }
}

export const gitHubDiscussionService = new GitHubDiscussionService()
