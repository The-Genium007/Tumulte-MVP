import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

/** Raw GitHub API response - uses snake_case as per GitHub API */
type GitHubApiIssueResponse = {
  id: number
  number: number
  // eslint-disable-next-line @typescript-eslint/naming-convention
  html_url: string
  title: string
  state: string
}

type GitHubIssueResponse = {
  id: number
  number: number
  htmlUrl: string
  title: string
  state: string
}

type CreateIssueParams = {
  title: string
  body: string
  labels?: string[]
  userDisplayName?: string
  /** Si true, crée une issue simple sans métadonnées */
  simple?: boolean
}

class GitHubIssueService {
  private token: string | undefined
  private repo: string | undefined

  constructor() {
    this.token = env.get('GITHUB_TOKEN')
    this.repo = env.get('GITHUB_REPO')
  }

  isConfigured(): boolean {
    return !!this.token && !!this.repo
  }

  async createIssue(params: CreateIssueParams): Promise<GitHubIssueResponse | null> {
    if (!this.isConfigured()) {
      logger.warn('GitHub Issue Service not configured (missing GITHUB_TOKEN or GITHUB_REPO)')
      return null
    }

    const { title, body, labels = ['bug'], userDisplayName, simple = false } = params

    const issueBody = simple ? body : this.buildIssueBody(body, userDisplayName)

    try {
      const response = await fetch(`https://api.github.com/repos/${this.repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Tumulte-Backend',
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        logger.error({
          message: 'Failed to create GitHub issue',
          status: response.status,
          response: errorText.slice(0, 500),
        })
        return null
      }

      const apiResponse = (await response.json()) as GitHubApiIssueResponse

      const issue: GitHubIssueResponse = {
        id: apiResponse.id,
        number: apiResponse.number,
        htmlUrl: apiResponse.html_url,
        title: apiResponse.title,
        state: apiResponse.state,
      }

      logger.info({
        message: 'GitHub issue created',
        issueNumber: issue.number,
        issueUrl: issue.htmlUrl,
      })

      return issue
    } catch (error) {
      logger.error({
        message: 'Error creating GitHub issue',
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private buildIssueBody(description: string, userDisplayName?: string): string {
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

export const gitHubIssueService = new GitHubIssueService()
