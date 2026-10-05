/**
 * What went wrong, in terms a caller can act on. Nothing above `data/` should
 * ever inspect a Postgres error code.
 */
export type RepositoryErrorKind = 'not-found' | 'unauthenticated' | 'unknown'

export class RepositoryError extends Error {
  readonly kind: RepositoryErrorKind

  constructor(kind: RepositoryErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RepositoryError'
    this.kind = kind
  }

  static notFound(what: string): RepositoryError {
    return new RepositoryError('not-found', `${what} does not exist, or is not yours`)
  }

  static unauthenticated(): RepositoryError {
    return new RepositoryError('unauthenticated', 'Not signed in')
  }

  static unknown(cause: unknown): RepositoryError {
    return new RepositoryError('unknown', 'The request failed', { cause })
  }
}
