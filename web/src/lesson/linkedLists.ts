import type { Beat } from "./types";

/** Hand-written lesson until commit 6, when Muse Spark writes these. */
export const linkedListLesson: Beat[] = [
  [{ op: "write", id: "title", text: "Linked lists", at: "title" }, "Okay. Linked lists. Forget arrays for a second."],
  ["A linked list is just a chain of nodes. ", { op: "list_new", list: "L" }, "Here's one ", { op: "insert", list: "L", id: "n1", label: "3" }, "holding a three."],
  [
    "Every node has two parts. ", { op: "label", id: "lv", target: "n1", text: "value | next" },
    "The value, and a pointer to whatever comes next.",
  ],
  [
    "Let's add a seven, ", { op: "insert", list: "L", id: "n2", label: "7" },
    "and now the three points to it. Add a twelve, ", { op: "insert", list: "L", id: "n3", label: "12" }, "same deal.",
  ],
  [
    { op: "erase", id: "lv" },
    "And the last node points to ", { op: "highlight", id: "h-null", target: "L:null" },
    "nothing. Null. That's how you know the list is over.",
  ],
  [
    { op: "erase", id: "h-null" },
    "The only thing we actually hold onto is the ", { op: "highlight", id: "h-head", target: "n1" },
    "head. Lose the head, and you've lost the whole list.",
  ],
  [
    { op: "erase", id: "h-head" },
    "Now here's the cool part. Say we want a five between the three and the seven. ",
    "With an array, we'd shift everything over. Here, ", { op: "insert", list: "L", id: "n4", label: "5", index: 1 },
    "we just rewire two pointers. Done.",
  ],
  ["Deleting is the same trick. To remove the seven, ", { op: "remove", list: "L", id: "n2" }, "the node before it just points past it."],
  [
    { op: "write", id: "o1", text: "insert / delete: O(1) once you're there", at: "note" },
    "So inserting and deleting are constant time, once you're at the right spot. ",
    "The catch? Getting there means walking from the head, one node at a time. ",
    { op: "write", id: "o2", text: "finding the spot: O(n)", at: "note" },
    "That part's linear.",
  ],
];
