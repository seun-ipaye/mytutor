# Binary search trees

## Beats (in order)
1. Hook: binary search on an array is fast to search but slow to insert into. A BST gets fast search AND fast insert.
2. The rule: everything left of a node is smaller, everything right is bigger. Draw a root.
3. Insert 4-6 values one by one, saying the comparisons out loud ("smaller than 8, go left; bigger than 3, go right").
   Use a "cur" pointer that walks down from the root for one of the inserts. Show the insert code and move the line cursor.
4. Searching follows the exact same path — highlight the found node.
5. In-order traversal (left, node, right) reads the values in sorted order — point that out across the bottom.
6. Cost: O(height). Balanced: O(log n). Inserting sorted data makes a straight line (a linked list in disguise): O(n).

## Misconceptions
- The rule is about the whole subtree, not just the direct children.
- BSTs aren't automatically balanced (that's AVL / red-black trees).
- Duplicates need a policy (usually go right, or keep a count).

## Canonical drawings
- Tree "T" titled "BST", root 8, then 3, 10, 1, 6, 14 (sides left/right).
- Code panel "C" with a recursive insert, 6-8 lines. Pointer "cur" for the walk.
