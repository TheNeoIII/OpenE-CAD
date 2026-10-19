import { can } from '@/backend/permissions'
import type { DataViewId } from '@/types/data'

type Subject = Parameters<typeof can>[0]

/**
 * No HTTP contract for article deletion exists yet; deleting only from the
 * client store would fake persistence, so the action stays unavailable.
 */
export const ARTICLE_DELETE_BACKEND_AVAILABLE = false

/** Presentation checks only; the Rust server authorizes every library write. */
export const canManageArticles = (user: Subject) => can(user, 'article.manage')
export const canManageSystemLibrary = (user: Subject) => can(user, 'library.manageSystem')

export function canWriteDataView(view: DataViewId, user: Subject) {
  return view !== 'articles' || canManageArticles(user)
}

export function canDeleteRows(view: DataViewId, mayManageArticles: boolean) {
  return view !== 'articles' || (mayManageArticles && ARTICLE_DELETE_BACKEND_AVAILABLE)
}
