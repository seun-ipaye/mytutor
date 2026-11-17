"""Turns a question into a streamed lesson: beats of speech with inline board ops."""
import json
import re
from pathlib import Path
from typing import AsyncIterator

from llm import stream_chat
from ops import clean_beat

LESSONS = Path(__file__).parent.parent / "lessons"

SYSTEM = """You are mytutor: a warm, sharp tutor explaining computer science out loud while drawing on paper,
like the best YouTube explainers. You talk casually and naturally — short sentences, contractions, a little personality,
no lecturing tone, no markdown, no lists. You never say "as you can see on the board".

You output a lesson as BEATS. One beat = one or two spoken sentences plus the drawing ops that happen while saying them.
A beat is a JSON array mixing strings (speech) and op objects, with each op placed exactly where in the speech it should
happen — right before the word it illustrates. Output ONE beat per line, as {"beat": [...]}, and nothing else:
no prose, no code fences, no numbering.

Drawing ops (never give coordinates — layout is automatic). First create a structure, then fill it:
  {"op":"new","id":"A","kind":"array","title":"nums"}       kinds: "array" (row of cells with indices),
                                                            "stack" (vertical, top at the top, "top" marker automatic),
                                                            "list" (linked list: node boxes, arrows, null, "head" automatic).
                                                            Several structures can be on the board; they arrange themselves.
  {"op":"add","in":"A","id":"a0","label":"7"}               append an element (stack: push). "at":2 inserts at an index
  {"op":"remove","id":"a0"}                                 delete an element (stack: pop the top); neighbours close the gap
  {"op":"set","id":"a0","label":"9"}                        change an element's value in place
  {"op":"swap","a":"a0","b":"a3"}                           swap two elements (they slide past each other)
  {"op":"reverse","in":"L"}                                 reverse a structure's order
  {"op":"pointer","id":"i","target":"a0"}                   named marker under an element (i, j, lo, hi, mid, curr, prev...).
                                                            Re-send with a new target to MOVE it (it slides). "target":null removes it.
  {"op":"link","id":"p1","from":"n3","to":"n1"}             extra arrow between any two elements (e.g. a cycle)
  {"op":"label","id":"lv","target":"a0","text":"value"}     small note on an element, follows it
  {"op":"highlight","id":"h1","target":"a0"}                circle an element in marker; "L:null" circles a list's null
  {"op":"write","id":"title","text":"Binary search","at":"title"}   title at the top (once, first beat)
  {"op":"write","id":"o1","text":"O(log n)","at":"note"}    short note below everything (max ~3)
  {"op":"erase","id":"h1"}                                  remove any item by id (highlights, labels, notes, elements)
  {"op":"clear"}                                            wipe the board

Pick the structure that fits: arrays for indexing, searching, sorting, two pointers, sliding windows;
stacks for stacks, recursion and the call stack, undo, matching brackets, DFS; lists for linked lists (and queues:
add at the end, remove from the front, say which end is which). Pointers are your best tool for algorithms —
move them step by step as you explain, one or two moves per beat.

Rules:
- Every id is unique for the whole lesson (re-using a pointer id to move it is the exception).
- Keep at most one highlight on the board: erase the old one at the start of the beat that adds a new one.
- At most ~8 array cells, ~6 list nodes, ~6 stack items. Labels are short (a number or 1-3 chars). Notes under 40 characters.
- 8 to 14 beats. Every beat has speech. Draw something in most beats — the board should tell the story.
- Spell out symbols in speech ("O of log n", not "O(log n)"); ops can use symbols.
- Compact JSON, one {"beat": [...]} per line. Never wrap the lines in an array or another object.

Example (first three lines of a lesson):
{"beat": [{"op":"write","id":"title","text":"Binary search","at":"title"}, "Okay. Binary search. ", {"op":"new","id":"A","kind":"array","title":"nums"}, "Say we've got a sorted array."]}
{"beat": [{"op":"add","in":"A","id":"a0","label":"2"}, {"op":"add","in":"A","id":"a1","label":"5"}, {"op":"add","in":"A","id":"a2","label":"8"}, {"op":"add","in":"A","id":"a3","label":"12"}, {"op":"add","in":"A","id":"a4","label":"16"}, "Two, five, eight, twelve, sixteen. We want twelve."]}
{"beat": ["Low starts on the left, ", {"op":"pointer","id":"lo","target":"a0"}, "high on the right, ", {"op":"pointer","id":"hi","target":"a4"}, "and we check the middle.", {"op":"pointer","id":"mid","target":"a2"}]}
"""


def skeleton_for(question: str) -> str:
    """Pick the lesson skeleton whose topic matches the question (filename words)."""
    q = question.lower()
    for f in sorted(LESSONS.glob("*.md")):
        if f.name == "README.md":
            continue
        words = f.stem.replace("-", " ").split()
        if all(w.rstrip("s") in q for w in words):
            return f.read_text()
    return ""


RAW_LOG = Path(__file__).parent / ".cache" / "last_lesson.txt"


async def lesson(question: str) -> AsyncIterator[list]:
    """Yields cleaned beats as soon as each complete JSON object arrives (any formatting)."""
    skeleton = skeleton_for(question)
    user = f"Student asks: {question}"
    if skeleton:
        user += f"\n\nTeaching notes for this topic (follow the beats, pre-empt one misconception):\n{skeleton}"
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]

    scanner = ObjectScanner()
    raw = ""
    try:
        async for delta in stream_chat(messages):
            raw += delta
            for obj in scanner.feed(delta):
                for beat in beats_in(obj):
                    yield beat
    finally:
        RAW_LOG.parent.mkdir(parents=True, exist_ok=True)
        RAW_LOG.write_text(raw)
        print(f"[tutor] model sent {len(raw)} chars (raw saved to .cache/last_lesson.txt)", flush=True)


class ObjectScanner:
    """Pulls complete top-level {...} objects out of a stream, ignoring newlines, fences, commas, array brackets and prose."""

    def __init__(self):
        self.buf = ""
        self.depth = 0
        self.in_str = False
        self.esc = False

    def feed(self, chunk: str) -> list:
        out = []
        for ch in chunk:
            if self.depth == 0:
                if ch == "{":
                    self.buf, self.depth = "{", 1
                continue
            self.buf += ch
            if self.in_str:
                if self.esc:
                    self.esc = False
                elif ch == "\\":
                    self.esc = True
                elif ch == '"':
                    self.in_str = False
                continue
            if ch == '"':
                self.in_str = True
            elif ch in "{[":
                self.depth += 1
            elif ch in "}]":
                self.depth -= 1
                if self.depth == 0:
                    try:
                        out.append(json.loads(self.buf))
                    except json.JSONDecodeError:
                        print(f"[tutor] unparseable object: {self.buf[:120]}", flush=True)
        return out


def beats_in(obj) -> list:
    """Accepts {"beat": [...]} or {"beats": [[...], ...]} or {"beats": [{"beat": [...]}, ...]}."""
    if not isinstance(obj, dict):
        return []
    if "beat" in obj:
        b = clean_beat(obj["beat"])
        return [b] if b else []
    out = []
    for item in obj.get("beats") or []:
        raw = item.get("beat") if isinstance(item, dict) else item
        b = clean_beat(raw)
        if b:
            out.append(b)
    return out


def parse_line(line: str) -> list | None:
    """Single-line helper (kept for quick tests)."""
    objs = ObjectScanner().feed(line)
    beats = [b for o in objs for b in beats_in(o)]
    return beats[0] if beats else None
