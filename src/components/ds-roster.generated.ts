/**
 * @fileoverview GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  npm run sync:cards
 * Verify with:      npm run sync:cards -- --check
 *
 * The design system's component roster. The specimen gallery derives its index
 * from this rather than a hand-kept list, because the board is the authority on
 * which components exist and what they are called.
 *
 * 51 components: 10 core, 8 feedback, 6 forms, 27 learning
 * 29 ship .jsx source; the rest exist only as
 * compiled code in _ds_bundle.js and are ported by reading that.
 * 23 ship a .card.html specimen.
 */

export type DsGroup = 'core' | 'feedback' | 'forms' | 'learning';

export type DsComponent = {
  readonly name: string;
  readonly group: DsGroup;
  /** False when the export ships only compiled bundle code for it. */
  readonly hasSource: boolean;
  /** False when there is no drawn specimen to mirror in the gallery. */
  readonly hasSpecimen: boolean;
};

export const DS_ROSTER: readonly DsComponent[] = [
  {name: 'Badge', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'Button', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'Card', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'Divider', group: 'core', hasSource: true, hasSpecimen: true},
  {name: 'Icon', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'IconButton', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'ListRow', group: 'core', hasSource: true, hasSpecimen: true},
  {name: 'SegmentedControl', group: 'core', hasSource: true, hasSpecimen: true},
  {name: 'TabBar', group: 'core', hasSource: true, hasSpecimen: true},
  {name: 'Tag', group: 'core', hasSource: false, hasSpecimen: false},
  {name: 'Dialog', group: 'feedback', hasSource: true, hasSpecimen: false},
  {name: 'EmptyState', group: 'feedback', hasSource: false, hasSpecimen: false},
  {name: 'MascotSpeech', group: 'feedback', hasSource: false, hasSpecimen: false},
  {name: 'OfflineBanner', group: 'feedback', hasSource: false, hasSpecimen: false},
  {name: 'Sheet', group: 'feedback', hasSource: true, hasSpecimen: false},
  {name: 'Skeleton', group: 'feedback', hasSource: false, hasSpecimen: false},
  {name: 'Toast', group: 'feedback', hasSource: false, hasSpecimen: false},
  {name: 'Tooltip', group: 'feedback', hasSource: true, hasSpecimen: false},
  {name: 'Checkbox', group: 'forms', hasSource: false, hasSpecimen: false},
  {name: 'Input', group: 'forms', hasSource: false, hasSpecimen: false},
  {name: 'Radio', group: 'forms', hasSource: false, hasSpecimen: false},
  {name: 'SearchField', group: 'forms', hasSource: true, hasSpecimen: true},
  {name: 'Select', group: 'forms', hasSource: false, hasSpecimen: false},
  {name: 'Switch', group: 'forms', hasSource: false, hasSpecimen: false},
  {name: 'AnswerBand', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'AnswerChoice', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'ArtifactCard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'AudioButton', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'CapabilityList', group: 'learning', hasSource: true, hasSpecimen: false},
  {name: 'ChangeRow', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'ChipTray', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'CircuitRing', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'FlashCard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'HeadRail', group: 'learning', hasSource: true, hasSpecimen: false},
  {name: 'LetterTile', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'ModeCard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'PairBoard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'PlaybackRow', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'ProgressBar', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'RailNode', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'RatingButtons', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'RecordButton', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'SectionHeader', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'ShareCard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'StackDiagram', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'StatPill', group: 'learning', hasSource: false, hasSpecimen: false},
  {name: 'SyllableChip', group: 'learning', hasSource: true, hasSpecimen: false},
  {name: 'TibetanText', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'TranscriptRow', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'WordCard', group: 'learning', hasSource: true, hasSpecimen: true},
  {name: 'WordRow', group: 'learning', hasSource: true, hasSpecimen: true},
];
