/**
 * @fileoverview Ambient declarations for the project.
 *
 * The Uniwind reference is a `path` rather than a `types` reference because the
 * package exposes its React Native prop augmentation through an `exports` subpath,
 * which the `types` form does not resolve. Without it, `className` is not a known
 * prop on any React Native component.
 */

/// <reference path="./node_modules/uniwind/types.d.ts" />

/** Metro resolves CSS imports; TypeScript needs to be told they carry no exports. */
declare module '*.css';
