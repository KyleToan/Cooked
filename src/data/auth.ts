import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

/** The Supabase session, and whether the saved one has been restored yet. Ready at once without a backend. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, ready };
}

/** Thrown when the person closes the Apple or Google sheet, so the screen stays quiet instead of showing an error. */
export class Canceled extends Error {}

/** Native Sign in with Apple, then hands Apple's identity token to Supabase. iOS only. */
export async function signInWithApple() {
  if (!supabase) return;
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Canceled();
    throw e;
  }
  if (!credential.identityToken) throw new Error('No identity token from Apple');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw error;
}

/** Google through Supabase's OAuth page in the system auth browser, back to the app's `cooked://` scheme. */
export async function signInWithGoogle() {
  if (!supabase) return;
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Canceled();
  await sessionFromUrl(result.url);
}

/** Reads the tokens (implicit flow) or code (PKCE flow) Supabase puts on the redirect URL and saves the session. */
async function sessionFromUrl(url: string) {
  if (!supabase) return;
  const params = Object.fromEntries(
    url
      .split(/[?#]/)
      .slice(1)
      .flatMap((part) => part.split('&'))
      .map((pair) => pair.split('=').map(decodeURIComponent)),
  ) as Record<string, string | undefined>;
  if (params.error) throw new Error(params.error_description ?? params.error);
  const { access_token, refresh_token, code } = params;
  const { error } =
    access_token && refresh_token
      ? await supabase.auth.setSession({ access_token, refresh_token })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error('No session in the redirect') };
  if (error) throw error;
}
