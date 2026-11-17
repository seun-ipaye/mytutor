# Linked lists

## Beats (in order)
1. Hook: forget arrays for a second — a linked list is a chain of nodes.
2. A node = value + pointer to the next node. Draw one, label "value | next".
3. Build a chain of 3 by appending. Each new node: "and now X points to it".
4. The last node points to null — that's how you know the list ended. Circle null.
5. All we hold is the head. Lose the head, lose the list. Circle the head node.
6. Insert in the middle: arrays shift everything; lists just rewire two pointers. Show it.
7. Delete: the node before just points past it. Show it.
8. Trade-off: insert/delete O(1) once you're there; getting there is O(n) — walk from head.

## Misconceptions to address if they come up (or pre-empt one)
- "Deleting a node only needs that node" — no, you need the node BEFORE it to rewire its next.
- "Linked lists are faster than arrays" — only for insert/delete at a known spot; random access is O(n), no indexing.
- Losing the rest of the list by overwriting `next` before saving it (order of pointer updates matters on insert).
- Forgetting the empty-list / single-node edge cases (head is null).

## Canonical drawings
- One list `L`, 3–4 small integer values, null at the end, head label automatic.
- Insert at index 1, delete a middle node. Highlight the node whose pointer changes.
- Write O(1) / O(n) as notes at the end.
