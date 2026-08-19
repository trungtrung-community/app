/**
 * @fileoverview Turning what a learner typed into a search query.
 *
 * Shared by both content adapters rather than owned by the SQLite one. The web
 * adapter has no FTS5 index and filters in memory, but it has to agree with the
 * device about what counts as a token — otherwise a search that worked on web comes
 * back empty on a phone, and `docs/06`'s end-to-end suite would be defending
 * behaviour the app does not have.
 */

/**
 * What separates one token from the next.
 *
 * Everything FTS5 treats as punctuation, plus the tsheg and the shad. The tsheg
 * separates Tibetan syllables and the index splits on it, so a search for the first
 * syllable of a word has to split the same way.
 */
const SEPARATORS = /[\s"'*():^,.;!?/\\[\]{}་།-]+/u;

/**
 * The searchable tokens in a piece of text.
 *
 * Used on both sides of a search: on what the learner typed, and on the fields being
 * matched. One splitter for both is the only way the two adapters can agree.
 *
 * @example splitSearchTokens('བཀྲ་ཤིས')  // => ['བཀྲ', 'ཤིས']
 */
export function splitSearchTokens(text: string): string[] {
  return text.trim().split(SEPARATORS).filter(Boolean);
}

/**
 * Turn what a learner typed into an FTS5 prefix query.
 *
 * FTS5 has its own syntax, so raw input can be a syntax error rather than a search —
 * a stray quote or `NEAR` would throw at the learner. Every token is quoted and a
 * `*` appended, which makes search feel like it filters as you type. Tibetan works
 * unchanged: the index tokenizes the script, and prefix matching on `བཀྲ` finds
 * `བཀྲ་ཤིས`.
 *
 * @returns null when there is nothing searchable, so the caller returns no results
 * rather than running a query that matches everything.
 * @example toFtsPrefixQuery('butter tea')  // => '"butter"* "tea"*'
 */
export function toFtsPrefixQuery(query: string): string | null {
  const tokens = splitSearchTokens(query);
  if (tokens.length === 0) {
    return null;
  }
  return tokens.map(token => `"${token}"*`).join(' ');
}
