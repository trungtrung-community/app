/**
 * @fileoverview The shapes the session renderers share.
 *
 * Everything here is derived from `SessionState`, which the usecases layer
 * re-exports — the engine itself is out of reach from components, and that is
 * the point: a renderer knows the shape of one queue entry and nothing about
 * how the queue got that way. Indexed-access types instead of restated unions,
 * so the engine's shape changes and these follow without a second edit.
 */

import type {ContentItemId} from '../../ports/content-ids';
import type {SessionItem, SessionState} from '../../usecases/start-stop';

/** One taught thing — word, phrase, or a letter reduced for display. */
export type Item = SessionItem;

/** The session's lookup from item id to the item itself. */
export type Items = ReadonlyMap<ContentItemId, Item>;

/** One entry of the session queue — what the screen draws right now. */
export type SessionEntry = SessionState['queue'][number];

/** The verdict on the current entry, or null while it waits. */
export type SessionAnswered = SessionState['answered'];

/** What a teaching card presents: word, phrase, or a script unit. */
export type CardKind = Extract<SessionEntry['position'], {kind: 'card'}>['card'];
