import type { Op } from "../scene/types";

/**
 * A lesson is a list of beats. A beat is one spoken stretch (a sentence or two) with ops
 * placed inline at the exact point in the speech where they should happen:
 *   ["Here's one ", insert(3), "holding a three."]
 * The model will produce this same shape in commit 6.
 */
export type Beat = (string | Op)[];

export interface CompiledBeat {
  text: string;
  cues: { at: number; op: Op }[]; // at = char offset in text
}

export function compile(beat: Beat): CompiledBeat {
  let text = "";
  const cues: CompiledBeat["cues"] = [];
  for (const part of beat) {
    if (typeof part === "string") text += part;
    else cues.push({ at: text.length, op: part });
  }
  return { text: text.replace(/\s+/g, " "), cues };
}
