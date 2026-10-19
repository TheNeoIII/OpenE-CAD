export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly retryAfterSeconds?: number) {
    super(message)
  }
}

/**
 * Optimistic-concurrency rejection (HTTP 409). The server already holds a newer
 * `stateRevision` than the one the client loaded. The client must never retry
 * the save automatically — the user decides to reload or cancel.
 */
export class ProjectConflictError extends ApiError {
  constructor(public readonly currentRevision: number | null, message = 'Das Projekt wurde zwischenzeitlich von einem anderen Benutzer geändert.') {
    super(409, 'PROJECT_REVISION_CONFLICT', message)
  }
}

/** Server refused the action for the current account (HTTP 403). */
export class ForbiddenError extends ApiError {
  constructor(message = 'Für diese Aktion fehlt die Berechtigung.') {
    super(403, 'FORBIDDEN', message)
  }
}
