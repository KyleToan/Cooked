import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ActionPill } from '@/components/ActionPill';
import { Checkbox, ErrorLine, Segmented } from '@/components/Controls';
import { CookingLoader } from '@/components/Loader';
import { Sheet } from '@/components/Sheet';
import { Tap } from '@/components/Tap';
import { Text } from '@/components/Text';
import { TextLink } from '@/components/TextLink';
import { haptics } from '@/hooks/haptics';
import { useGoToTab } from '@/hooks/useGoToTab';
import { lastScan } from '@/data/ocr';
import { countIngredients, foundList, importFromLink, parseRecipeFromText } from '@/data/recipeImport';
import { useStore } from '@/data/store';
import type { Recipe } from '@/data/types';
import { color, radius, size, space, type } from '@/theme';

type Mode = 'link' | 'text';
type Step = 'edit' | 'loading' | 'done' | 'error';

/** The shortest time the loader shows for a link, so a quick fetch doesn't flash. */
const MIN_READ_MS = 800;
const TEXT_HEIGHT = 132;
const FOCUS_BORDER = 1.5;
/** Room on the field's right for the Paste button. */
const PASTE_ROOM = size.targetMin + space.s5;

export default function Import() {
  const router = useRouter();
  const goToTab = useGoToTab();
  const params = useLocalSearchParams<{ step?: string; from?: string }>();
  // Scan's Recipe mode opens Import with the page's text, read straight away.
  const scanned = params.from === 'scan';
  const { state, actions } = useStore();

  const [mode, setMode] = useState<Mode>(scanned ? 'text' : 'link');
  const [step, setStep] = useState<Step>(params.step === 'error' ? 'error' : scanned ? 'loading' : 'edit');
  const [link, setLink] = useState(params.step === 'error' ? 'https://example-news.com/food/best-summer-dinners' : '');
  const [text, setText] = useState(scanned ? lastScan.recipeText : '');
  const [hint, setHint] = useState('');
  const [parsed, setParsed] = useState<Recipe | null>(null);
  const [focused, setFocused] = useState(false);
  const [addMissing, setAddMissing] = useState(true);

  const lines = countIngredients(text);
  const close = () => router.back();

  useEffect(() => {
    if (step !== 'loading') return;
    // Links are fetched on the device; pasted text is read straight away.
    const controller = new AbortController();
    const read = mode === 'text' ? Promise.resolve(parseRecipeFromText(text, state.items)) : importFromLink(link, state.items, controller.signal);
    // Pasted text is read at once, so it skips the minimum and goes straight to the result.
    const wait = mode === 'text' ? null : new Promise((done) => setTimeout(done, MIN_READ_MS));
    let live = true;
    Promise.all([read, wait]).then(([recipe]) => {
      if (!live) return;
      setParsed(recipe);
      setStep(recipe ? 'done' : 'error');
      if (recipe) haptics.success();
      else haptics.error();
    });
    return () => {
      live = false;
      controller.abort();
    };
    // Only a new 'loading' step starts a read; typing doesn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const paste = async () => {
    // Empty when the clipboard has no text or the person said no to iOS's "Allow Paste"; the browser can refuse outright.
    const clip = (await Clipboard.getStringAsync().catch(() => '')).trim();
    if (!clip) return setHint(mode === 'text' ? 'Nothing to paste. Copy the recipe first.' : 'Nothing to paste. Copy a link first.');
    if (mode === 'text') setText(clip);
    else setLink(clip);
    setHint('');
  };

  const start = () => {
    if (mode === 'link' && !link.trim()) return setHint('Paste a link first.');
    if (mode === 'text' && !lines) return setHint('Paste the ingredient list first.');
    setStep('loading');
  };

  // The recipe it found, checked against the kitchen. Once saved, the store's copy is the one that changes.
  const saved = parsed ? (state.recipes.find((r) => r.id === parsed.id || (parsed.url && r.url === parsed.url)) ?? parsed) : null;
  const found = saved ? foundList(saved) : [];
  const missing = saved?.missing.length ?? 0;
  const added = saved?.onToBuy ?? false;
  const meta = saved ? [saved.time, saved.servings].filter(Boolean).join(' · ') : '';

  const title = step === 'done' && saved ? saved.title : step === 'error' ? 'No recipe on that page' : 'Import a recipe';
  const sub =
    step === 'error'
      ? scanned
        ? 'We couldn’t find an ingredient list in that photo. Try a sharper photo, or paste the text.'
        : 'We couldn’t find ingredients or steps there. It may be a list of recipes, or behind a login.'
      : step === 'done'
        ? `${meta ? `${meta}. ` : ''}You have ${found.length - missing} of ${found.length} things.`
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
          {/* Touch and hold in the field pastes without asking; Paste makes iOS ask each time. */}
          {mode === 'link' ? (
            <View>
              <TextInput
                value={link}
                onChangeText={(v) => {
                  setLink(v);
                  setHint('');
                }}
                placeholder="Touch and hold to paste a link"
                placeholderTextColor={color.inkSubtle}
                accessibilityLabel="Recipe link"
                keyboardType="url"
                textContentType="URL"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={start}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, styles.linkField, focused && styles.focused]}
              />
              <Tap accessibilityRole="button" accessibilityLabel="Paste from clipboard" onPress={paste} style={[styles.paste, styles.pasteLink]}>
                <Text variant="link" weight="semibold" color="sageInk">
                  Paste
                </Text>
              </Tap>
            </View>
          ) : (
            <>
              <View>
                <TextInput
                  value={text}
                  onChangeText={(v) => {
                    setText(v);
                    setHint('');
                  }}
                  placeholder="Touch and hold to paste the recipe. Messy is fine."
                  placeholderTextColor={color.inkSubtle}
                  accessibilityLabel="Recipe text"
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={[styles.input, styles.textArea, focused && styles.focused]}
                />
                <Tap accessibilityRole="button" accessibilityLabel="Paste from clipboard" onPress={paste} style={[styles.paste, styles.pasteText]}>
                  <Text variant="link" weight="semibold" color="sageInk">
                    Paste
                  </Text>
                </Tap>
              </View>
              <Text variant="caption" color={text && lines ? 'ink' : 'inkMuted'} weight={text && lines ? 'semibold' : undefined}>
                {text
                  ? lines
                    ? `Found ${lines} ingredients`
                    : 'No ingredients found yet. Paste the list with amounts.'
                  : 'Tip: include the amounts, like “2 eggs”.'}
              </Text>
            </>
          )}
          {hint ? <ErrorLine text={hint} /> : null}
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
          {link ? (
            <View style={styles.errLink}>
              <Text variant="caption" numberOfLines={1}>
                {link}
              </Text>
            </View>
          ) : null}
          <ActionPill
            label="Paste the recipe text instead"
            variant="primary"
            height="bottom"
            onPress={() => {
              setMode('text');
              setStep('edit');
            }}
          />
          {/* After a photo there was no link to try again. */}
          {scanned ? null : (
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
          )}
        </View>
      ) : null}

      {step === 'done' && saved ? (
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
          {missing && !added ? (
            <View style={styles.checkRow}>
              <Checkbox
                checked={addMissing}
                onPress={() => setAddMissing(!addMissing)}
                label={`Add the ${missing} missing to To Buy`}
              />
              <Text variant="button" weight="regular" style={styles.grow}>
                Add the {missing} missing to To Buy
              </Text>
            </View>
          ) : null}
          <ActionPill
            label="Save to Recipes"
            variant="primary"
            height="bottom"
            onPress={() => {
              actions.importRecipe(saved);
              // To Buy notes point at a saved recipe, so they're added after saving it.
              if (missing && addMissing && !added) actions.toggleRecipeToBuy(saved.id);
              goToTab('/recipes');
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.roomy },
  input: {
    ...type.body,
    color: color.ink,
    padding: 0,
    outlineWidth: 0,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: color.controlLine,
  },
  // minHeight and padding, not a fixed height, so larger text sizes still fit. Both leave room on the right for Paste.
  linkField: {
    minHeight: size.controlHeight + space.s1,
    paddingLeft: space.roomy,
    paddingRight: PASTE_ROOM,
    paddingVertical: space.s3,
  },
  textArea: {
    minHeight: TEXT_HEIGHT,
    padding: space.roomy,
    paddingRight: PASTE_ROOM,
  },
  // Paste sits inside the field's right edge (the link field) or top-right corner (the text area).
  paste: {
    position: 'absolute',
    right: 0,
    minWidth: size.targetMin,
    minHeight: size.targetMin,
    paddingHorizontal: space.roomy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteLink: { top: 0, bottom: 0 },
  pasteText: { top: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, marginLeft: -space.s2 - 2 },
  grow: { flex: 1 },
  // A thicker sage-ink outline while typing; the padding gives back the extra half point so nothing shifts.
  focused: { borderWidth: FOCUS_BORDER, borderColor: color.sageInk, margin: -(FOCUS_BORDER - 1) },
  loading: { alignItems: 'center', gap: space.roomy, paddingTop: space.s5 + space.tight, paddingBottom: space.s5 * 2 },
  errLink: { paddingVertical: space.s3, paddingHorizontal: space.roomy, borderRadius: radius.control, backgroundColor: color.surfaceSunken },
  found: {
    minHeight: space.s5 * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: color.lineSoft,
  },
});
