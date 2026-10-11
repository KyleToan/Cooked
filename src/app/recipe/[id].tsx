import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { PushedHeader, SectionHeader } from '@/components/Header';
import { ToBuyToggle } from '@/components/ListRows';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { isUseSoon, PLACE_LABEL, recipeMeta } from '@/data/helpers';
import { matches, usedWhenMade } from '@/data/match';
import { STAPLES } from '@/data/seed';
import { useStore, useUndo } from '@/data/store';
import { color, radius, size, space } from '@/theme';

const PHOTO_HEIGHT = 200;

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useStore();
  const recipe = state.recipes.find((r) => r.id === id);
  const made = useUndo(`recipe:${id}`);
  // A photo that won't load hides its block rather than leaving a grey box.
  const [photoFailed, setPhotoFailed] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/recipes'));

  if (!recipe) {
    return (
      <Screen>
        <PushedHeader
          title="Recipe not found"
          onBack={back}
          backLabel="Back to recipes"
          below={
            <Text color="inkMuted">It may have been deleted by someone in your kitchen.</Text>
          }
        />
        <TextLink label="Back to recipes" onPress={back} />
      </Screen>
    );
  }

  const soon = state.items.filter(isUseSoon);
  const isSoon = (name: string) => soon.some((i) => matches(name, i.name));
  // Counted from the kitchen as it was before "I made this", so the number doesn't shrink after.
  const used = usedWhenMade(recipe, made?.snapshot.items ?? state.items, STAPLES).length;
  const canMake = recipe.ingredients.length > 0;

  const footer = canMake ? (
    <>
      {made ? (
        <View accessibilityRole="alert" style={styles.made}>
          <Text variant="button" style={styles.grow}>
            Took {used} things out of your kitchen
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel="Undo: I made this" onPress={actions.undo} style={styles.undo}>
            <Text variant="button" weight="semibold" color="sageInk">
              Undo
            </Text>
          </Tap>
        </View>
      ) : (
        <ActionPill label="I made this" variant="primary" height="bottom" onPress={() => actions.madeRecipe(recipe.id)} />
      )}
      <Text variant="micro" color="inkMuted" weight="regular" style={styles.center}>
        {made ? 'Oil and spices stay in the pantry.' : 'We’ll take what you used out of your kitchen.'}
      </Text>
    </>
  ) : undefined;

  return (
    <Screen footer={footer} gap={space.s5 + 2}>
      <PushedHeader
        title={recipe.title}
        onBack={() => router.back()}
        backLabel="Back to recipes"
        below={
          <Text variant="caption" color="inkMuted">
            {recipeMeta(recipe)}
          </Text>
        }
      />

      {recipe.photo && !photoFailed ? (
        <Image
          source={{ uri: recipe.photo }}
          contentFit="cover"
          transition={150}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Photo of ${recipe.title}`}
          onError={() => setPhotoFailed(true)}
          style={styles.photo}
        />
      ) : null}

      {recipe.missing.length ? (
        <View style={styles.list}>
          <SectionHeader
            title="Missing"
            right={
              <ToBuyToggle
                added={recipe.onToBuy}
                count={recipe.missing.length}
                addedLabel="On To Buy"
                icon={false}
                onPress={() => actions.toggleRecipeToBuy(recipe.id)}
              />
            }
          />
          {recipe.missing.map((m) => (
            <View key={m} style={styles.row}>
              <View style={styles.grow}>
                <Text>{m}</Text>
                {recipe.onToBuy ? (
                  <Text variant="caption" weight="semibold" color="sageInk">
                    On To Buy
                  </Text>
                ) : null}
              </View>
              <Amount value={recipe.missingAmounts?.[m]} />
            </View>
          ))}
        </View>
      ) : null}

      {recipe.ingredients.length ? (
        <View style={styles.list}>
          <SectionHeader title="You have" />
          {recipe.ingredients.map((g) => (
            <View key={g.name} style={styles.row}>
              <View style={styles.grow}>
                <Text>{g.name}</Text>
                <Text variant="caption" color="inkMuted">
                  {PLACE_LABEL[g.place]}
                  {isSoon(g.name) ? (
                    <Text variant="caption" weight="semibold" color="bronzeInk">
                      {' · Use soon'}
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Amount value={g.amount} />
            </View>
          ))}
        </View>
      ) : null}

      {recipe.steps.length || recipe.url ? (
        <View style={styles.steps}>
          {recipe.steps.length ? <SectionHeader title="Steps" /> : null}
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNo}>{i + 1}.</Text>
              <Text style={styles.grow}>{step}</Text>
            </View>
          ))}
          {recipe.url ? (
            <TextLink label={recipe.sourceLink} onPress={() => Linking.openURL(recipe.url!)} />
          ) : (
            <Text variant="caption" color="inkMuted">
              {recipe.sourceLink}
            </Text>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

/** How much the recipe uses, on the right of an ingredient row. */
function Amount({ value }: { value?: string }) {
  return value ? (
    <Text color="inkMuted" style={styles.amount}>
      {value}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 1 },
  center: { textAlign: 'center' },
  photo: {
    height: PHOTO_HEIGHT,
    borderRadius: radius.field,
    overflow: 'hidden',
  },
  list: { gap: space.s1 },
  row: {
    minHeight: size.rowHeight,
    paddingVertical: space.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  amount: { flexShrink: 0, maxWidth: '45%', textAlign: 'right' },
  steps: { gap: space.s3 },
  step: { flexDirection: 'row', gap: space.s2 },
  stepNo: { minWidth: space.s5 },
  made: {
    minHeight: size.controlHeight + space.s1,
    paddingVertical: space.s1,
    paddingLeft: space.s4 + 2,
    paddingRight: space.s1 + 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
  },
  undo: { minHeight: size.targetMin, paddingHorizontal: space.s3 + 2, justifyContent: 'center' },
});
