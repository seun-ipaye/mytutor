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

Drawing ops (never give coordinates — layout is automatic):
  {"op":"write","id":"title","text":"Linked lists","at":"title"}        big title at the top (use once, first beat)
  {"op":"write","id":"o1","text":"insert: O(1)","at":"note"}            short note, stacks at the bottom (max ~3)
  {"op":"list_new","list":"L"}                                           start a linked list (head label is automatic)
  {"op":"insert","list":"L","id":"n1","label":"3"}                       append a node; add "index":1 to insert mid-list
  {"op":"remove","list":"L","id":"n2"}                                   delete a node; neighbours close the gap
  {"op":"reverse","list":"L"}                                            reverse the list order
  {"op":"connect","id":"p1","from":"n3","to":"n1"}                       extra pointer arrow (e.g. a cycle)
  {"op":"label","id":"lv","target":"n1","text":"value | next"}           small note above a node, follows it
  {"op":"highlight","id":"h1","target":"n1"}                             circle a node in marker; target "L:null" = the null
  {"op":"erase","id":"h1"}                                               remove any item (highlights, labels, notes, nodes)
  {"op":"clear"}                                                         wipe the board

Rules:
- Every id is unique for the whole lesson. Node labels are short (a number or 1-3 chars).
- Keep at most one highlight on the board: erase the old one at the start of the beat that adds a new one.
- At most ~6 nodes per list. Notes are under 40 characters.
- 8 to 14 beats. Every beat has speech. Draw something in most beats — the board should tell the story.
- Spell out symbols in speech ("O of n", not "O(n)"); ops can use symbols.

Example (first three lines of a lesson):
{"beat": [{"op":"write","id":"title","text":"Linked lists","at":"title"}, "Okay. Linked lists. Forget arrays for a second."]}
{"beat": ["A linked list is just a chain of nodes. ", {"op":"list_new","list":"L"}, "Here's one ", {"op":"insert","list":"L","id":"n1","label":"3"}, "holding a three."]}
{"beat": ["Every node has two parts. ", {"op":"label","id":"lv","target":"n1","text":"value | next"}, "The value, and a pointer to whatever comes next."]}
"""


def skeleton_for(question: str) -> str:
    """Pick the lesson skeleton whose topic matches the question (filename words)."""
    q = question.lower()
    for f in sorted(LESSONS.glob("*.md")):
        if f.name == "README.md":
            continue
        words = f.stem.replace("-", " ").split()
        if any(w.rstrip("s") in q for w in words):
            return f.read_text()
    return ""


async def lesson(question: str) -> AsyncIterator[list]:
    """Yields cleaned beats as soon as each line arrives."""
    skeleton = skeleton_for(question)
    user = f"Student asks: {question}"
    if skeleton:
        user += f"\n\nTeaching notes for this topic (follow the beats, pre-empt one misconception):\n{skeleton}"
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]

    buf = ""
    async for delta in stream_chat(messages):
        buf += delta
        while "\n" in buf:
            line, buf = buf.split("\n", 1)
            beat = parse_line(line)
            if beat:
                yield beat
    beat = parse_line(buf)
    if beat:
        yield beat


def parse_line(line: str) -> list | None:
    line = line.strip().strip(",")
    if not line or line.startswith("```"):
        return None
    m = re.search(r"\{.*\}", line)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        print(f"[tutor] unparseable line: {line[:120]}", flush=True)
        return None
    return clean_beat(obj.get("beat") if isinstance(obj, dict) else None)
