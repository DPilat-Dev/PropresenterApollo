import { describe, expect, it } from 'vitest'
import { interleaveGroupSize, interleaveLines, isInterleavedLayout } from './interleave'

describe('isInterleavedLayout / interleaveGroupSize', () => {
  it('flags only the woven layouts and gives their group size', () => {
    expect(isInterleavedLayout('alternating')).toBe(true)
    expect(isInterleavedLayout('two-plus-two')).toBe(true)
    expect(isInterleavedLayout('original-translation')).toBe(false)
    expect(isInterleavedLayout('side-by-side')).toBe(false)

    expect(interleaveGroupSize('alternating')).toBe(1)
    expect(interleaveGroupSize('two-plus-two')).toBe(2)
  })
})

describe('interleaveLines', () => {
  it('alternates line by line at group size 1', () => {
    const result = interleaveLines('O1\nO2\nO3', 'T1\nT2\nT3', 1)
    expect(result).toEqual([
      { text: 'O1', role: 'main' },
      { text: 'T1', role: 'translation' },
      { text: 'O2', role: 'main' },
      { text: 'T2', role: 'translation' },
      { text: 'O3', role: 'main' },
      { text: 'T3', role: 'translation' },
    ])
  })

  it('groups two-and-two at group size 2', () => {
    const result = interleaveLines('O1\nO2\nO3\nO4', 'T1\nT2\nT3\nT4', 2)
    expect(result.map((l) => `${l.role === 'main' ? 'O' : 'T'}:${l.text}`)).toEqual([
      'O:O1',
      'O:O2',
      'T:T1',
      'T:T2',
      'O:O3',
      'O:O4',
      'T:T3',
      'T:T4',
    ])
  })

  it('handles uneven line counts, letting the longer language finish on its own', () => {
    const result = interleaveLines('O1\nO2\nO3', 'T1', 1)
    expect(result).toEqual([
      { text: 'O1', role: 'main' },
      { text: 'T1', role: 'translation' },
      { text: 'O2', role: 'main' },
      { text: 'O3', role: 'main' },
    ])
  })
})
