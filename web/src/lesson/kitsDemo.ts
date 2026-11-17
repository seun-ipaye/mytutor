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
