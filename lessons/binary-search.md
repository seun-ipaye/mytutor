# Binary search

## Beats (in order)
1. Hook: guessing a number 1–100 with "higher/lower" — you always guess the middle.
2. Sorted array of ~7 values (array kind). Pick a target that's in it.
3. lo at index 0, hi at the last index, mid in the middle (pointers).
4. Compare mid to target: too small -> lo moves past mid; too big -> hi moves before mid. Move pointers each step.
5. Repeat until mid hits the target (highlight it) or lo passes hi (not found).
6. Why it's fast: every step throws away half — O(log n). 1,000,000 items in ~20 steps.

## Misconceptions
- Only works on SORTED data.
- Off-by-one: lo = mid + 1 and hi = mid - 1, loop while lo <= hi.
- mid = (lo + hi) / 2 can overflow in some languages: lo + (hi - lo) / 2.

## Canonical drawings
- Array "A" with 7 sorted values; pointers lo, hi, mid moved step by step (re-send pointer ops with new targets).
- Note at the end: "O(log n)".
