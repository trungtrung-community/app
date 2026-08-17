/**
 * @fileoverview Specimens for the ported components — the gallery's content.
 *
 * The gallery's *index* is generated from the design system's manifest
 * (`ds-roster.generated.ts`), so it always lists all 51 components whether or not they
 * have been ported. The specimens here are hand-written against each component's
 * `.card.html`, because a drawn specimen names the states that matter and no
 * generator can infer them.
 *
 * A component appears as "not yet ported" in the gallery until it has an entry here,
 * which makes the port's progress a fact on screen rather than a note somewhere.
 *
 * Per `docs/04`, specimens show real content-spec content — no lorem, no "Word 1". The
 * Tibetan below is real vocabulary; the gallery route supplies more from the content
 * database.
 */

import {useState, type ReactNode} from 'react';
import {Text, View} from 'react-native';

import {Badge} from './core/badge';
import {Button} from './core/button';
import {Card} from './core/card';
import {Divider} from './core/divider';
import {Icon, ICON_NAMES} from './core/icon';
import {IconButton} from './core/icon-button';
import {ListRow} from './core/list-row';
import {SegmentedControl} from './core/segmented-control';
import {TabBar} from './core/tab-bar';
import {Tag} from './core/tag';
import {Dialog} from './feedback/dialog';
import {EmptyState} from './feedback/empty-state';
import {MascotSpeech} from './feedback/mascot-speech';
import {OfflineBanner} from './feedback/offline-banner';
import {Sheet} from './feedback/sheet';
import {Skeleton} from './feedback/skeleton';
import {Toast} from './feedback/toast';
import {Tooltip} from './feedback/tooltip';
import {Checkbox} from './forms/checkbox';
import {Input} from './forms/input';
import {Radio} from './forms/radio';
import {SearchField} from './forms/search-field';
import {Select} from './forms/select';
import {Switch} from './forms/switch';
import {AudioButton} from './learning/audio-button';
import {CircuitRing} from './learning/circuit-ring';
import {LetterTile} from './learning/letter-tile';
import {ProgressBar} from './learning/progress-bar';
import {SectionHeader} from './learning/section-header';
import {StatPill} from './learning/stat-pill';
import {SyllableChip} from './learning/syllable-chip';
import {TibetanText} from './learning/tibetan-text';

/** A row of specimens that belong side by side. */
function Row({children}: {children: ReactNode}) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}

/** A column of specimens that read top to bottom. */
function Stack({children}: {children: ReactNode}) {
  return <View className="gap-3">{children}</View>;
}

export type Specimen = {
  /** What state this shows. Mirrors the wording on the .card.html where there is one. */
  readonly label: string;
  /** Why this state exists, when it is not obvious from the label. */
  readonly note?: string;
  readonly render: () => ReactNode;
};

export type PortedComponent = {
  readonly specimens: readonly Specimen[];
};

/** For an action that has to exist so the control renders, but has nowhere to go here. */
function noop() {}

/** Real records, so the specimens read like the product rather than like a test. */
const TRASHI = 'བཀྲ་ཤིས་བདེ་ལེགས';
const BUS = 'སྤྱི་སྤྱོད་རླངས་འཁོར';
const STACK = 'བསྒྲིབས';
/** A partial query, as the SearchField specimen on the board types it. */
const THUK = 'ཐུགས་';

/**
 * A form control drawn with live state.
 *
 * Every form specimen below is interactive rather than a picture of a state, because these
 * are the components whose whole behaviour is the transition between two states — a Switch
 * that cannot be flipped tells you nothing about the one thing it does. The board's own
 * SearchField card makes the same choice, ending with an "Interactive" row.
 */
