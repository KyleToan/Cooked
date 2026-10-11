import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { ErrorLine, Segmented } from '@/components/Controls';
import { CookingLoader } from '@/components/Loader';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { useGoToTab } from '@/hooks/useGoToTab';
import { IMPORT_FOUND, SHAKSHUKA } from '@/data/seed';
import { useStore } from '@/data/store';
import { color, radius, size, space, type } from '@/theme';

type Mode = 'link' | 'text';
type Step = 'edit' | 'loading' | 'done' | 'error';

/** How long the fake import "reads" the page. */
const READ_MS = 1800;
const TEXT_HEIGHT = 132;

/** Lines that look like ingredients: they start with an amount or a bullet. */
const ingredientLines = (text: string) => text.split('\n').filter((l) => /^\s*([0-9½¼¾]|[-•*])/.test(l)).length;

export default function Import() {
  const router = useRouter();
  const goToTab = useGoToTab();
  const params = useLocalSearchParams<{ step?: string }>();
  const { state, actions } = useStore();

  const [mode, setMode] = useState<Mode>('link');
  const [step, setStep] = useState<Step>(params.step === 'error' ? 'error' : 'edit');
  const [link, setLink] = useState(params.step === 'error' ? 'https://example-news.com/food/best-summer-dinners' : '');
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');

  const lines = ingredientLines(text);
  const close = () => router.back();

  useEffect(() => {
    if (step !== 'loading') return;
    // Real import isn't built yet: a link with "shakshuka" in it, or pasted text, finds Shakshuka.
    const ok = mode === 'text' || /shakshuka/i.test(link);
    const timer = setTimeout(() => setStep(ok ? 'done' : 'error'), READ_MS);
    return () => clearTimeout(timer);
  }, [step, mode, link]);

  const paste = async () => {
    const clip = (await Clipboard.getStringAsync()).trim();
    if (!clip) return;
    if (mode === 'text') setText(clip);
    else setLink(clip);
    setHint('');
  };

  const start = () => {
    if (mode === 'link' && !link.trim()) return setHint('Paste a link first.');
    if (mode === 'text' && !lines) return setHint('Paste the ingredient list first.');
    setStep('loading');
  };

  // The recipe it found, checked against the kitchen.
  const saved = state.recipes.find((r) => r.id === SHAKSHUKA.id) ?? SHAKSHUKA;
  const found = IMPORT_FOUND;
  const missing = found.filter((g) => !g.have).length;
  const added = saved.onToBuy;

  const title = step === 'done' ? 'Shakshuka' : step === 'error' ? 'No recipe on that page' : 'Import a recipe';
  const sub =
    step === 'error'
      ? 'We couldn’t find ingredients or steps there. It may be a list of recipes, or behind a login.'
      : step === 'done'
        ? `25 min · 2 servings. You have ${found.length - missing} of ${found.length} things.`
        : step === 'loading'
          ? 'This takes a few seconds.'
          : 'Paste a link from any recipe site, or the recipe itself. We’ll check it against your kitchen.';

  return (
    <Sheet inline onClose={close} title={title} subtitle={sub}>
      {step === 'edit' ? (
        <View style={styles.body}>
          <Segmented
            accessibilityLabel="What are you pasting"
            options={[
              { value: 'link', label: 'Link' },
              { value: 'text', label: 'Text' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setHint('');
            }}
          />
          {mode === 'link' ? (
            <View style={styles.linkField}>
              <TextInput
                value={link}
                onChangeText={(v) => {
                  setLink(v);
                  setHint('');
                }}
                placeholder="Paste a recipe link"
                placeholderTextColor={color.inkSubtle}
                accessibilityLabel="Recipe link"
                keyboardType="url"
                textContentType="URL"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={start}
                style={styles.input}
              />
            </View>
          ) : (
            <>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  setHint('');
                }}
                placeholder="Paste the ingredients and steps. Messy is fine."
                placeholderTextColor={color.inkSubtle}
                accessibilityLabel="Recipe text"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
              />
              <Text variant="caption" color={text && lines ? 'sageInk' : 'inkMuted'} weight={text && lines ? 'semibold' : undefined}>
                {text
                  ? lines
                    ? `Found ${lines} ingredients`
                    : 'No ingredients found yet. Paste the list with amounts.'
                  : 'Tip: include the amounts, like “2 eggs”.'}
              </Text>
            </>
          )}
          {hint ? <ErrorLine text={hint} /> : null}
          <ActionPill label="Paste from clipboard" height="header" onPress={paste} />
          <ActionPill label="Import recipe" variant="primary" height="bottom" onPress={start} />
        </View>
      ) : null}

      {step === 'loading' ? (
        <View style={styles.loading}>
          <CookingLoader />
          <Text variant="button" weight="regular" color="inkMuted" accessibilityLiveRegion="polite">
            Picking out the ingredients…
          </Text>
          <TextLink label="Cancel" align="center" onPress={() => setStep('edit')} />
        </View>
      ) : null}

      {step === 'error' ? (
        <View style={styles.body}>
          <View style={styles.errLink}>
            <Text variant="caption" numberOfLines={1}>
              {link}
            </Text>
          </View>
          <ActionPill
            label="Paste the recipe text instead"
            variant="primary"
            height="bottom"
            onPress={() => {
              setMode('text');
              setStep('edit');
            }}
          />
          <TextLink
            label="Try another link"
            variant="button"
            align="center"
            onPress={() => {
              setMode('link');
              setLink('');
              setStep('edit');
            }}
          />
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={styles.body}>
          <View>
            {found.map((g) => (
              <View key={g.name} style={styles.found}>
                <Text variant="button" weight="regular">
                  {g.name}
                </Text>
                <Text
                  variant="caption"
                  weight={g.have ? undefined : 'semibold'}
                  color={g.have ? 'inkMuted' : added ? 'sageInk' : 'ink'}
                >
                  {g.have ? 'In your kitchen' : added ? 'On To Buy' : 'Missing'}
                </Text>
              </View>
            ))}
          </View>
          <Tap
            accessibilityRole="button"
            accessibilityState={{ selected: added }}
            onPress={() => {
              actions.importRecipe();
              actions.toggleRecipeToBuy(SHAKSHUKA.id);
            }}
            style={[styles.missingBtn, added && styles.missingAdded]}
          >
            <Text variant="button" weight="semibold" color={added ? 'sageInk' : 'ink'}>
              {added ? `Added ${missing} to To Buy` : `Add ${missing} missing to To Buy`}
            </Text>
          </Tap>
          <ActionPill
            label="Save to Recipes"
            variant="primary"
            height="bottom"
            onPress={() => {
              actions.importRecipe();
              goToTab('/recipes');
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.s3 + 2 },
  linkField: {
    height: size.controlHeight + space.s1,
    paddingHorizontal: space.s3 + 2,
    justifyContent: 'center',
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: color.line,
  },
  input: { ...type.body, color: color.ink, padding: 0, outlineWidth: 0 },
  textArea: {
    height: TEXT_HEIGHT,
    padding: space.s3 + 2,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: color.line,
  },
  loading: { alignItems: 'center', gap: space.s3 + 2, paddingTop: space.s5 + space.s1 + 2, paddingBottom: space.s5 * 2 },
  errLink: { paddingVertical: space.s3, paddingHorizontal: space.s3 + 2, borderRadius: radius.control, backgroundColor: color.surfaceSunken },
  found: {
    minHeight: space.s5 * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
  missingBtn: {
    height: size.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
    borderWidth: 1,
    borderColor: color.surfaceSunken,
  },
  missingAdded: { backgroundColor: color.surface, borderColor: color.line },
});
