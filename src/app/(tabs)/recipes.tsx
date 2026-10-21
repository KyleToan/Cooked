import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { SyncNotice } from '@/components/Controls';
import { GreetingHeader, SectionHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { RecipeRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { BigNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { canMakeNow, sortRecipes, type RecipeSort } from '@/data/helpers';
import { ranked, scores } from '@/data/ranking';
import { useStore } from '@/data/store';
import type { Recipe } from '@/data/types';
import { haptics } from '@/hooks/haptics';
import { makeStyles, radius, size, space } from '@/theme';

type Filter = 'now' | 'almost';

const SORTS: { value: RecipeSort; label: string }[] = [
  { value: 'rank', label: 'Your ranking' },
  { value: 'az', label: 'A to Z' },
  { value: 'newest', label: 'Newest' },
];
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'now', label: 'Can make now' },
  { value: 'almost', label: 'Missing 1 or 2' },
];

/** None ticked shows every recipe; ticked ones add up (either can show it). */
const passes = (r: Recipe, fs: Filter[]) => {
  const miss = r.need - r.have;
  return !fs.length || fs.some((f) => (f === 'now' ? miss === 0 : miss > 0 && miss <= 2));
};

export default function Recipes() {
  const styles = useStyles();
  const router = useRouter();
  const { state, actions, sync } = useStore();
  const [filter, setFilter] = useState<Filter[]>([]);
  const [sort, setSort] = useState<RecipeSort>('rank');
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState('');
  // `/recipes?q=spinach` (Find a recipe that uses it) fills the search, and shows every recipe it's in.
  const { q: param } = useLocalSearchParams<{ q?: string }>();
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (param !== seenParam) {
    setSeenParam(param);
    if (param !== undefined) {
      setQuery(param);
      setFilter([]);
    }
  }

  const recipes = state.recipes;
  const tonight = recipes.find((r) => r.tonight);
  const q = query.trim().toLowerCase();
  const matches = (r: Recipe) =>
    !q ||
    r.title.toLowerCase().includes(q) ||
    r.ingredients.some((g) => g.name.toLowerCase().includes(q)) ||
    r.missing.some((m) => m.toLowerCase().includes(q));
  const ids = recipes.map((r) => r.id);
  const score = scores(state.ranks, ids);
  const shown = sortRecipes(recipes, sort, ranked(state.ranks, ids)).filter((r) => r !== tonight && passes(r, filter) && matches(r));
  const changed = sort !== 'rank' || filter.length > 0;
  const tonightShown = Boolean(tonight && matches(tonight));
  const noneMatch = recipes.length > 0 && shown.length === 0 && !(tonightShown && passes(tonight!, filter));
  const clear = () => {
    setFilter([]);
    setQuery('');
    if (param) router.setParams({ q: undefined });
  };
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const tonightMeta = tonight
    ? [tonight.time, tonight.servings, tonight.missing.length ? `you have ${tonight.have} of ${tonight.need}` : `you have all ${tonight.need} things`].filter(Boolean).join(' · ')
    : '';

  return (
    <Screen island top="tab">
      <GreetingHeader
        line={`${recipes.length} saved · ${recipes.filter(canMakeNow).length} you can make now`}
        title="Recipes"
        onAccount={() => router.push('/account')}
      />

      <SyncNotice problem={sync.problem} onRetry={sync.retry} />

      <SearchField placeholder="Search recipes or an ingredient" value={query} onChangeText={setQuery} />

      {tonight && tonightShown ? (
        <View style={styles.tonight}>
          <SectionHeader title="Tonight" />
          {/* The whole note is one link (one VoiceOver stop); See recipe stays as its visible button. */}
          <BigNote
            paper="cornsilk"
            tilt={-0.8}
            onPress={() => open(tonight.id)}
            accessibilityLabel={[tonight.title, tonightMeta, tonight.tonight].filter(Boolean).join(', ')}
          >
            <Text variant="noteTitle" color="noteInk">
              {tonight.title}
            </Text>
            <Text variant="caption" color="noteInkSoft">
              {tonightMeta}
            </Text>
            <View style={styles.soonLine}>
              <Icon name="use-soon" size={16} color="bronzeInk" />
              <Text variant="body" color="noteInk" style={styles.grow}>
                {tonight.tonight}
              </Text>
            </View>
            <View style={styles.cook}>
              <ActionPill label="See recipe" variant="primary" icon="cooking" height="header" onPress={() => open(tonight.id)} />
            </View>
          </BigNote>
        </View>
      ) : null}

      <View style={styles.list}>
        <View style={styles.tools}>
          <ActionPill label="Import" icon="import" fill onPress={() => router.push('/import')} />
          {/* The dot says a sort or filter other than the default is on. */}
          <Tap
            accessibilityRole="button"
            accessibilityLabel={`Sort and filter${changed ? ', on' : ''}`}
            onPress={() => setSheet(true)}
            style={styles.filterButton}
          >
            <Icon name="filter" size={size.iconSm} color="sageInk" />
            {changed ? <View style={styles.dot} /> : null}
          </Tap>
        </View>
        <View>
          {shown.map((r) => (
            <RecipeRow key={r.id} recipe={r} score={score.get(r.id)} onOpen={() => open(r.id)} onToggleToBuy={() => actions.toggleRecipeToBuy(r.id)} />
          ))}
          {recipes.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="caption" color="inkMuted">
                Nothing here yet. Import a recipe and we’ll check it against your kitchen.
              </Text>
              <ActionPill label="Import a recipe" variant="primary" icon="import" height="header" onPress={() => router.push('/import')} />
            </View>
          ) : noneMatch ? (
            <View style={styles.empty}>
              <Text color="inkMuted">
                {filter.length === 1 && filter[0] === 'now' && !q
                  ? 'Nothing you can make right now.'
                  : 'No recipes match.'}
              </Text>
              <TextLink label="Clear filters" onPress={clear} />
            </View>
          ) : null}
        </View>
      </View>
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Sort and filter">
        <View>
          <Text variant="caption" color="inkMuted">
            Sort by
          </Text>
          {SORTS.map((o) => (
            <CheckRow key={o.value} label={o.label} role="radio" on={sort === o.value} onPress={() => setSort(o.value)} />
          ))}
        </View>
        <View>
          <Text variant="caption" color="inkMuted">
            Show
          </Text>
          {FILTERS.map((o) => (
            <CheckRow
              key={o.value}
              label={o.label}
              role="checkbox"
              on={filter.includes(o.value)}
              onPress={() => setFilter((fs) => (fs.includes(o.value) ? fs.filter((f) => f !== o.value) : [...fs, o.value]))}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

/** A choice in the sheet: its label, and a check when picked. */
function CheckRow({ label, on, onPress, role }: { label: string; on: boolean; onPress: () => void; role: 'radio' | 'checkbox' }) {
  const styles = useStyles();
  return (
    <Tap
      accessibilityRole={role}
      accessibilityState={{ checked: on }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={styles.checkRow}
    >
      <Text weight={on ? 'semibold' : undefined}>{label}</Text>
      {on ? <Icon name="check" size={size.iconSm} color="sageInk" /> : null}
    </Tap>
  );
}

const useStyles = makeStyles((color) => ({
  grow: { flex: 1 },
  tonight: { gap: space.cozy },
  soonLine: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  cook: { marginTop: space.s1 },
  list: { gap: space.tight },
  tools: { flexDirection: 'row', gap: space.s3 },
  filterButton: {
    width: size.controlHeight,
    height: size.controlHeight,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceSunken,
  },
  dot: { position: 'absolute', top: space.s2, right: space.s2, width: 8, height: 8, borderRadius: 4, backgroundColor: color.sageInk },
  checkRow: {
    minHeight: size.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  empty: { paddingVertical: space.s4 + 2, minHeight: size.rowHeight, gap: space.s3 },
}));
