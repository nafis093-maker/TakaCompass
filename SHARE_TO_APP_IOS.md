# Getting transactions into Taka Compass on iPhone

iOS won't let any app read your SMS inbox (that's an Apple rule, not a bug — see
the note in IOS_BUILD.md). Instead, the app accepts **shared text** through a
URL scheme and drops it straight into the **review queue**, where you confirm or
edit it. Two ways to use it: a Share-Sheet shortcut, and an automatic rule.

The app responds to:
```
takacompass://add?text=<the message text, URL-encoded>
```
When opened with such a link, it parses the text and, if it looks like a
transaction, adds it to *Review SMS* and opens that screen.

## A) Share-Sheet shortcut (manual, one tap)
Lets you select a bank text in Messages → Share → run the shortcut.

1. Open the **Shortcuts** app → **+** to create a shortcut.
2. Tap the shortcut's **(i)** → enable **Show in Share Sheet**. Under *Share
   Sheet Types*, keep **Text** on.
3. Add action **URL** and set it to: `takacompass://add?text=`
4. Add action **Text** → insert the **Shortcut Input** variable (this is the
   shared message).
5. Add action **URL Encode** on that Text.
6. Add action **Combine Text** (or just build the URL): set a **URL** to
   `takacompass://add?text=` then append the URL-encoded text. The simplest
   reliable recipe:
   - **Text**: `takacompass://add?text=[URL-encoded Shortcut Input]`
   - **Open URLs** (the Text from the previous step)
7. Name it "Add to Taka Compass" and save.

Now in Messages: select a transaction text → **Share** → **Add to Taka
Compass**. The app opens with it queued for review.

## B) Automatic rule (hands-off, per sender)
iOS Personal Automations can fire when a message arrives from a sender.

1. Shortcuts → **Automation** tab → **+** → **Message**.
2. Set **Sender** to your bank/MFS short-code (e.g. bKash, BRAC, "01..."), or
   **Message Contains** a keyword like `Tk` or `BDT`.
3. Turn **Run Immediately** on (so it doesn't prompt each time, where iOS allows
   it).
4. Add the same actions as steps 3–6 above, using **Shortcut Input** (the
   message text) as the source.

> Note: Apple restricts how silently message automations can run, and the rules
> change between iOS versions — some still show a notification you tap. It's the
> closest thing to automatic capture iOS allows.

## Why not a true "Share → app" extension?
A native Share Extension is possible but needs an extra Xcode target plus an App
Group, and still can't read the inbox on its own. The Shortcuts route above
gives you both a Share-Sheet entry and an automation with none of that wiring.
If you'd rather have the native extension too, it can be added later.

## Android
The same `takacompass://` scheme is registered on Android, and Android also has
true SMS auto-capture, so this is mainly for iPhone.
