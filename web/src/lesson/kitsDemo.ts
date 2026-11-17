import type { Beat } from "./types";

/** Exercises every kit + pointers without spending model calls. */
export const kitsDemo: Beat[] = [
  [{ op: "write", id: "t", text: "Binary search", at: "title" }, { op: "new", id: "A", kind: "array", title: "nums" },
    "Here's a sorted array. ", { op: "add", in: "A", id: "a0", label: "2" }, { op: "add", in: "A", id: "a1", label: "5" },
    { op: "add", in: "A", id: "a2", label: "8" }, { op: "add", in: "A", id: "a3", label: "12" }, { op: "add", in: "A", id: "a4", label: "16" },
    { op: "add", in: "A", id: "a5", label: "23" }, { op: "add", in: "A", id: "a6", label: "38" }, "Let's find twenty three."],
  ["Low starts at the left, ", { op: "pointer", id: "lo", target: "a0" }, "high at the right, ",
    { op: "pointer", id: "hi", target: "a6" }, "and mid sits in the middle.", { op: "pointer", id: "mid", target: "a3" }],
  ["Twelve is too small, so low jumps past it. ", { op: "pointer", id: "lo", target: "a4" }, { op: "pointer", id: "mid", target: "a5" },
    "New middle is twenty three. ", { op: "highlight", id: "h", target: "a5" }, "Found it."],
  [{ op: "erase", id: "h" }, "Now a stack. ", { op: "new", id: "S", kind: "stack", title: "stack" },
    "Push one, ", { op: "add", in: "S", id: "s1", label: "1" }, "push two, ", { op: "add", in: "S", id: "s2", label: "2" },
    "push three.", { op: "add", in: "S", id: "s3", label: "3" }],
  ["Pop takes from the top. ", { op: "remove", id: "s3" }, "And swapping in the array just slides things around. ",
    { op: "swap", a: "a0", b: "a6" }, { op: "set", id: "a1", label: "6" }],
];

/** Tree kit + code panel. */
export const treeDemo: Beat[] = [
  [{ op: "write", id: "t", text: "Binary search trees", at: "title" }, { op: "new", id: "T", kind: "tree", title: "BST" },
    { op: "code", id: "C", title: "insert", lines: ["def insert(node, x):", "    if node is None:", "        return Node(x)", "    if x < node.val:", "        node.left = insert(node.left, x)", "    else:", "        node.right = insert(node.right, x)", "    return node"] },
    "Here's how insert works in a binary search tree."],
  ["Start with an eight at the root. ", { op: "line", in: "C", n: 3 }, { op: "add", in: "T", id: "t8", label: "8" },
    "Three is smaller, ", { op: "line", in: "C", n: 4 }, "so it goes left. ", { op: "line", in: "C", n: 5 },
    { op: "add", in: "T", id: "t3", label: "3", parent: "t8", side: "left" }],
  ["Ten is bigger, ", { op: "line", in: "C", n: 7 }, "so right. ", { op: "add", in: "T", id: "t10", label: "10", parent: "t8", side: "right" },
    "Six: left of eight, ", { op: "pointer", id: "cur", target: "t8" }, "then right of three.", { op: "pointer", id: "cur", target: "t3" },
    { op: "add", in: "T", id: "t6", label: "6", parent: "t3", side: "right" }],
  [{ op: "pointer", id: "cur", target: null }, { op: "line", in: "C", n: null },
    "One goes all the way left, ", { op: "add", in: "T", id: "t1", label: "1", parent: "t3", side: "left" },
    "and fourteen all the way right. ", { op: "add", in: "T", id: "t14", label: "14", parent: "t10", side: "right" },
    { op: "highlight", id: "h", target: "C:L5" }, "Read it left to right and it's sorted."],
  [{ op: "erase", id: "h" }, "Removing three takes its whole subtree with it in this demo. ", { op: "remove", id: "t3" },
    "And swap on a tree swaps values, like a heap.", { op: "swap", a: "t8", b: "t14" }],
];
