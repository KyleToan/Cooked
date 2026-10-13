import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { FilterPills } from '@/components/Controls';
import { GreetingHeader, SectionHeader } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { RecipeRow } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { BigNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { canMakeNow } from '@/data/helpers';
import { useStore } from '@/data/store';
import type { Recipe } from '@/data/types';
import { size, space } from '@/theme';

type Filter = 'all' | 'now' | 'almost' | 'imported';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'now', label: 'Can make now' },
  { value: 'almost', label: 'Missing 1 or 2' },
  { value: 'imported', label: 'Imported' },
];

const passes = (r: Recipe, f: Filter) => {
  const miss = r.need - r.have;
  return f === 'all' || (f === 'now' && miss === 0) || (f === 'almost' && miss > 0 && miss <= 2) || (f === 'imported' && r.imported);
};

export default function Recipes() {
  const router = useRouter();
  const { state, actions } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // `/recipes?q=spinach` (Find a recipe that uses it) fills the search, and shows every recipe it's in.
  const { q: param } = useLocalSearchParams<{ q?: string }>();
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (param !== seenParam) {
    setSeenParam(param);
    if (param !== undefined) {
      setQuery(param);
      setFilter('all');
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
  const shown = recipes.filter((r) => r !== tonight && passes(r, filter) && matches(r));
  const tonightShown = Boolean(tonight && matches(tonight));
  const noneMatch = recipes.length > 0 && shown.length === 0 && !(tonightShown && passes(tonight!, filter));
  const clear = () => {
    setFilter('all');
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

      <View style={styles.searchRow}>
        <View style={styles.grow}>
          <SearchField placeholder="Search recipes or an ingredient" value={query} onChangeText={setQuery} />
        </View>
        <ActionPill label="Import" icon="import" height="header" onPress={() => router.push('/import')} />
      </View>

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
        <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
        <View>
          {shown.map((r) => (
            <RecipeRow key={r.id} recipe={r} onOpen={() => open(r.id)} onToggleToBuy={() => actions.toggleRecipeToBuy(r.id)} />
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
              <Text color="inkMuted">{filter === 'now' && !q ? 'Nothing you can make right now.' : 'No recipes match.'}</Text>
              <TextLink label="Clear filters" onPress={clear} />
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  tonight: { gap: space.cozy },
  soonLine: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  cook: { marginTop: space.s1 },
  list: { gap: space.tight },
  empty: { paddingVertical: space.s4 + 2, minHeight: size.rowHeight, gap: space.s3 },
});
