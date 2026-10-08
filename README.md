# Spelling Quest

A story-based spelling game for a tablet. Each school week is a chapter: two pups go on an adventure and need help sorting, finishing and spelling the week's words. The look and the story come from a swappable theme.

![Sound Sort on a tablet](docs/screenshots/tablet-landscape-3-sound-sort.png)

## How a chapter plays

1. **Story page** sets the scene.
2. **Sound Sort**: put each word in the bag for its spelling of the sound (ai / ay / a‑e / ea). Tap a bag or drag the word.
3. **Pick the Patch**: hear the word, see it with the sound missing, pick the right letters. A wrong pick shows the teacher's tip.
4. **Which Looks Right?**: hear the word and tap the one spelt right out of three (*sail*, *sayl*, *sale*).
5. **Spell It**: look, say, cover, then build the word from letter tiles. Mistakes are shown in red and the word comes back later in the round.
6. **Tricky words** (like *said*) use the same look–cover–spell steps.
7. **Tricky Word Catch**: bubbles float up with different spellings of a tricky word; catch the right one before it floats away.
8. **The end**: a sticker for the sticker book.

Each theme has its own voices, made once as voice clips by Google Cloud Text-to-Speech (an Australian dad reads the Beach Day story; spelling words are said in a British voice). Grown-ups can record the week's sound, and any word, in their own voice from the **Grown-ups** button. Any line with no clip or recording is read by the browser's own voice. Progress and stickers are saved in the browser on that device.

## Voices

- **Theme voices** are MP3 clips in each theme's `voice/` folder, one per line the game can say. GitHub makes them (`.github/workflows/voice.yml`, `npm run voice`) whenever a week or theme changes, using the `GOOGLE_TTS_API_KEY` repository secret, and commits them. Only new lines are sent, and the whole game is a few thousand characters, far inside Google's free monthly allowance. Without the secret nothing breaks; the browser voice is used. See THEMES.md for choosing voices.
- **Your recordings** (Grown-ups → Record your voice) are saved in the browser and, once the shared store below is set up, on Cloudflare too, so every device that opens the game plays them. The game plays them first: your recording, then the theme's clip, then the browser voice. The week's sound is only ever played from your recording, because a computer voice can't be trusted to say a sound on its own.

To set up the Google key: in the Google Cloud console create a project, add billing, enable **Cloud Text-to-Speech API**, create an API key restricted to that API, and add a small budget alert. Then in GitHub open **Settings → Secrets and variables → Actions** and add it as `GOOGLE_TTS_API_KEY`.

## Learning rules

Two rules always apply, in every game and theme (details in [CLAUDE.md](CLAUDE.md)):

1. A wrong option is never a real word: *sale* is never shown as the wrong spelling of *sail*.
2. A split spelling is shown with two gaps: *made* with the sound missing is **m _ d _**, not **m _ d**.

## Adding a week

Add a file to `public/content/weeks/`, named after the Monday of that week, and add its name to `public/content/weeks/index.json`. You can do this in GitHub's web editor.

```json
{
  "id": "2026-10-07",
  "title": "4 spellings of /ee/",
  "sound": "ee",
  "graphemes": ["ee", "ea", "e_e", "y"],
  "words": ["s[ee]", "b[ea]ch", "th[e]s[e]", "happ[y]"],
  "tricky": ["was"],
  "trickyMistakes": { "was": ["woz", "wos"] },
  "tips": { "y": "'y' makes the ee sound at the end of a long word." }
}
```

Square brackets mark the letters that make the sound (the red letters on the school sheet). A split spelling like a‑e gets two pairs of brackets: `m[a]k[e]`, and its grapheme is written `a_e`. Every word's spelling must be in `graphemes`, or the chapter won't load. `trickyMistakes` is optional: it lists wrong spellings to use in Tricky Word Catch, and the game makes its own up if it's left out.

## Themes

A theme is a folder in `public/content/themes/` with a `theme.json` (characters, what they say, the story), a `theme.css` (colours and fonts) and an `art/` folder. See [THEMES.md](THEMES.md).

## Running it

```sh
npm install
npm run dev       # play it at the address shown; add --host to try it from a tablet on the same Wi-Fi
npm test          # word logic tests
npm run e2e       # plays a whole chapter in a tablet-sized browser
npm run voice -- --check   # how many voice clips are still to make
```

## Deploying privately (free)

Hosting is Cloudflare Pages, with Cloudflare Access in front so only the family can open it.

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and pick `spelling-quest`.
2. Framework preset **Vue** (or none), build command `npm run build`, output directory `dist`. Under environment variables set `NODE_VERSION` to `22`.
3. Deploy. Every merge to `main` redeploys automatically, including a new week file added in the GitHub web editor.
4. To make it private, open the Pages project's **Settings → General → Access policy** and enable it (or create a self-hosted application for the site's address in **Zero Trust → Access → Applications**). Add a policy that allows the family's email addresses. Visitors then get a one-time code by email before they can play. Also protect preview deployments if you share those links.

5. To share recordings between devices, create an R2 bucket in the Cloudflare dashboard (**R2 → Create bucket**, e.g. `spelling-quest-recordings`; the free tier is plenty). In the Pages project open **Settings → Bindings → Add → R2 bucket**, set the variable name to `RECORDINGS` and pick the bucket, then redeploy. The recordings API (`functions/api/recordings`) sits behind the same Access login as the game. Until this is done, recordings stay on the device they were made on.

Search engines are asked not to index the site (`noindex` in `index.html` and `public/_headers`).
