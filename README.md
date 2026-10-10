# Spelling Quest

A story-based spelling game for a tablet. Each school week is a chapter: two pups go on an adventure and need help sorting, finishing and spelling the week's words. The look and the story come from a swappable theme.

![Sound Sort on a tablet](docs/screenshots/tablet-landscape-3-sound-sort.png)

## How a chapter plays

1. **Story page** sets the scene.
2. **Sound Sort**: put each word in the bag for its spelling of the sound (ai / ay / a‑e / ea). Tap a bag or drag the word.
3. **Pick the Patch**: hear the word, see it with the sound missing, pick the right letters. A wrong pick shows the teacher's tip.
4. **Which Looks Right?**: hear the word and tap the one spelt right out of three (*sail*, *sayl*, *sale*).
5. **Spell It**: look, say, cover, then build the word from letter tiles. Mistakes are shown in red and the word comes back later in the round.
6. **Write It**: look, say, cover, then write the word with a finger, one letter in each box on handwriting lines, like writing spellings out on paper. Four of the week's words (tricky words included) per chapter. See *Handwriting* below.
7. **Tricky words** (like *said*) use the same look–cover–spell steps.
8. **Tricky Word Catch**: bubbles float up with different spellings of a tricky word; catch the right one before it floats away.
9. **The end**: a sticker for the sticker book.

Each theme has its own voices, made once as voice clips by Google Cloud Text-to-Speech (an Australian dad reads the Beach Day story; spelling words are said in a British voice). Grown-ups can record the week's sound, and any word, in their own voice from the **Grown-ups** button. Any line with no clip or recording is read by the browser's own voice. Progress and stickers are saved in the browser on that device.

## Voices

- **Theme voices** are MP3 clips in each theme's `voice/` folder, one per line the game can say. GitHub makes them (`.github/workflows/voice.yml`, `npm run voice`) whenever a week or theme changes, using the `GOOGLE_TTS_API_KEY` repository secret, and commits them. Only new lines are sent, and the whole game is a few thousand characters, far inside Google's free monthly allowance. Without the secret nothing breaks; the browser voice is used. See THEMES.md for choosing voices.
- **Your recordings** (Grown-ups → Record your voice) are saved in the browser and, on Cloudflare too (the bucket below), so every device that opens the game plays them. The game plays them first: your recording, then the theme's clip, then the browser voice. The week's sound is only ever played from your recording, because a computer voice can't be trusted to say a sound on its own.

To set up the Google key: in the Google Cloud console create a project, add billing, enable **Cloud Text-to-Speech API**, create an API key restricted to that API, and add a small budget alert. Then in GitHub open **Settings → Secrets and variables → Actions** and add it as `GOOGLE_TTS_API_KEY`.

## Handwriting

Write It reads each letter on the tablet itself (`src/lib/handwriting.js`); nothing is sent anywhere and there is no cost.

- **Which letter is it?** The [$P point-cloud recogniser](https://depts.washington.edu/acelab/proj/dollar/pdollar.html), a well-known method from university research, compares her drawing with a model of each lowercase letter. The game knows which letter belongs in each box, so it only asks whether that letter fits at least as well as any other. Letters that are mirror images (b/d, p/q, n/u) must be the best match outright.
- **How was it formed?** The models follow common UK primary print formation: small letters start at the dotted line, tall letters at the top line, round letters (a c d e g o q) go anticlockwise. A right letter started in a very different place, written the other way round, or not sitting on the lines gets a gentle tip and is shown being written. It is never marked wrong for that.
- **A wrong letter** turns red and is shown being written from a green dot; she has another go at just those letters. If it's still not right, the word is shown and comes back later in the round.
- **Her own letters:** if the game finds one of her letters hard to read, **Grown-ups → Her handwriting** lets her write it and save it. The game then reads her letters against her samples as well as its models. Samples are kept on that device.

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

Some weeks have no sound to practise, like the numbers week (`2026-10-07.json`). Leave out `sound`, write the words without brackets (a review word can keep its brackets, with its spelling in `graphemes`), and list two wrong spellings for each word in `mistakes`, because there are no other spellings of a sound to swap in. That chapter skips Sound Sort and Pick the Patch and ends with a bubble catch of the week's words. `tips` can be keyed by a word as well as by a spelling (`"two": "'two' has a 'w' you can't hear..."`). Wrong spellings that turn out to be real words are still dropped.

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

The game runs as a Cloudflare Worker (settings in `wrangler.jsonc`), with Cloudflare Access in front so only the family can open it. It serves the built site and one small API for shared recordings (`server/worker.js`).

1. **Recordings bucket first:** in the Cloudflare dashboard go to **R2 → Create bucket** and name it exactly `spelling-quest-recordings` (the free tier is plenty). The Worker won't deploy without it.
2. **Connect the repo:** **Workers & Pages → Create application → Import a repository**, pick `spelling-quest`. Build command `npm run build`, deploy command `npx wrangler deploy`, and set the build variable `NODE_VERSION` to `22`. Every merge to `main` then redeploys automatically, including a new week file added in the GitHub web editor.
3. **Make it private:** open the Worker's **Settings → Domains & Routes**, choose **Enable Cloudflare Access** on the `workers.dev` row and on **Preview URLs**, then **Manage Cloudflare Access** and set the policy to allow only the family's email addresses. Visitors get a one-time code by email before they can play. The recordings API is behind the same login.

Until the bucket exists, recordings stay on the device they were made on.

## Full screen on a tablet

- **Big screen** on the home page hides the browser's bars (it uses the browser's full screen mode, so it needs a tap; it hides itself where the browser can't do it). The tablet's Back gesture or **Small screen** brings the bars back.
- **Add to Home Screen** in the browser's menu makes an icon that opens the game full screen (`public/manifest.webmanifest`). The manifest is fetched with the Cloudflare Access login cookie (`crossorigin="use-credentials"` in `index.html`), so sign in once in the browser before adding the icon.

### Home-screen icon

`public/icons/icon.svg` is the source; the PNGs next to it are screenshots of it at 192, 512 (plus a "maskable" copy with a margin) and 180 px for iPad. If you change the SVG, regenerate the PNGs (any SVG-to-PNG tool will do).

Search engines are asked not to index the site (`noindex` in `index.html` and `public/_headers`).
