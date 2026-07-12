import { v4 as uuidv4 } from 'uuid'

/**
 * Generates a UUID formatted the way ProPresenter 6 expects: uppercase,
 * hyphenated, e.g. "3F2504E0-4F89-41D3-9A0C-0305E82C3301".
 */
export function generatePro6Uuid(): string {
  return uuidv4().toUpperCase()
}
