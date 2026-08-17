/**
 * @fileoverview Phase 0 spike — does React Native render uchen Tibetan correctly?
 *
 * THROWAWAY. Its output is an answer, not code we keep. Every design-system
 * component depends on these results, so this runs before any of them is ported.
 *
 * Sections 1-6 deliberately use plain StyleSheet rather than Uniwind classNames,
 * so that a rendering failure is attributable to the platform's text engine and
 * not to the styling library. Section 7 is the only Uniwind check.
 *
 * Tibetan specimens are real records from content/vocabulary.json — never invented
 * strings, because a hand-typed stack can be malformed in ways a real record is not.
 */
import {ScrollView, StyleSheet, Text, View, Platform, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useState} from 'react';

import {
  color,
  elevation,
  fontFamily,
  fontSize,
  layout,
  leading,
  radius,
  tracking,
} from '../src/theme/tokens.generated';

// Reading families, colours and lengths from the generated module rather than as
// literals doubles as a check that the token pipeline emits usable values.
const TIBETAN = fontFamily.tibetanRegular;
const TIBETAN_MEDIUM = fontFamily.tibetanMedium;
const BODY = fontFamily.bodyRegular;
const BODY_ITALIC = fontFamily.bodyMediumItalic;
const DISPLAY = fontFamily.displayExtrabold;

/**
 * `--tracking-caps` is 0.08em, and React Native measures letterSpacing in points,
 * so the em has to be resolved against the size of the role using it. This is the
 * conversion the generated `tracking` group documents but cannot perform.
 */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

const buttonLabel = {
  color: color.textOnAccent,
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.md,
} as const;

/** Zero-width space. Tibetan may only break after the tsheg (་), never mid-syllable. */
const ZWSP = '​';
const TSHEG = '་';

/** The design system's Tibetan size ramp, straight from the generated tokens. */
const TIB_SIZES = [
  ['xs', fontSize.tibXs],
  ['sm', fontSize.tibSm],
  ['md', fontSize.tibMd],
  ['lg', fontSize.tibLg],
  ['xl', fontSize.tibXl],
  ['hero', fontSize.tibHero],
] as const;

const LEADING_TIBETAN = leading.tibetan;

/**
 * A line letter is a position the eye reads, not a character: a base consonant plus
 * anything subjoined to it and any vowel mark is ONE line letter. The `letters`
 * count is what the rendered glyph must visually show.
 */
const STACKS = [
  {bo: 'བསྒྲིབས', letters: 4, note: 'བ · སྒྲི · བ · ས — a 3-deep stack'},
  {bo: 'ཧྲཱིཿ', letters: 1, note: 'subjoined ྲ + long vowel + visarga'},
  {bo: 'ཀྲ', letters: 1, note: 'plain subjoined ྲ'},
  {bo: 'སྐུ', letters: 1, note: 'superscript ས + ཀ + vowel ུ'},
  {bo: 'སྤྱི', letters: 1, note: 'ས + པ + subjoined ྱ + vowel ི'},
] as const;

/** Real vocabulary records — multi-syllable, stack-heavy, for breaking and leading. */
const PHRASES = [
  {bo: 'བཀྲ་ཤིས་བདེ་ལེགས', roman: 'trashi delek', en: 'hello / greetings'},
  {bo: 'སྤྱི་སྤྱོད་རླངས་འཁོར', roman: 'chi chö lang khor', en: 'bus'},
  {bo: 'བརྩོན་འགྲུས་ཆེན་པོ', roman: 'tsöndrü chhenpo', en: 'hardworking / diligent'},
  {bo: 'དུས་ཚོད་ཀྱི་རེའུ་མིག', roman: 'thüütshö ki reumik', en: 'timetable'},
] as const;

/** Inserts a break opportunity after every tsheg and nowhere else. */
function tshegBreaks(text: string): string {
  return text.split(TSHEG).join(TSHEG + ZWSP);
}

function Section({n, title, asks, children}: {
  n: number;
  title: string;
  asks: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{`${n}. ${title}`}</Text>
      <Text style={styles.asks}>{asks}</Text>
      {children}
    </View>
  );
}

