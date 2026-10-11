# Cooked

A shared kitchen app: scan a receipt to stock your fridge, pantry and freezer, import recipes, and keep one To Buy list with the people you live with.

React Native with Expo (SDK 57), TypeScript and Expo Router, with over-the-air updates through EAS Update.

## Run it

1. Install Node 22 (LTS) and the Expo Go app on your phone.
2. `npm install`
3. `npm start`, then scan the QR code with your phone's camera (iPhone) or Expo Go (Android).

The app opens on a temporary theme check screen that shows every color, type style and icon. Home replaces it once screens are built.

## Where things are

- `design/`: the designs. Start with `design/README.md`.
- `src/`: the app. `AGENTS.md` explains the layout, commands and rules.
- `context.md` and `Decisions.md`: what Cooked is, and every decision so far.

## Ship an update without the App Store (one-time setup first)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest update:configure
npx eas-cli@latest build --profile preview      # a build testers install
npx eas-cli@latest update --channel preview --message "What changed" --environment preview
```

Updates reach builds with the same native code. Adding a package with new native code needs a new build.
