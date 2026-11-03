const env = import.meta.env

/**
 * Production builds use the HTTP backend unless VITE_OPENECAD_DEMO=true opts into the
 * client-side mock (public demo with sample data, no real accounts, nothing persisted).
 * An explicit VITE_OPENECAD_BACKEND=http always wins.
 */
export const demoMode = !env.DEV && env.VITE_OPENECAD_DEMO === 'true' && env.VITE_OPENECAD_BACKEND !== 'http'

export const mockBackendEnabled = env.DEV ? env.VITE_OPENECAD_BACKEND !== 'http' : demoMode

/** Mock identities and the unauthenticated preview are available in dev and in demo builds. */
export const mockIdentitiesEnabled = env.DEV || demoMode
