import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import type { WebView as WebViewType } from 'react-native-webview';

/**
 * Loaded only when the app binary has the native module: a build from before react-native-webview
 * was added would otherwise crash at launch, since Expo Router loads every screen. Without it,
 * import works as before, just without the browser fallback.
 */
const WebView: typeof WebViewType | null =
  Platform.OS !== 'web' && TurboModuleRegistry.get('RNCWebViewModule')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('react-native-webview') as typeof import('react-native-webview')).WebView
    : null;

/** How long the hidden browser gets to load a page and pass any bot check. */
const READ_TIMEOUT_MS = 12000;

/**
 * Runs in the page after each load: sends the page's HTML once it has recipe data, or after
 * 8 seconds whatever it has. Injected again on every load, since iOS doesn't rerun
 * injectedJavaScript when a page moves on by itself (a bot check reloading into the real page).
 */
const SEND_PAGE = `(function () {
  var tries = 0;
  var timer = setInterval(function () {
    var html = document.documentElement.outerHTML;
    if (/recipeIngredient|"@type"\\s*:\\s*"Recipe"/.test(html) || ++tries >= 8) {
      clearInterval(timer);
      window.ReactNativeWebView.postMessage(html);
    }
  }, 1000);
})();
true;`;

/**
 * A hidden browser for pages that refuse a plain request or build the recipe with JavaScript:
 * Cloudflare and Akamai bot checks pass in a real WebKit view. `browse` loads a page and resolves
 * with its HTML, or null on failure, timeout or abort; render `view` somewhere on the screen.
 * There's no WebView on the web or in a build without the module, so `browse` is undefined there.
 */
export function usePageReader() {
  const [page, setPage] = useState<{ url: string; key: number } | null>(null);
  const finish = useRef<((html: string | null) => void) | null>(null);
  const web = useRef<WebViewType>(null);

  const browse = useCallback(
    (url: string, signal: AbortSignal) =>
      new Promise<string | null>((resolve) => {
        const done = (html: string | null) => {
          clearTimeout(timer);
          signal.removeEventListener('abort', onAbort);
          finish.current = null;
          setPage(null);
          resolve(html);
        };
        const timer = setTimeout(() => done(null), READ_TIMEOUT_MS);
        const onAbort = () => done(null);
        if (signal.aborted) return done(null);
        signal.addEventListener('abort', onAbort);
        finish.current = done;
        setPage({ url, key: Date.now() });
      }),
    [],
  );

  const view = page && WebView ? (
    <View style={[StyleSheet.absoluteFill, styles.hidden]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        key={page.key}
        ref={web}
        source={{ uri: page.url }}
        incognito
        injectedJavaScript={SEND_PAGE}
        onMessage={(e) => finish.current?.(e.nativeEvent.data)}
        onLoadEnd={() => web.current?.injectJavaScript(SEND_PAGE)}
        onError={() => finish.current?.(null)}
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback={false}
      />
    </View>
  ) : null;

  return { view, browse: WebView ? browse : undefined };
}

const styles = StyleSheet.create({
  // Laid out at the screen's size so the page renders as it would on screen, but never seen or touched.
  hidden: { opacity: 0, zIndex: -1 },
});
