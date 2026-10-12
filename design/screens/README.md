# Screens

Every Cooked screen, in canvas order. Each one has a prototype in `prototypes/<Name>.dc.html` and a picture in `screenshots/<Name>.png`. Wrapper files (a screen shown in a different state) are listed under the screen they belong to. Build the screen once and drive its states with a parameter.

Sample people and data: Alex Rivera (the user, alex.rivera@gmail.com), Sam (housemate, joined Oct 3), "Rivera kitchen".

## Shared components

| Prototype | What it is | Props |
| --- | --- | --- |
| `CookedIsland` | The floating tab island: Home, Fridge, Recipes (Decisions #104), 300 × 68, 28px from the bottom | `active`: home, scan, recipes |
| `CookedKeyboard` | Stand-in for the iOS keyboard in onboarding pictures. **Don't build it.** Use the system keyboard | `layout`: letters, email, numbers |

## App

| Screen | Prototype | What it does | States | Goes to |
| --- | --- | --- | --- | --- |
| Home | `AppHome` | Greeting + "Cooked", search, Scan a receipt (sage) and Import recipe (grey), Your Kitchen as three sticky notes (Fridge 8 items with "2 use soon", Pantry 6, Freezer 4), To Buy with progress "2 of 6 done" and the three items still to get, add row, undo bar after ticking | `name` prop for the greeting. Screenshot `AppHome-scrolled` | Account, Scan, Import, each Kitchen tab, To Buy |
| Home, empty | `AppHomeEmpty` | First-run Home: "Welcome, Alex", one cornsilk note "Nothing here yet" with Scan a receipt, empty To Buy with add row | | Scan, Kitchen |
| Scan | `AppScan` | Full-screen camera, corner guides, mode strip (Receipt, Fridge, Pantry, Freezer, Recipe), Photos, shutter, Flash, long-receipt hint in Receipt mode | `flow`: app, onb, onbsolo (changes where close and capture go) | Check your scan |
| Check your scan | `AppScanReview` | "We found 7 items": editable names, a place tag per item that opens a Fridge / Pantry / Freezer / Skip picker and a quantity stepper, "Bread was on your To Buy list" note, "Add 6 items to your kitchen" | `flow` as above (the To Buy note shows only in `app`). Screenshot `AppScanReview-place-picker` | Home (or the next onboarding step) |
| Couldn't read this receipt | `AppScanUnreadable` | Error sheet over the blurred photo: what went wrong, Retake photo, Add the items by hand | | Scan, Kitchen |
| Your Kitchen | `AppKitchen` | Tabs Fridge / Pantry / Freezer / To Buy, search per tab, Use soon section, sorted list with A–Z / Use by toggle, rows that open in place to a stepper, "Used up", "Sam used the last one", undo bar. To Buy tab has Share and the full list | `tab`: fridge, pantry, freezer, tobuy. Wrappers: `AppKitchenPantry`, `AppKitchenFreezer`, `AppKitchenToBuy` | Home, Recipes |
| Recipes | `AppRecipes` | "5 saved · 2 you can make now", Import pill, search, Tonight note, filter pills (All, Can make now, Missing 1–2, Imported), rows with "Add N to To Buy" | | Recipe, Tonight's recipe, Import |
| Recipe | `AppRecipe` | Photo, Missing (with "Add 2 to To Buy"), You have (Use soon labels), Steps, "I made this" (sage, with undo), link to the original | `recipe`: shakshuka, pasta. Wrapper `AppRecipeTonight` (pasta). Screenshot `AppRecipe-scrolled` | Recipes |
| Import a recipe | `AppImport` | Sheet over Home: Link / Text switch, paste field, Paste from clipboard, Import recipe; then a loading state; then the found recipe ("You have 6 of 8 things") | `step`: edit, error. Wrapper `AppImportError` ("No recipe on that page") | Recipes, Home |
| Account | `AppAccount` | Profile, Kitchen (Rivera kitchen, Notifications), Your details (Name, Email, Sign-in, Units), Help and privacy, Log out (grey pill), Delete account (red text) | `sheet`: none, delete. Wrapper `AppAccountDelete` (confirm sheet; "Keep my account" is the sage button). Screenshot `AppAccount-scrolled` | Home, Household, Notifications, Welcome (after log out or delete) |
| Rivera kitchen | `AppHousehold` | Rename, People (Alex, Sam with Remove → inline confirm → undo), invite link (one person, 7 days), Share invite link, Make a new link, Leave this kitchen | | Account |
| Notifications | `AppNotifications` | Four switches: To Buy changes, Use-soon nudge (with a send time), Someone joins your kitchen, Weekly kitchen summary (off); preview of a notification | | Account |

## Onboarding

| Screen | Prototype | What it does | States | Goes to |
| --- | --- | --- | --- | --- |
| Welcome | `Onb1Welcome` | Four sticky notes, "Cooked", one line about the app, Get started, "Already cooking with us? Log in" | | Log in or sign up |
| Log in or sign up | `Onb2SignIn` | Continue with Apple, Continue with Google, or Continue with email or phone | | Apple / Google → Your name; email → Email or phone |
| Email or phone | `Onb3Email` | Email / Phone switch, one field, Send code. No password | Switch state. Screenshot `Onb3Email-phone` | Enter the code |
| Enter the code | `Onb4Code` | Six boxes, "Sent to … · Change", resend timer, then "Send a new code" | `state`: typing, wrong. Wrapper `Onb4CodeWrong` | Your name |
| Your name | `Onb5Name` | First name, with a preview of how it shows up ("Added by Alex") | | Who you cook with |
| Who you cook with | `Onb6Household` | Just me / Me and my household / I have an invite | Picked option | Just me → first scan (solo); household → first scan; invite → Join a kitchen |
| Join a kitchen | `Onb6bInviteCode` | Paste the invite link or type the code; shows the kitchen it found ("Rivera kitchen, Sam invited you"); Join Rivera kitchen | Empty vs found | Home |
| Scan your first receipt | `Onb8Scan` | Receipt illustration, Scan a receipt, I'll do it later | `flow`: household, solo. Wrapper `Onb8ScanSolo` | Camera, or skip ahead |
| First scan, camera | `OnbCamera` | `AppScan` with `flow="onb"`. Solo: `OnbCameraSolo` | | Check items |
| First scan, check items | `OnbCheck` | `AppScanReview` with `flow="onb"`. Solo: `OnbCheckSolo` | | Invite (household) or Ready (solo) |
| Invite your household | `Onb7Invite` | Invite link, Share invite link, Skip for now, "No one else yet" | | Ready |
| Your kitchen is ready | `Onb9Ready` | Three notes with what was put away, "We put away 6 things", To Buy empty line, Go to my kitchen | | Home |

## Flows at a glance

- **Household:** Welcome → Log in → Email → Code → Name → Who you cook with (household) → First scan → Camera → Check → Invite → Ready → Home
- **Just me:** … → Who you cook with (just me) → First scan (solo) → Camera → Check → Ready → Home
- **Joining:** … → Who you cook with (I have an invite) → Join a kitchen → Home
- **Apple or Google:** Log in → Your name (skips email and code)
