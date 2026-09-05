import { describe, expect, it } from 'vitest';
import { computePersonaIndex } from '@/modules/identity';

describe('computePersonaIndex', () => {
  it('picks the answer with the most votes', () => {
    expect(computePersonaIndex([0, 0, 1])).toBe(0);
    expect(computePersonaIndex([2, 2, 1])).toBe(2);
  });

  it('breaks a tie toward the lowest index, matching the prototype', () => {
    expect(computePersonaIndex([0, 1, 2])).toBe(0);
    expect(computePersonaIndex([1, 2])).toBe(1);
  });

  it('ignores out-of-range answers rather than throwing', () => {
    expect(computePersonaIndex([5, -1, 2])).toBe(2);
  });

  it('defaults to index 0 when no answers are given', () => {
    expect(computePersonaIndex([])).toBe(0);
  });
});
