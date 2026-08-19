/**
 * @fileoverview useContent — the one way a screen reads the content port.
 *
 * A screen states what it reads; this hook owns how: the async container accessor,
 * the loading and error states, and the re-read on changed inputs. There is no cache
 * beyond the container's own memoisation — reads are local SQLite or the fixture and
 * come back in milliseconds, so a cache would be speculation.
 *
 * The convention the three states carry: `loading` renders `Skeleton` shapes matching
 * the ready layout; `error` and genuinely-empty ready data render `EmptyState`. No
 * per-screen spinners.
 */

import {useEffect, useState, type DependencyList} from 'react';

import type {ContentSource} from '../ports';

import {content} from '../composition/container';

export type Load<T> =
  | {readonly status: 'loading'}
  | {readonly status: 'ready'; readonly data: T}
  | {readonly status: 'error'; readonly error: unknown};

/**
 * Read from the content port, as a screen.
 *
 * The read callback can narrow to a capability, which keeps a screen honest about
 * what it uses: `useContent((c: DictionarySource) => c.getVocabulary(id), [id])`.
 *
 * @param read Runs against the container's content source. A new read starts
 *   whenever `deps` change; a stale read's result is dropped.
 * @param deps The inputs the read depends on, like an effect's dependency list.
 * @example
 * const words = useContent(c => c.listVocabularyByDistrict(district), [district]);
 */
export function useContent<T>(
  read: (source: ContentSource) => Promise<T>,
  deps: DependencyList,
): Load<T> {
  const [load, setLoad] = useState<Load<T>>({status: 'loading'});

  // The reset to `loading` happens by adjusting state during render — React's
  // documented pattern for reacting to changed inputs, and the same shape Sheet and
  // Dialog use — because a synchronous setState in the effect body renders once with
  // the stale value and is what `react-hooks/set-state-in-effect` refuses.
  const [seenDeps, setSeenDeps] = useState(deps);
  if (!sameDeps(seenDeps, deps)) {
    setSeenDeps(deps);
    setLoad({status: 'loading'});
  }

  useEffect(() => {
    let live = true;
    content()
      .then(read)
      .then(
        data => {
          if (live) {
            setLoad({status: 'ready', data});
          }
        },
        (error: unknown) => {
          if (live) {
            setLoad({status: 'error', error});
          }
        },
      );
    return () => {
      live = false;
    };
    // The caller's deps are the contract; the read callback itself is an inline
    // closure over them and deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return load;
}

function sameDeps(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}
