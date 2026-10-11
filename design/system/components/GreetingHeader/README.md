# GreetingHeader

The top of every main screen: a greeting, the screen title and the account button.

- On the left, the greeting sits above the title with a 2px gap. The greeting uses the `greeting` style in `ink-subtle`, as "<time of day>, <first name>". The title uses `title-xl` in `ink`.
- Time of day: "Good morning" before noon, "Good afternoon" before 5pm, "Good evening" after 5pm, and "Up late" from midnight to 5am.
- On the right is a 44px square account button: white `surface`, 1px `line` border, `radius-control`, `shadow-card`, with a 22px person icon in `ink`.
- Detail screens drop the greeting and put a back arrow before the title.
