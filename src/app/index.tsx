// Temporary first screen: shows every token, type style and icon so you can
// check the theme on a real phone. Replace it with Home (design/screens,
// AppHome) when you start building screens.

import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { iconData, type IconName } from '@/components/icon-data';
import { Text } from '@/components/Text';
import { color, radius, shadow, space, type, type ColorName, type TypeName } from '@/theme';

const SAMPLES: Record<TypeName, string> = {
  titleXl: 'Cooked',
  titleLg: 'What’s your email?',
  sectionTitle: 'Your Kitchen',
  greeting: 'Good evening, Alex',
  body: 'Tomatoes',
  button: 'Import recipe',
  link: 'See all 6',
  caption: '2 of 6 done',
  micro: 'Added by Sam',
  noteTitle: 'Fridge',
  noteBody: '8 items',
};

const NOTES: { label: string; count: string; paper: ColorName; tilt: string; flag?: string }[] = [
  { label: 'Fridge', count: '8 items', paper: 'cornsilk', tilt: '-2.5deg', flag: '2 use soon' },
  { label: 'Pantry', count: '6 items', paper: 'papaya', tilt: '1.5deg' },
  { label: 'Freezer', count: '4 items', paper: 'beige', tilt: '-1deg' },
];

export default function ThemeCheck() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: color.surface }}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + space.s5, paddingBottom: insets.bottom + 48 }]}
    >
      <View style={styles.header}>
        <Text variant="greeting" color="inkMuted">
          Theme check, before Home is built
        </Text>
        <Text variant="titleXl">Cooked</Text>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Your Kitchen</Text>
        <View style={styles.notes}>
          {NOTES.map((n) => (
            <View key={n.label} style={[styles.note, { backgroundColor: color[n.paper], transform: [{ rotate: n.tilt }] }]}>
              <View style={styles.tape} />
              <Text variant="noteTitle" color="noteInk">
                {n.label}
              </Text>
              <Text variant="noteBody" color="noteInkSoft">
                {n.count}
              </Text>
              {n.flag ? (
                <Text variant="noteBody" color="bronzeInk" style={styles.flag}>
                  {n.flag}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Buttons</Text>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: color.sage }]}>
            <Icon name="scan" size={18} />
            <Text variant="button" style={{ fontFamily: type.link.fontFamily }}>
              Scan a receipt
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: color.surfaceSunken }]}>
            <Icon name="import" size={18} color="sageInk" />
            <Text variant="button">Import recipe</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Type</Text>
        <View>
          {(Object.keys(SAMPLES) as TypeName[]).map((name) => (
            <View key={name} style={styles.row}>
              <Text variant={name} numberOfLines={1} style={styles.rowMain}>
                {SAMPLES[name]}
              </Text>
              <Text variant="micro" color="inkMuted">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Colors</Text>
        <View>
          {(Object.keys(color) as ColorName[]).map((name) => (
            <View key={name} style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: color[name] }]} />
              <Text style={styles.rowMain}>{name}</Text>
              <Text variant="caption" color="inkMuted">
                {color[name]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Icons</Text>
        <View style={styles.icons}>
          {(Object.keys(iconData) as IconName[]).map((name) => (
            <View key={name} style={styles.iconCell}>
              <Icon name={name} />
              <Text variant="micro" color="inkMuted">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.s5, gap: space.section },
  header: { gap: space.s1 },
  section: { gap: space.s3 },
  notes: { flexDirection: 'row', gap: space.s3, paddingTop: 10, paddingHorizontal: 2 },
  note: {
    flex: 1,
    height: 116,
    paddingTop: 14,
    paddingHorizontal: space.s3,
    paddingBottom: 10,
    gap: space.s2,
    borderTopLeftRadius: radius.note,
    borderTopRightRadius: radius.note,
    borderBottomLeftRadius: radius.note,
    borderBottomRightRadius: 14,
    ...shadow.note,
  },
  tape: {
    position: 'absolute',
    top: -8,
    left: '50%',
    width: 40,
    height: 15,
    marginLeft: -20,
    transform: [{ rotate: '-3deg' }],
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(26,26,24,0.06)',
  },
  flag: {
    marginTop: 'auto',
    fontFamily: type.noteTitle.fontFamily,
    fontSize: 18,
    textDecorationLine: 'underline',
    textDecorationColor: color.bronze,
  },
  pills: { flexDirection: 'row', gap: space.s3 },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  rowMain: { flex: 1 },
  swatch: { width: 28, height: 28, borderRadius: radius.check, borderWidth: 1, borderColor: color.line },
  icons: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.s4 },
  iconCell: { width: '20%', alignItems: 'center', gap: space.s2 },
});
