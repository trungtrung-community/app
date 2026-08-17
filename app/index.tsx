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

const TIBETAN = 'NotoSerifTibetan_400Regular';
const TIBETAN_BOLD = 'NotoSerifTibetan_700Bold';
const BODY = 'PlusJakartaSans_400Regular';
const BODY_ITALIC = 'PlusJakartaSans_500Medium_Italic';
const DISPLAY = 'Gabarito_800ExtraBold';

/** Zero-width space. Tibetan may only break after the tsheg (་), never mid-syllable. */
const ZWSP = '​';
const TSHEG = '་';

/** The design system's Tibetan size ramp, rem resolved at 16px. */
const TIB_SIZES = [
  ['xs', 14],
  ['sm', 17],
  ['md', 22],
  ['lg', 30],
  ['xl', 44],
  ['hero', 68],
] as const;

const LEADING_TIBETAN = 2.1;

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
        asks="Rows A and B request bold two different ways. If A looks identical to the regular control, React Native is ignoring fontWeight and every weight must be addressed by family name — which decides how the composed --type-* tokens are emitted.">
        <Text style={styles.label}>control · 400Regular family, no fontWeight</Text>
        <View style={styles.tintBox}>
          <Text style={{fontFamily: TIBETAN, fontSize: 44, lineHeight: 44 * LEADING_TIBETAN}}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
        <Text style={styles.label}>A · 400Regular family + fontWeight 700</Text>
        <View style={styles.tintBox}>
          <Text
            style={{
              fontFamily: TIBETAN,
              fontWeight: '700',
              fontSize: 44,
              lineHeight: 44 * LEADING_TIBETAN,
            }}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
        <Text style={styles.label}>B · 700Bold family, no fontWeight</Text>
        <View style={styles.tintBox}>
          <Text style={{fontFamily: TIBETAN_BOLD, fontSize: 44, lineHeight: 44 * LEADING_TIBETAN}}>
            {'བཀྲ་ཤིས'}
          </Text>
        </View>
      </Section>

      <Section
        n={5}
        title="letterSpacing is px, not em"
        asks="--tracking-caps is 0.08em, which at 12px is 0.96px. --tracking-tibetan is 0 and must stay 0: letter-spacing breaks stacks.">
        <Text style={styles.label}>Latin label · 12px · letterSpacing 0.96</Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 12,
            letterSpacing: 0.96,
            textTransform: 'uppercase',
          }}>
          days walking
        </Text>
        <Text style={styles.label}>Tibetan · letterSpacing 2 — EXPECTED TO LOOK WRONG</Text>
        <View style={styles.tintBox}>
          <Text style={{fontFamily: TIBETAN, fontSize: 44, letterSpacing: 2}}>{'བསྒྲིབས'}</Text>
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
            height: 48,
            borderRadius: 999,
            backgroundColor: '#1F8A90',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 ${pressed ? 2 : 4}px 0 0 #12595E`,
            transform: [{translateY: pressed ? 2 : 0}],
            marginBottom: 8 + (pressed ? 2 : 0),
          }}>
          <Text style={{color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16}}>
            A · boxShadow
          </Text>
        </Pressable>
        <View style={{backgroundColor: '#12595E', borderRadius: 999, paddingBottom: 4}}>
          <View
            style={{
              height: 48,
              borderRadius: 999,
              backgroundColor: '#1F8A90',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16}}>
              B · two Views
            </Text>
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
            <Text style={{fontFamily: BODY_ITALIC, fontSize: 16, color: '#196F74'}}>{p.roman}</Text>
            <Text style={{fontFamily: BODY, fontSize: 16, color: '#6B838B'}}>{p.en}</Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#EDF2F3'},
  h1: {fontFamily: DISPLAY, fontSize: 28, color: '#12222A'},
  meta: {fontFamily: BODY, fontSize: 12, color: '#6B838B', marginBottom: 24},
  section: {backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20},
  sectionTitle: {fontFamily: 'Gabarito_700Bold', fontSize: 20, color: '#12222A'},
  asks: {fontFamily: BODY, fontSize: 13, color: '#4E666E', marginTop: 4, marginBottom: 16},
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#6B838B',
    marginTop: 12,
    marginBottom: 4,
  },
  note: {fontFamily: BODY, fontSize: 12, color: '#8DA2A8'},
  // A visible box around the Text so a clipped glyph is obvious.
  tintBox: {backgroundColor: '#DCF0F1', alignSelf: 'flex-start', marginBottom: 4},
  tintBoxAlt: {backgroundColor: '#FBE3E1', alignSelf: 'flex-start', marginBottom: 4},
  stackRow: {flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12},
  stackMeta: {flex: 1},
  leadingRow: {marginBottom: 8},
  breakRow: {flexDirection: 'row', gap: 16},
  breakCol: {width: 140},
});
