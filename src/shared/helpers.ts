function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }
  return typeof error.code === 'string' ? error.code : undefined
}

export function isUniqueConstraintError(error: unknown): boolean {
  return prismaErrorCode(error) === 'P2002'
}

export function isNotFoundPrismaError(error: unknown): boolean {
  return prismaErrorCode(error) === 'P2025'
}
