# cooked.app

Files the website at `https://cooked.app` has to serve so invite links (`cooked.app/join/<code>`) open the app instead of the browser (Decisions #165). Nothing here ships in the app.

| File | Serve at | Replace |
| --- | --- | --- |
| `.well-known/apple-app-site-association` | `https://cooked.app/.well-known/apple-app-site-association`, as `application/json`, no redirect | `TEAMID` with the Apple Developer Team ID |
| `.well-known/assetlinks.json` | `https://cooked.app/.well-known/assetlinks.json` | `SHA256_FINGERPRINT` with the app signing key's SHA-256 (`npx eas-cli@latest credentials`, Android) |

The site also needs a page at `/join/<code>` for people without the app: say what Cooked is, link to the App Store, and show the code so they can type it in Join. The Help, Privacy and Terms pages (`/help`, `/privacy`, `/terms`) the app links to live here too (T7.1).
