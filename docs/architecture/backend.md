# Backend Architecture

The Tumulte backend is built with AdonisJS 6, following a layered architecture pattern.

## Tech Stack

- **Framework**: AdonisJS 6.18 (TypeScript 5.8)
- **ORM**: Lucid (PostgreSQL 16)
- **Cache**: Redis 7
- **WebSocket**: Transmit
- **Validation**: VineJS + Zod
- **Testing**: Japa

## Project Structure

```
backend/
├── app/
│   ├── controllers/          # HTTP request handlers
│   ├── services/             # Business logic
│   ├── repositories/         # Database queries
│   ├── models/               # Lucid ORM models
│   ├── dtos/                 # Data Transfer Objects
│   ├── validators/           # Input validation schemas
│   ├── middleware/           # HTTP middleware
│   └── exceptions/           # Custom exceptions
├── config/                   # Configuration files
├── database/
│   ├── migrations/           # Database migrations
│   └── seeders/              # Data seeders
├── start/                    # Bootstrap files
│   ├── routes.ts             # Route definitions
│   └── kernel.ts             # Middleware registration
├── tests/
│   ├── unit/                 # Unit tests
│   └── functional/           # API tests
└── bin/
    └── console.ts            # CLI entry point
```

## Layered Architecture

### Controller Layer

Controllers handle HTTP requests and responses. They should NOT contain business logic.

```typescript
// app/controllers/campaigns_controller.ts
export default class CampaignsController {
  constructor(private campaignService: CampaignService) {}

  async index({ auth, response }: HttpContext) {
    const campaigns = await this.campaignService.getUserCampaigns(auth.user!.id)
    return response.ok(CampaignDto.fromModelArray(campaigns))
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createCampaignValidator)
    const campaign = await this.campaignService.create(auth.user!.id, data)
    return response.created(CampaignDto.fromModel(campaign))
  }
}
```

### Service Layer

Services contain business logic and orchestrate operations.

```typescript
// app/services/campaign_service.ts
export class CampaignService {
  constructor(private campaignRepository: CampaignRepository) {}

  /**
   * Creates a new campaign for the given user.
   */
  async create(userId: number, data: CreateCampaignData): Promise<Campaign> {
    return this.campaignRepository.create({
      ...data,
      userId,
      status: 'active'
    })
  }

  /**
   * Gets all campaigns for a user.
   */
  async getUserCampaigns(userId: number): Promise<Campaign[]> {
    return this.campaignRepository.findByUserId(userId)
  }
}
```

### Repository Layer

Repositories handle database operations using Lucid ORM.

```typescript
// app/repositories/campaign_repository.ts
export class CampaignRepository {
  /**
   * Finds all campaigns for a user.
   */
  async findByUserId(userId: number): Promise<Campaign[]> {
    return Campaign.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Creates a new campaign.
   */
  async create(data: CreateCampaignData): Promise<Campaign> {
    return Campaign.create(data)
  }
}
```

### Model Layer

Models define database entities and relationships.

```typescript
// app/models/campaign.ts
export default class Campaign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare userId: number

  @column()
  declare status: 'active' | 'archived'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => PollSession)
  declare sessions: HasMany<typeof PollSession>
}
```

### DTO Layer

DTOs transform models for API responses.

```typescript
// app/dtos/campaign_dto.ts
export class CampaignDto {
  constructor(
    public id: number,
    public name: string,
    public status: string,
    public createdAt: string
  ) {}

  static fromModel(campaign: Campaign): CampaignDto {
    return new CampaignDto(
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.createdAt.toISO()
    )
  }

  static fromModelArray(campaigns: Campaign[]): CampaignDto[] {
    return campaigns.map((c) => CampaignDto.fromModel(c))
  }
}
```

### Validator Layer

Validators define input validation schemas.

```typescript
// app/validators/campaign_validator.ts
import vine from '@vinejs/vine'

export const createCampaignValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(100),
    description: vine.string().optional()
  })
)
```

## Path Aliases

Use these aliases for imports:

```typescript
import { User } from '#models/user'
import { UserService } from '#services/user_service'
import { UserRepository } from '#repositories/user_repository'
import { UserDto } from '#dtos/user_dto'
import { createUserValidator } from '#validators/auth/create_user'
```

## Commands

Development commands use ts-node:

```bash
# Run any ace command
node --loader ts-node-maintained/esm bin/console.ts <command>

# Examples
node --loader ts-node-maintained/esm bin/console.ts migration:run
node --loader ts-node-maintained/esm bin/console.ts make:model Poll
node --loader ts-node-maintained/esm bin/console.ts list:routes
```

## Database Conventions

| Type | Convention | Example |
|------|------------|---------|
| Tables | snake_case plural | `poll_instances` |
| Columns | snake_case | `created_at` |
| FK in code | camelCase | `userId` |

## Error Handling

Use custom exceptions:

```typescript
throw new NotFoundException('Campaign not found')
throw new UnauthorizedException('Not authenticated')
throw new ForbiddenException('Access denied')
throw new ValidationException('Invalid data', errors)
```

## Testing

```bash
npm run test              # All tests
npm run test:unit         # Unit tests
npm run test:functional   # API tests
```

## See Also

- [Architecture Overview](overview.md)
- [API Reference](../api/reference.md)
