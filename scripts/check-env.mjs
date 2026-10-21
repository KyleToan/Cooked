// Runs on EAS after install (the eas-build-post-install script). A production or preview build without the
// Supabase settings would ship the development fake, so it stops the build. Prints names only, never values.
const profile = process.env.EAS_BUILD_PROFILE;
const needed = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

if (profile === 'production' || profile === 'preview') {
  const missing = needed.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`The ${profile} build needs ${missing.join(' and ')} in its EAS environment.`);
    process.exit(1);
  }
}