function Live<T>({
  initial,
  children,
}: {
  initial: T;
  children: (value: T, set: (next: T) => void) => ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return <>{children(value, setValue)}</>;
}

/**
 * Components that have been ported, keyed by their design-system name.
 *
 * The key must match the manifest name exactly — that is the contract the board and
 * the code share.
 */
export const PORTED: Record<string, PortedComponent> = {
  Button: {
    specimens: [
      {
        label: 'the two sanctioned skins',
        note: 'docs/04 allows teal primary and ghost, and nothing else. The other four variants below exist for specific drawn screens.',
        render: () => (
          <Stack>
            <Button variant="primary">Keep going</Button>
            <Button variant="ghost" iconLeft="rotate-ccw">
              Listen again
            </Button>
          </Stack>
        ),
      },
      {
        label: 'the keycap edge',
        note: 'A solid offset, not a blur. Press it: the control sinks 2pt and the edge shrinks to match, so the footprint never changes and nothing below shifts.',
        render: () => (
          <Stack>
            <Button variant="primary" size="lg" fullWidth>
              Check
            </Button>
            <Button variant="ink">Leave</Button>
            <Button variant="danger">Erase everything</Button>
            <Button variant="secondary">Not yet</Button>
          </Stack>
        ),
      },
      {
        label: 'flat variants scale instead of sinking',
        note: 'soft and ghost have no edge to sink onto, so they take the press scale.',
        render: () => (
          <Row>
            <Button variant="soft">Again</Button>
            <Button variant="ghost">Got it</Button>
          </Row>
        ),
      },
      {
        label: 'sizes',
        render: () => (
          <Stack>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Stack>
        ),
      },
      {
        label: 'disabled',
        note: 'A disabled button must have its reason stated on screen — a dead control with no explanation reads as broken rather than unavailable.',
        render: () => <Button disabled>Not yet walked</Button>,
      },
    ],
  },

  Card: {
    specimens: [
      {
        label: 'tones separate by fill value',
        note: 'Borderless by design. No hairline, no drop shadow — the value of the fill is what separates one surface from another.',
        render: () => (
          <Stack>
            <Card tone="card">
              <Text className="type-body text-fg-body">card</Text>
            </Card>
            <Card tone="ground">
              <Text className="type-body text-fg-body">ground</Text>
            </Card>
            <Card tone="accent">
              <Text className="type-body text-fg-accent">accent</Text>
            </Card>
            <Card tone="correct">
              <Text className="type-body text-fg-heading">correct</Text>
            </Card>
            <Card tone="alert">
              <Text className="type-body text-fg-heading">alert</Text>
            </Card>
            <Card tone="reward">
              <Text className="type-body text-fg-heading">reward</Text>
            </Card>
            <Card tone="ink">
              <Text className="type-body text-fg-on-ink">ink</Text>
            </Card>
          </Stack>
        ),
      },
      {
        label: 'floating — layered UI only',
        note: 'The one case a shadow is allowed: a sheet or dialog above the page. A card in a list never floats.',
        render: () => (
          <Card floating>
            <Text className="type-body text-fg-body">a sheet above the page</Text>
          </Card>
        ),
      },
      {
        label: 'padding',
        render: () => (
          <Stack>
            <Card padding="sm" tone="ground">
              <Text className="type-caption text-fg-muted">sm</Text>
            </Card>
            <Card padding="lg" tone="ground">
              <Text className="type-caption text-fg-muted">lg</Text>
            </Card>
          </Stack>
        ),
      },
    ],
  },

  Badge: {
    specimens: [
      {
        label: 'tones',
        note: 'Read-only status. If it can be chosen or dismissed it is a Tag, not a Badge.',
        render: () => (
          <Row>
            <Badge tone="soft">19 known</Badge>
            <Badge tone="accent">New</Badge>
            <Badge tone="correct">Met</Badge>
            <Badge tone="reward">Found</Badge>
            <Badge tone="alert">Due</Badge>
            <Badge tone="neutral">Not yet</Badge>
            <Badge tone="ink">Exam</Badge>
          </Row>
        ),
      },
      {
        label: 'with a dot, and with an icon',
        render: () => (
          <Row>
            <Badge tone="correct" dot>
              Known
            </Badge>
            <Badge tone="soft" icon="star">
              Walked
            </Badge>
          </Row>
        ),
      },
      {
        label: 'the bare dot',
        note: 'Ten points, no text. It is decoration, so whatever it marks says itself in words nearby — colour is never the only signal.',
        render: () => (
          <Row>
            <Badge tone="accent" />
            <Badge tone="neutral" />
          </Row>
        ),
      },
    ],
  },

  Tag: {
    specimens: [
      {
        label: 'selected and not',
        note: 'Sentence case, which is what separates it from a Badge at a glance.',
        render: () => (
          <Row>
            <Tag onPress={() => {}}>Teahouse</Tag>
            <Tag selected onPress={() => {}}>
              Market
            </Tag>
          </Row>
        ),
      },
      {
        label: 'dismissible',
        note: 'The x has its own hit area, so dismissing is not a tap that also selects.',
        render: () => (
          <Row>
            <Tag onPress={() => {}} onRemove={() => {}}>
              Verbs
            </Tag>
          </Row>
        ),
      },
      {
        label: 'sizes',
        render: () => (
          <Row>
            <Tag size="sm">Small</Tag>
            <Tag size="md">Medium</Tag>
          </Row>
        ),
      },
    ],
  },

  IconButton: {
    specimens: [
      {
        label: 'variants',
        note: 'label is required, not optional: the glyph is the only thing naming the control.',
        render: () => (
          <Row>
            <IconButton icon="x" label="Leave" variant="plain" />
            <IconButton icon="volume-2" label="Play" variant="soft" />
            <IconButton icon="search" label="Search" variant="card" />
            <IconButton icon="play" label="Play" variant="accent" />
          </Row>
        ),
      },
      {
        label: 'sizes',
        note: 'The 40pt box keeps a 48pt hit area through hitSlop rather than by growing.',
        render: () => (
          <Row>
            <IconButton icon="mic" label="Record" size="sm" variant="soft" />
            <IconButton icon="mic" label="Record" size="md" variant="soft" />
            <IconButton icon="mic" label="Record" size="lg" variant="soft" />
          </Row>
        ),
      },
      {
        label: 'square, and disabled',
        render: () => (
          <Row>
            <IconButton icon="columns-2" label="Grid" variant="card" round={false} />
            <IconButton icon="mic" label="Record" variant="soft" disabled />
          </Row>
        ),
      },
    ],
  },

  Divider: {
    specimens: [
      {
        label: 'inside one card',
        note: 'The one sanctioned line. It separates rows that already share a card, where a gap would read as two cards. Never to outline a card.',
        render: () => (
          <Card padding="sm">
            <Text className="type-body text-fg-body">ཇ་ཐང · chhaathang</Text>
            <Divider />
            <Text className="type-body text-fg-body">བོད་ཇ · phööcha</Text>
          </Card>
        ),
      },
      {
        label: 'widths',
        note: 'Half is the default, because at half it reads as a hint rather than a rule.',
        render: () => (
          <Stack>
            <Divider width="half" />
            <Divider width="third" />
            <Divider width="full" />
          </Stack>
        ),
      },
      {
        label: 'hanging off the text edge',
        render: () => <Divider width="third" align="start" />,
      },
    ],
  },

  ListRow: {
    specimens: [
      {
        label: 'label, sub and value',
        note: 'The board hand-drew this thirty-two times before it was promoted. sub is one sentence, never two.',
        render: () => (
          <Stack>
            <ListRow label="Reminders" value="19:00" onPress={() => {}} />
            <ListRow
              label="Sounds"
              sub="The correct tick and the stop-complete moment."
              value="On"
              onPress={() => {}}
            />
            <ListRow label="Show Wylie spelling" value="Off" onPress={() => {}} />
          </Stack>
        ),
      },
      {
        label: 'with an icon, and a destructive door',
        render: () => (
          <Stack>
            <ListRow icon="share-2" label="Export your progress" onPress={() => {}} />
            <ListRow icon="x" label="Erase everything" tone="danger" onPress={() => {}} />
          </Stack>
        ),
      },
      {
        label: 'not a door',
        note: 'No chevron and no press when the row only states something.',
        render: () => <ListRow label="Days walking" value="41" chevron={false} />,
      },
    ],
  },

  SegmentedControl: {
    specimens: [
      {
        label: 'the district hub',
        note: 'The active segment is a white card on the sunken track, carrying the shallow edge. No borders, no underline, no sliding outline.',
        render: () => (
          <SegmentedControl
            items={[
              {label: 'Stops'},
              {label: 'Words', count: '19'},
              {label: 'Phrases', count: '7'},
            ]}
            active={0}
          />
        ),
      },
      {
        label: 'Speak and Read',
        note: 'These are segments rather than tabs, which is the decision that keeps TabBar at four forever.',
        render: () => <SegmentedControl items={[{label: 'Speak'}, {label: 'Read'}]} active={1} />,
      },
    ],
  },

  TabBar: {
    specimens: [
      {
        label: 'the four destinations',
        note: 'Four, and it never grows. A filled bar with no top border and no translucency — the protection gradient above does the separating.',
        render: () => (
          <View className="-m-4">
            <TabBar active="journey" />
          </View>
        ),
      },
      {
        label: 'each destination active',
        render: () => (
          <View className="-m-4 gap-2">
            <TabBar active="practice" />
            <TabBar active="collection" />
            <TabBar active="you" />
          </View>
        ),
      },
    ],
  },
  TibetanText: {
    specimens: [
      {
        label: 'the naming triple',
        note: 'Tibetan, then the romanization, then the English gloss — the order the system requires everywhere.',
        render: () => (
          <TibetanText roman="trashi delek" gloss="hello / greetings">
            {TRASHI}
          </TibetanText>
        ),
      },
      {
        label: 'the size ramp',
        render: () => (
          <View style={{gap: 12}}>
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(size => (
              <TibetanText key={size} size={size}>
                {TRASHI}
              </TibetanText>
            ))}
          </View>
        ),
      },
      {
        label: 'hero',
        note: 'The one size that gets the medium face rather than the regular.',
        render: () => (
          <TibetanText size="hero" serif>
            ཀ
          </TibetanText>
        ),
      },
      {
        label: 'highlight by dimming',
        note: 'One line letter at full ink, the rest muted. Colour-only, so highlightLabel carries the accessible name — a stack counts as ONE line letter.',
        render: () => (
          <TibetanText size="xl" unit="letter" highlight={1} highlightLabel="the stack སྒྲི">
            {STACK}
          </TibetanText>
        ),
      },
      {
        label: 'inline in a Latin sentence',
        note: 'Inherits the surrounding colour and drops the row stack, but keeps every typographic rule.',
        render: () => (
          <TibetanText inline size="sm">
            ད
          </TibetanText>
        ),
      },
      {
        label: 'the word sheet rows',
        note: 'thl is the one "also written" row in the product. Wylie is labelled Spelled and is off by default.',
        render: () => (
          <TibetanText
            roman="chi chö lang khor"
            thl="chi chö lang khor"
            wylie="spyi spyod rlangs 'khor"
            gloss="bus"
          >
            {BUS}
          </TibetanText>
        ),
      },
      {
        label: 'centred',
        render: () => (
          <TibetanText align="center" roman="trashi delek">
            {TRASHI}
          </TibetanText>
        ),
      },
    ],
  },

  Icon: {
    specimens: [
      {
        label: 'the size ramp',
        note: 'Stroke weight steps with size so the mark reads at a constant weight.',
        render: () => (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
            {[16, 20, 24, 28].map(size => (
              <Icon key={size} name="volume-2" size={size} />
            ))}
          </View>
        ),
      },
      {
        label: 'every name in the system',
        note: 'The 34 icons used across the components and the six boards. A name outside this set is a compile error, not a blank square.',
        render: () => (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
            {ICON_NAMES.map(name => (
              <Icon key={name} name={name} size={24} />
            ))}
          </View>
        ),
      },
      {
        label: 'labelled, for a bare icon button',
        note: 'Decoration by default and hidden from assistive tech; a label is passed only when the icon is the sole carrier of meaning.',
        render: () => <Icon name="x" label="Leave the lesson" size={28} />,
      },
    ],
  },

  Switch: {
    specimens: [
      {
        label: 'off, on, and with a description',
        note: 'Reanimated drives the thumb on --ease-settle, which overshoots once and comes back. The track colour is clamped so it cannot overshoot past teal-600 into a colour the palette does not hold.',
        render: () => (
          <Stack>
            <Live initial={false}>
              {(on, set) => <Switch label="Haptics" checked={on} onChange={set} />}
            </Live>
            <Live initial={true}>
              {(on, set) => <Switch label="Autoplay audio" checked={on} onChange={set} />}
            </Live>
            <Live initial={true}>
              {(on, set) => (
                <Switch
                  label="Daily reminder"
                  description="A nudge at 19:00, and nothing if you have already walked today."
                  checked={on}
                  onChange={set}
                />
              )}
            </Live>
          </Stack>
        ),
      },
      {
        label: 'disabled',
        note: 'Grey track, no movement. A dead control still needs a reason beside it on a real screen.',
        render: () => (
          <Stack>
            <Switch label="Sync to account" description="Available once you sign in." disabled />
            <Switch label="Sync to account" checked disabled />
          </Stack>
        ),
      },
    ],
  },

  Checkbox: {
    specimens: [
      {
        label: 'unchecked, checked, described',
        note: 'A square corner and a mark. Unlike Switch, nothing happens until a button is pressed.',
        render: () => (
          <Stack>
            <Live initial={false}>
              {(on, set) => <Checkbox label="Show Wylie spelling" checked={on} onChange={set} />}
            </Live>
            <Live initial={true}>
              {(on, set) => (
                <Checkbox label="Include phrases in review" checked={on} onChange={set} />
              )}
            </Live>
            <Live initial={false}>
              {(on, set) => (
                <Checkbox
                  label="Practise reading"
                  description="Uchen script drills alongside the spoken stops."
                  checked={on}
                  onChange={set}
                />
              )}
            </Live>
          </Stack>
        ),
      },
      {
        label: 'disabled',
        render: () => (
          <Stack>
            <Checkbox
              label="Download audio"
              description="Everything is already offline."
              disabled
            />
            <Checkbox label="Download audio" checked disabled />
          </Stack>
        ),
      },
    ],
  },

  Radio: {
    specimens: [
      {
        label: 'a group of three',
        note: 'Round, so picking one un-picks the others. The dot scales in on the settling curve; pressing the checked one does nothing, exactly as a DOM radio does not.',
        render: () => (
          <Live initial="speak">
            {(mode, set) => (
              <Stack>
                <Radio
                  label="Speak first"
                  description="Start with the spoken track and add script later."
                  value="speak"
                  checked={mode === 'speak'}
                  onChange={next => set(next ?? 'speak')}
                />
                <Radio
                  label="Read first"
                  description="Start with uchen and the thirty letters."
                  value="read"
                  checked={mode === 'read'}
                  onChange={next => set(next ?? 'speak')}
                />
                <Radio
                  label="Both together"
                  value="both"
                  checked={mode === 'both'}
                  onChange={next => set(next ?? 'speak')}
                />
              </Stack>
            )}
          </Live>
        ),
      },
      {
        label: 'disabled',
        render: () => (
          <Stack>
            <Radio label="Lhasa dialect" checked disabled />
            <Radio label="Amdo dialect" description="Not in this release." disabled />
          </Stack>
        ),
      },
    ],
  },

  Input: {
    specimens: [
      {
        label: 'label, hint, icon',
        note: 'Sunken fill and no border. Focus is a teal ring drawn as a box-shadow, so gaining focus costs no layout and the field does not move.',
        render: () => (
          <Stack>
            <Live initial="">
              {(text, set) => (
                <Input
                  label="What should we call you?"
                  placeholder="Your name"
                  value={text}
                  onChange={set}
                />
              )}
            </Live>
            <Live initial="">
              {(text, set) => (
                <Input
                  label="Email"
                  hint="Only used to restore your progress."
                  icon="user"
                  type="email"
                  placeholder="you@example.com"
                  value={text}
                  onChange={set}
                />
              )}
            </Live>
          </Stack>
        ),
      },
      {
        label: 'error outranks focus',
        note: 'A field can be focused and wrong at once. Teal over red would hide the thing that needs fixing, so the error wins and the message takes the same colour.',
        render: () => (
          <Live initial="thugs">
            {(text, set) => (
              <Input
                label="Romanization"
                error="Trungtrung spells this thuk — THL spellings are not accepted here."
                value={text}
                onChange={set}
              />
            )}
          </Live>
        ),
      },
      {
        label: 'tibetan',
        note: 'The one sanctioned exception to routing Tibetan through TibetanText: there is nothing to wrap in a field being typed into. The field is 62pt tall rather than 52 because a 22pt stack needs that much room for its ink.',
        render: () => (
          <Live initial={THUK}>
            {(text, set) => (
              <Input label="Type what you hear" tibetan value={text} onChange={set} />
            )}
          </Live>
        ),
      },
      {
        label: 'disabled',
        render: () => <Input label="Account" value="Signed out" disabled />,
      },
    ],
  },

  SearchField: {
    specimens: [
      {
        label: 'empty',
        render: () => (
          <Live initial="">
            {(q, set) => <SearchField value={q} onChange={set} onClear={() => set('')} />}
          </Live>
        ),
      },
      {
        label: 'typed',
        note: 'The clear button exists only when there is something to clear.',
        render: () => (
          <Live initial="thuk">
            {(q, set) => <SearchField value={q} onChange={set} onClear={() => set('')} />}
          </Live>
        ),
      },
      {
        label: 'typed in Tibetan',
        note: 'The face flips to Noto Serif Tibetan the moment the query contains Tibetan. React Native has no font fallback, so left in the body face these glyphs would be tofu — the board only gets away with it because a browser substitutes silently.',
        render: () => (
          <Live initial={THUK}>
            {(q, set) => <SearchField value={q} onChange={set} onClear={() => set('')} />}
          </Live>
        ),
      },
    ],
  },

  Select: {
    specimens: [
      {
        label: 'closed, with a value',
        note: 'The only control with no React Native equivalent at all: the web original is a real <select> the browser draws. The trigger matches the drawn control, and the options open in a Sheet — the design system’s own answer to a list of choices, so the picker is an existing surface rather than a new one. Press it.',
        render: () => (
          <Stack>
            <Live initial="19:00">
              {(time, set) => (
                <Select
                  label="Reminder"
                  hint="We will not send one on a day you have already walked."
                  value={time}
                  options={['08:00', '12:30', '19:00', '21:00']}
                  onChange={set}
                />
              )}
            </Live>
            <Live initial="normal">
              {(speed, set) => (
                <Select
                  label="Playback"
                  value={speed}
                  options={[
                    {value: 'slow', label: 'Slow'},
                    {value: 'normal', label: 'Natural'},
                  ]}
                  onChange={set}
                />
              )}
            </Live>
          </Stack>
        ),
      },
      {
        label: 'nothing chosen, and disabled',
        note: 'An unset value shows an em dash rather than an invented placeholder — the prop contract has no placeholder in it.',
        render: () => (
          <Stack>
            <Select label="District" options={['Barkhor', 'Teahouse']} />
            <Select label="Dialect" value="Lhasa" options={['Lhasa']} disabled />
          </Stack>
        ),
      },
    ],
  },

  Skeleton: {
    specimens: [
      {
        label: 'the three shapes',
        note: 'The sheen is a band travelling across a clipped shape, because React Native has neither a gradient background nor background-position. It holds still under reduced motion.',
        render: () => (
          <Stack>
            <Skeleton shape="text" width="70%" />
            <Skeleton shape="text" width="45%" />
            <Skeleton shape="block" height={72} />
            <Skeleton shape="circle" width={68} />
          </Stack>
        ),
      },
      {
        label: 'composed into the shape of a journey row',
        note: 'A skeleton sketches the screen being loaded. That is the whole reason it is not a spinner.',
        render: () => (
          <Row>
            <Skeleton shape="circle" width={68} />
            <View style={{flex: 1, gap: 8}}>
              <Skeleton shape="text" width="60%" />
              <Skeleton shape="text" width="85%" height={12} />
            </View>
          </Row>
        ),
      },
    ],
  },

  Toast: {
    specimens: [
      {
        label: 'the four tones',
        note: 'The icon belongs to the tone rather than being a separate decision. The action takes the tone’s own text colour — teal on grass or crown would be unreadable.',
        render: () => (
          <Stack>
            <Toast>Saved for later</Toast>
            <Toast tone="correct">Stop complete</Toast>
            <Toast tone="reward" action="See it" onAction={noop}>
              New card earned
            </Toast>
            <Toast tone="alert" action="Undo" onAction={noop}>
              Removed from your collection
            </Toast>
          </Stack>
        ),
      },
    ],
  },

  OfflineBanner: {
    specimens: [
      {
        label: 'the default message',
        note: 'It says what still works, not that something failed — docs/01 commits to the whole app working offline from first launch, so losing connectivity takes nothing away.',
        render: () => <OfflineBanner />,
      },
      {
        label: 'with an action',
        note: 'Rarely needed. teal-300 is the one place the palette’s light teal is a text colour, because the darker teals disappear on ink.',
        render: () => (
          <OfflineBanner action="Retry" onAction={noop}>
            You&apos;re offline. Your progress is saved on this phone.
          </OfflineBanner>
        ),
      },
    ],
  },

  Tooltip: {
    specimens: [
      {
        label: 'four sides',
        note: 'Controlled only: there is no hover on a touch screen, so the half of the web original that showed itself on hover does not survive. Shown open here.',
        render: () => (
          <View style={{gap: 40, paddingVertical: 40, alignItems: 'flex-start'}}>
            {(['top', 'bottom', 'right'] as const).map(side => (
              <Tooltip key={side} label={`Set on the ${side}`} side={side} open>
                <Tag>{side}</Tag>
              </Tooltip>
            ))}
          </View>
        ),
      },
      {
        label: 'a Tibetan word in the label',
        note: 'The label goes through mixedTibetan, so the script gets its own face and leading inside the caption type rather than rendering at Latin metrics.',
        render: () => (
          <View style={{paddingTop: 56, alignItems: 'flex-start'}}>
            <Tooltip label={`${THUK} means mind`} open>
              <Tag>gloss</Tag>
            </Tooltip>
          </View>
        ),
      },
    ],
  },

  MascotSpeech: {
    specimens: [
      {
        label: 'the bubble, with the crane missing',
        note: 'No mascot art exists in this repo yet — the design system points at assets/mascot-crane.png, which has never been drawn. Without a source it renders the bubble alone rather than a broken-image gap. Shown on the app ground, because a white bubble on a white card is invisible — and the single pointed corner, the whole substitute for a speech tail, is the thing to look at.',
        render: () => (
          // On the pale app ground, which is where it actually sits.
          <View className="gap-3 rounded-lg bg-surface-app p-4">
            <MascotSpeech>Two more stops and the district opens.</MascotSpeech>
            <MascotSpeech side="right">That is the third time today. It is sticking.</MascotSpeech>
          </View>
        ),
      },
    ],
  },

  EmptyState: {
    specimens: [
      {
        label: 'points forward, never apologises',
        note: 'The copy rule is the component. "Your first district starts below", not "No districts found".',
        render: () => (
          <EmptyState title="Your first district starts below" action="Begin" onAction={noop}>
            Six stops, about ten minutes each.
          </EmptyState>
        ),
      },
      {
        label: 'title only',
        render: () => <EmptyState title="Nothing due today. Come back tomorrow." />,
      },
    ],
  },

  Sheet: {
    specimens: [
      {
        label: 'open it',
        note: 'A real Modal rather than an absolutely-positioned overlay, which is what puts it above the tab bar instead of inside whatever rendered it. The grabber is decoration: there is no drag-to-dismiss, because a rubber-banding sheet is not the one flip docs/04 allows.',
        render: () => (
          <Live initial={false}>
            {(open, set) => (
              <>
                <Button variant="secondary" onPress={() => set(true)}>
                  Open the sheet
                </Button>
                <Sheet
                  open={open}
                  title={`${THUK} · thuk`}
                  onClose={() => set(false)}
                  footer={
                    <Button fullWidth onPress={() => set(false)}>
                      Got it
                    </Button>
                  }
                >
                  <Text className="type-body text-fg-body">
                    A Tibetan title goes through mixedTibetan, so the script sets properly inside
                    the heading rather than at Latin metrics.
                  </Text>
                </Sheet>
              </>
            )}
          </Live>
        ),
      },
    ],
  },

  Dialog: {
    specimens: [
      {
        label: 'a decision that must interrupt',
        note: 'Reserved for quitting a lesson and destructive confirmations. The footer stacks: on a phone two side-by-side buttons are both too narrow, and stacking puts the safe choice under the destructive one where a thumb rests.',
        render: () => (
          <Live initial={false}>
            {(open, set) => (
              <>
                <Button variant="danger" onPress={() => set(true)}>
                  Leave this stop
                </Button>
                <Dialog
                  open={open}
                  title="Leave this stop?"
                  onClose={() => set(false)}
                  footer={
                    <>
                      <Button variant="danger" fullWidth onPress={() => set(false)}>
                        Leave
                      </Button>
                      <Button variant="ghost" fullWidth onPress={() => set(false)}>
                        Keep going
                      </Button>
                    </>
                  }
                >
                  <Text className="type-body text-fg-body">Your answers so far are kept.</Text>
                </Dialog>
              </>
            )}
          </Live>
        ),
      },
    ],
  },

  SectionHeader: {
    specimens: [
      {
        label: 'eyebrow and title',
        note: 'Plain text, no card and no rule. It marks a new stretch of the journey by the space around it, the way a chapter opening does.',
        render: () => (
          <Stack>
            <SectionHeader eyebrow="Section 2">The Market District</SectionHeader>
            <SectionHeader align="start">Where you left off</SectionHeader>
          </Stack>
        ),
      },
    ],
  },

  ProgressBar: {
    specimens: [
      {
        label: 'the four tones',
        note: 'The journey’s own progress is a CircuitRing — a walk round, not a bar. This is for the things that genuinely are linear.',
        render: () => (
          <Stack>
            <ProgressBar value={4} max={7} label="This stop" />
            <ProgressBar value={62} tone="reward" />
            <ProgressBar value={100} tone="correct" />
            <ProgressBar value={18} tone="alert" height={8} />
          </Stack>
        ),
      },
      {
        label: 'a bad value cannot draw outside the track',
        note: 'Clamped, and guarded against a zero max rather than dividing by it.',
        render: () => (
          <Stack>
            <ProgressBar value={-20} max={10} label="below zero" />
            <ProgressBar value={999} max={10} label="over max" />
            <ProgressBar value={5} max={0} label="max of zero" />
          </Stack>
        ),
      },
    ],
  },

  StatPill: {
    specimens: [
      {
        label: 'the icon carries the meaning, the number stays ink',
        note: 'Five pills in a row read as five different things without five different number colours competing. streak and hearts share crown red on purpose — both are things you can lose, and the icon separates them.',
        render: () => (
          <Row>
            <StatPill tone="streak" value="12" label="12 days walking" />
            <StatPill tone="xp" value="340" label="340 experience" />
            <StatPill tone="hearts" value="4" label="4 hearts left" />
            <StatPill tone="accent" value="2" label="District 2" />
            <StatPill value="19" label="19 words known" />
          </Row>
        ),
      },
    ],
  },

  CircuitRing: {
    specimens: [
      {
        label: 'a second circuit overlays the first, never resets it',
        note: 'The thick inner arc is the first walk; the thin outer arc is the second pass over the same ground. The inner arc keeps its finished fill — the first walk happened and nothing later un-happens it, which is the same commitment the progression model makes by never demoting a state.',
        render: () => (
          <Row>
            <CircuitRing circuit1={0.35} circuit2={0} label="First circuit, a third done">
              <Text className="type-body-strong text-fg-heading">3</Text>
            </CircuitRing>
            <CircuitRing circuit1={1} circuit2={0} label="First circuit closed">
              <Text className="type-body-strong text-fg-heading">7</Text>
            </CircuitRing>
            <CircuitRing circuit1={1} circuit2={0.5} label="Halfway round again">
              <Text className="type-body-strong text-fg-heading">7</Text>
            </CircuitRing>
            <CircuitRing circuit1={1} circuit2={1} label="Both circuits closed">
              <Icon name="check" size={28} />
            </CircuitRing>
          </Row>
        ),
      },
      {
        label: 'one circuit only',
        render: () => (
          <CircuitRing size={120} circuit1={0.7} showCircuit2={false} label="Seven of ten">
            <Text className="type-title text-fg-heading">7</Text>
          </CircuitRing>
        ),
      },
    ],
  },

  SyllableChip: {
    specimens: [
      {
        label: 'the five tones',
        note: 'The glyph goes through TibetanText like every Tibetan string in the system. The design system’s own source had a hand-set lang="bo" span here until 2026-08-16, which put 83 mounts outside the rule — which is why the rule is enforced by lint rather than by intent.',
        render: () => (
          <Row>
            <SyllableChip glyph="ཀྲ" roman="tra" onPress={noop} />
            <SyllableChip glyph="སྐུ" roman="ku" tone="selected" onPress={noop} />
            <SyllableChip glyph="བཀྲ" roman="tra" tone="correct" />
            <SyllableChip glyph="ཤིས" roman="shi" tone="wrong" />
            <SyllableChip glyph="བདེ" roman="de" tone="muted" />
          </Row>
        ),
      },
      {
        label: 'sizes, and without a romanization',
        render: () => (
          <Row>
            <SyllableChip glyph="ཀ" roman="ka" size="sm" onPress={noop} />
            <SyllableChip glyph="ཀ" roman="ka" size="md" onPress={noop} />
            <SyllableChip glyph="ཀ" roman="ka" size="lg" onPress={noop} />
            <SyllableChip glyph="ཀ" onPress={noop} />
          </Row>
        ),
      },
    ],
  },

  LetterTile: {
    specimens: [
      {
        label: 'the five states of knowing a letter',
        note: 'learned, not yet, selected while answering, and the two results. The box is never smaller than the glyph’s ink needs — the board’s numbers were measured in a browser, where ink may overflow. Android clips instead.',
        render: () => (
          <Row>
            <LetterTile glyph="ཀ" roman="ka" onPress={noop} />
            <LetterTile glyph="ཁ" roman="kha" state="notYet" />
            <LetterTile glyph="ག" roman="ga" state="selected" onPress={noop} />
            <LetterTile glyph="ང" roman="nga" state="correct" />
            <LetterTile glyph="ཅ" roman="ca" state="wrong" />
          </Row>
        ),
      },
      {
        label: 'base names the letter a stack was built from',
        note: 'Not decoration. ར་བཏགས་ alone produces tra three times, thra three times and thraa three times, and nothing else on the tile says which base made which.',
        render: () => (
          <Row>
            <LetterTile glyph="ཀྲ" roman="tra" base="ཀ" size="lg" />
            <LetterTile glyph="ཁྲ" roman="thra" base="ཁ" size="lg" />
            <LetterTile glyph="གྲ" roman="thraa" base="ག" size="lg" />
          </Row>
        ),
      },
      {
        label: 'sizes, and a caption',
        render: () => (
          <Row>
            <LetterTile glyph="ཀ" roman="ka" size="sm" />
            <LetterTile glyph="ཀ" roman="ka" size="md" />
            <LetterTile glyph="ཀ" roman="ka" size="xl" caption="The first of the thirty" />
          </Row>
        ),
      },
    ],
  },

  AudioButton: {
    specimens: [
      {
        label: 'ready, playing, and the half-speed badge',
        note: 'The pulse runs only while sound is actually coming out — a paused button that keeps pulsing says the wrong thing. It holds still under reduced motion.',
        render: () => (
          <Row>
            <AudioButton onPress={noop} />
            <AudioButton playing onPress={noop} />
            <AudioButton speed="slow" onPress={noop} />
            <AudioButton size="lg" playing onPress={noop} />
          </Row>
        ),
      },
      {
        label: 'downloading, and unavailable',
        note: 'docs/01 commits to no in-app downloads ever, so these describe the install-time delivery of an audio pack rather than anything a learner waits on mid-lesson.',
        render: () => (
          <Row>
            <AudioButton state="downloading" progress={0.35} />
            <AudioButton state="downloading" progress={0.8} size="lg" />
            <AudioButton state="unavailable" />
          </Row>
        ),
      },
      {
        label: 'sizes',
        render: () => (
          <Row>
            <AudioButton size="sm" onPress={noop} />
            <AudioButton size="md" onPress={noop} />
            <AudioButton size="lg" onPress={noop} />
          </Row>
        ),
      },
    ],
  },
};
