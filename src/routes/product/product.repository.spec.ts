import { ProductRepository } from './product.repository'
import { PrismaService } from '@/shared/services/prisma.service'

describe('ProductRepository search', () => {
  let repository: ProductRepository
  let queryRaw: jest.Mock

  beforeEach(() => {
    queryRaw = jest.fn().mockResolvedValue([])
    repository = new ProductRepository({ $queryRaw: queryRaw } as unknown as PrismaService)
  })

  it('combines full-text search with case-insensitive substring fallback', async () => {
    await repository.searchIds({ search: 'a', skip: 0, take: 12 })

    expect(queryRaw).toHaveBeenCalledTimes(1)
    const [strings] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
    const sql = strings.join(' ')

    expect(sql).toContain('"searchVector" @@ plainto_tsquery')
    expect(sql).toContain('position(lower(')
    expect(sql).toContain('lower(p.name)')
    expect(sql).toContain('lower(b.name)')
    expect(sql).toContain('search_c.name')
  })

  it('uses the same substring fallback in the count query', async () => {
    queryRaw.mockResolvedValueOnce([{ count: 0n }])

    await repository.countSearch({ search: 'a' })

    expect(queryRaw).toHaveBeenCalledTimes(1)
    const [strings] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
    const sql = strings.join(' ')

    expect(sql).toContain('"searchVector" @@ plainto_tsquery')
    expect(sql).toContain('position(lower(')
    expect(sql).toContain('lower(p.name)')
    expect(sql).toContain('lower(b.name)')
    expect(sql).toContain('search_c.name')
  })
})
