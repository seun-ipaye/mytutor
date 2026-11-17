# Stacks

## Beats (in order)
1. Hook: a stack of plates — you only touch the top.
2. Create a stack. Push three values one at a time, saying "push" each time.
3. Pop: the last thing in is the first thing out (LIFO). Pop once, show what's left.
4. Peek: look at the top without removing it — highlight it.
5. Where it shows up: undo, browser back button, and the call stack (function calls pile up and unwind).
6. Classic use: matching brackets — push on open, pop on close, mismatch = invalid.
7. Cost: push, pop, peek are all O(1).

## Misconceptions
- "Pop returns the bottom" — no, always the most recent push.
- Popping an empty stack — check for empty first (underflow).
- Stack vs queue: stack is LIFO, queue is FIFO.

## Canonical drawings
- One stack "S", 3–4 small values. Pointers rarely needed (top is automatic).
- For brackets: an array of characters with a pointer "i" walking it, next to the stack.