export default function TibetanSpike() {
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 48,
        paddingHorizontal: 20,
      }}>
      <Text style={styles.h1}>Tibetan rendering spike</Text>
      <Text style={styles.meta}>
        {`platform: ${Platform.OS}  ·  RN 0.86.2  ·  Noto Serif Tibetan 400/500/700`}
      </Text>

      <Section
        n={1}
        title="Stacks"
        asks="Does each specimen render as ONE stacked unit with the stated line-letter count? A broken shaper shows subjoined letters side by side instead of below.">
        {STACKS.map(s => (
          <View key={s.bo} style={styles.stackRow}>
            <View style={styles.tintBox}>
              <Text style={{fontFamily: TIBETAN, fontSize: 68, lineHeight: 68 * LEADING_TIBETAN}}>
                {s.bo}
              </Text>
            </View>
            <View style={styles.stackMeta}>
              <Text style={styles.label}>{`${s.letters} line letter${s.letters > 1 ? 's' : ''}`}</Text>
              <Text style={styles.note}>{s.note}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section
        n={2}
        title="Leading 2.1 — clipping"
        asks="The tinted box is the Text's own box. Any glyph crossing the tint edge is being clipped. Compare each size against the no-lineHeight control below it.">
        {TIB_SIZES.map(([name, size]) => (
          <View key={name} style={styles.leadingRow}>
            <Text style={styles.label}>{`tib-${name}  ${size}px  ·  lineHeight ${Math.round(size * LEADING_TIBETAN)}`}</Text>
            <View style={styles.tintBox}>
              <Text style={{fontFamily: TIBETAN, fontSize: size, lineHeight: size * LEADING_TIBETAN}}>
                {'བསྒྲིབས ཧྲཱིཿ སྐུ'}
              </Text>
            </View>
            <Text style={styles.label}>{`tib-${name}  ${size}px  ·  no lineHeight (control)`}</Text>
            <View style={styles.tintBoxAlt}>
              <Text style={{fontFamily: TIBETAN, fontSize: size}}>{'བསྒྲིབས ཧྲཱིཿ སྐུ'}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section
        n={3}
        title="Tsheg-only line breaking"
        asks="Both columns are 140px wide. The RIGHT column has a zero-width space after every tsheg. It must break ONLY at tsheg boundaries; the left is the untreated control.">
        <View style={styles.breakRow}>
          <View style={styles.breakCol}>
            <Text style={styles.label}>raw (control)</Text>
            {PHRASES.map(p => (
              <View key={p.bo} style={styles.tintBox}>
                <Text style={{fontFamily: TIBETAN, fontSize: 22, lineHeight: 22 * LEADING_TIBETAN}}>
                  {p.bo}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.breakCol}>
            <Text style={styles.label}>with ZWSP after tsheg</Text>
            {PHRASES.map(p => (
              <View key={p.bo} style={styles.tintBox}>
                <Text style={{fontFamily: TIBETAN, fontSize: 22, lineHeight: 22 * LEADING_TIBETAN}}>
                  {tshegBreaks(p.bo)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section
        n={4}
        title="fontWeight vs per-weight family"
        asks="Rows A and B ask for a heavier face two different ways. If A looks identical to the regular control, React Native is ignoring fontWeight and every weight must be addressed by family name — which decides how the composed --type-* tokens are emitted.">
        <Text style={styles.label}>control · tibetanRegular, no fontWeight</Text>
        <View style={styles.tintBox}>
          <Text
            style={{
              fontFamily: TIBETAN,
              fontSize: fontSize.tibXl,
              lineHeight: fontSize.tibXl * LEADING_TIBETAN,
            }}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
        <Text style={styles.label}>A · tibetanRegular + fontWeight 500</Text>
        <View style={styles.tintBox}>
          <Text
            style={{
              fontFamily: TIBETAN,
              fontWeight: '500',
              fontSize: fontSize.tibXl,
              lineHeight: fontSize.tibXl * LEADING_TIBETAN,
            }}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
        <Text style={styles.label}>B · tibetanMedium, no fontWeight</Text>
        <View style={styles.tintBox}>
          <Text
            style={{
              fontFamily: TIBETAN_MEDIUM,
              fontSize: fontSize.tibXl,
              lineHeight: fontSize.tibXl * LEADING_TIBETAN,
            }}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
      </Section>

      <Section
        n={5}
        title="letterSpacing is px, not em"
        asks="--tracking-caps is 0.08em, which at 12px is 0.96px. --tracking-tibetan is 0 and must stay 0: letter-spacing breaks stacks.">
        <Text style={styles.label}>{`Latin label · ${fontSize['2xs']}px · letterSpacing ${CAPS_TRACKING}`}</Text>
        <Text
          style={{
            fontFamily: fontFamily.bodyBold,
            fontSize: fontSize['2xs'],
            letterSpacing: CAPS_TRACKING,
            textTransform: 'uppercase',
          }}>
          days walking
        </Text>
        <Text style={styles.label}>Tibetan · letterSpacing 2 — EXPECTED TO LOOK WRONG</Text>
        <View style={styles.tintBox}>
          <Text style={{fontFamily: TIBETAN, fontSize: fontSize.tibXl, letterSpacing: 2}}>
            {'བསྒྲིབས'}
          </Text>
        </View>
      </Section>

      <Section
        n={6}
        title="The keycap edge"
        asks="The design system's button is a solid 4px bottom edge that compresses to 2px when pressed. A uses RN boxShadow; B stacks two Views. Press each.">
        <Pressable
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={{
            height: layout.touchMin,
            borderRadius: radius.pill,
            backgroundColor: color.surfaceAccent,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 ${pressed ? elevation.edgeDepthPressed : elevation.edgeDepth}px 0 0 ${color.teal800}`,
            transform: [{translateY: pressed ? 2 : 0}],
            marginBottom: 8 + (pressed ? 2 : 0),
          }}>
          <Text style={buttonLabel}>A · boxShadow</Text>
        </Pressable>
        <View
          style={{
            backgroundColor: color.teal800,
            borderRadius: radius.pill,
            paddingBottom: elevation.edgeDepth,
          }}>
          <View
            style={{
              height: layout.touchMin,
              borderRadius: radius.pill,
              backgroundColor: color.surfaceAccent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={buttonLabel}>B · two Views</Text>
          </View>
        </View>
      </Section>

      <Section
        n={7}
        title="Uniwind"
        asks="Does className work at all, and does an arbitrary unitless leading resolve against font size? If leading-[2.1] does not match the StyleSheet control, the token pipeline must emit computed px line-heights.">
        <Text className="text-base font-bold text-teal-700">
          className works if this is bold and teal
        </Text>
        <Text style={styles.label}>control · StyleSheet lineHeight 22 × 2.1 = 46.2</Text>
        <View style={styles.tintBox}>
          <Text style={{fontFamily: TIBETAN, fontSize: 22, lineHeight: 22 * LEADING_TIBETAN}}>
            {tshegBreaks('བཀྲ་ཤིས་བདེ་ལེགས')}
          </Text>
        </View>
        <Text style={styles.label}>{'uniwind · text-[22px] leading-[2.1]'}</Text>
        <View style={styles.tintBox}>
          <Text
            className="text-[22px] leading-[2.1]"
            style={{fontFamily: TIBETAN}}>
            {tshegBreaks('བཀྲ་ཤིས་བདེ་ལེགས')}
          </Text>
        </View>

        <Text style={styles.label}>
          generated theme · type-tibetan (family, size and leading all from the token)
        </Text>
        <View style={styles.tintBox}>
          <Text className="type-tibetan">{tshegBreaks('བཀྲ་ཤིས་བདེ་ལེགས')}</Text>
        </View>

        <Text style={styles.label}>generated theme · type-heading text-fg-heading</Text>
        <Text className="type-heading text-fg-heading">Gabarito bold, 22px</Text>

        <Text style={styles.label}>generated theme · bg-surface-accent-soft rounded-card p-4</Text>
        <View className="bg-surface-accent-soft rounded-card p-4">
          <Text className="type-body text-fg-accent">a card fill and radius from tokens</Text>
        </View>
      </Section>

      <Section
        n={8}
        title="The naming triple"
        asks="Tibetan, then the romanization, then the English gloss — the order the design system requires everywhere. Checks the italic medium face resolves.">
        {PHRASES.map(p => (
          <View key={p.bo} style={{marginBottom: 16}}>
            <View style={styles.tintBox}>
              <Text style={{fontFamily: TIBETAN, fontSize: 30, lineHeight: 30 * LEADING_TIBETAN}}>
                {tshegBreaks(p.bo)}
              </Text>
            </View>
            <Text style={{fontFamily: BODY_ITALIC, fontSize: fontSize.md, color: color.textAccent}}>
              {p.roman}
            </Text>
            <Text style={{fontFamily: BODY, fontSize: fontSize.md, color: color.textMuted}}>
              {p.en}
            </Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: color.surfaceApp},
  h1: {fontFamily: DISPLAY, fontSize: fontSize['2xl'], color: color.textHeading},
  meta: {fontFamily: BODY, fontSize: fontSize['2xs'], color: color.textMuted, marginBottom: 24},
  section: {
    backgroundColor: color.surfaceCard,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.lg,
    color: color.textHeading,
  },
  asks: {
    fontFamily: BODY,
    fontSize: fontSize.xs,
    color: color.ink500,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontFamily: fontFamily.bodySemibold,
    fontSize: fontSize['3xs'],
    color: color.textMuted,
    marginTop: 12,
    marginBottom: 4,
  },
  note: {fontFamily: BODY, fontSize: fontSize['2xs'], color: color.textSubtle},
  // A visible box around the Text so a clipped glyph is obvious.
  tintBox: {backgroundColor: color.surfaceAccentSoft, alignSelf: 'flex-start', marginBottom: 4},
  tintBoxAlt: {backgroundColor: color.surfaceAlert, alignSelf: 'flex-start', marginBottom: 4},
  stackRow: {flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12},
  stackMeta: {flex: 1},
  leadingRow: {marginBottom: 8},
  breakRow: {flexDirection: 'row', gap: 16},
  breakCol: {width: 140},
});
