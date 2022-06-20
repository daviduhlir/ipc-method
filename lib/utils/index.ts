import { createHash } from 'crypto'

/**
 * Make random hash
 */
export function randomHash(): string {
  return [...Array(10)]
    .map(x => 0)
    .map(() => Math.random().toString(36).slice(2))
    .join('')
}

/**
 * make hash from string
 */
export function hash(string: string) {
  return createHash('sha256').update(string).digest('hex')
}

/**
 * Compare two arrays
 */
export function arrayCompare(array1: any[], array2: any[]) {
  if (array1.length !== array2.length) {
    return false
  }

  for(let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }

  return true
}