# Making a theme

The learning rules in [CLAUDE.md](CLAUDE.md) apply to every theme: wrong spellings are never real words, and split spellings like a‑e are shown with two gaps (m _ d _). A theme only changes looks and story text, so it can't break them, but any story line that shows spellings must follow them too.

A theme changes how the game looks and the story it tells. It never changes the game itself, so any theme works with any week's words.

```
public/content/themes/
  index.json          # which themes exist and which one is used first
  bluey/              # Beach Day
  unicorns/           # Rainbow Valley
    theme.json
    theme.css
    art/
  _template/          # copy this to start a new theme
```

## Steps

1. Copy `_template/` to a new folder, e.g. `unicorns/`. The folder name is the theme's id.
2. Fill in `theme.json` (below) and draw or add the art.
3. In `theme.css`, change `my-theme` to the folder name and set the colours.
4. Add the id to `themes` in `index.json`. Set `default` to it to make it the theme the game starts with. Once there are two or more themes, a theme picker appears on the home screen.

Asking Claude for "a new theme: unicorns at the zoo" does all of this in one pull request.

## theme.json

| Key | What it's for |
|---|---|
| `name` | Shown on the home screen and in the sticker book. |
| `characters.hero`, `characters.sidekick` | `name`, plus `art` with a picture for each mood. `happy` is used most; `thinking` shows after a wrong answer. A missing mood falls back to `happy`. |
| `home.background` | Background of the home and sticker book screens. |
| `lines` | Lists of things the characters say; one is picked at random. `correct` can use `{word}`. Also `tryAgain`, `prompt` and `chapterEnd`. |
| `story.title`, `story.intro`, `story.background` | The opening page. |
| `story.endTitle`, `story.ending`, `story.endBackground` | The last page, where the sticker is given. |
| `story.scenes.<scene>` | One per game: `soundSort`, `pickPatch`, `lookRight`, `spellIt`, `writeIt` (writing the words with a finger), `tricky`, `trickyCatch`, and `wordCatch` (bubble catch with the week's own words, for a week with no sound, like the numbers). Each has `speaker` (`hero` or `sidekick`), `title`, `intro` (the story page before it), `prompt` (what the character says while playing), `background` and `item` (a small picture that moves along the progress bar). |
| `rewards` | Sticker pictures, given in order, one per finished chapter. |
| `voice` | Who says what, and in which voice (below). |

Any text can use `{hero}` and `{sidekick}` for the characters' names.

## Voice

Each theme has its own voices. The `voice` block in `theme.json` picks a voice for each speaker:

```json
"voice": {
  "engine": "google",
  "narrator": { "name": "en-AU-Chirp3-HD-Schedar", "rate": 1 },
  "hero": { "name": "en-AU-Chirp3-HD-Leda", "rate": 1.05 },
  "sidekick": { "name": "en-AU-Chirp3-HD-Zephyr", "rate": 1.05 },
  "word": { "name": "en-GB-Neural2-F", "rate": 0.8 },
  "browser": { "lang": "en-GB" }
}
```

- `narrator` reads the story pages and the sticker book. `hero` and `sidekick` say the speech-bubble lines. `word` says the spelling words, slowly. Keep `word` a British voice so words sound the way school says them.
- `name` is a Google Cloud Text-to-Speech voice. Its first part is the accent (`en-AU` Australian, `en-GB` British). `rate` is speed (1 is normal) and `pitch` is in semitones (0 is normal; the newer “Chirp3-HD” voices don't take a pitch, so it's left out for them).
- `browser` is what the tablet's own voice uses for any line that has no clip yet.
- Use stock voices only. Never copy a real person's or a TV character's voice.

The clips themselves are made by GitHub (`.github/workflows/voice.yml` runs `npm run voice`) whenever a theme or week changes, and saved in the theme's `voice/` folder. Don't edit that folder by hand. To hear what voices there are, run the **Voice clips** workflow from the Actions tab with "Make voice samples" ticked (or add an empty `voice-samples/WANTED` file in a pull request). The samples land in `voice-samples/`; delete that folder once you have chosen.

Grown-ups can also record the week's sound, and any word, in their own voice from the home screen's **Grown-ups** button. Those recordings are used before any clip.

## theme.css

Set any of the `--sq-*` variables from `src/styles.css` under `:root[data-theme='<id>']`, for example `--sq-primary`, `--sq-accent`, `--sq-bg`, the four bag colours `--sq-bucket` to `--sq-bucket-4`, and `--sq-display` for a heading font (load it with `@import` at the top). Keep `--sq-focus` a strong red so the sound's letters match the school sheet.

## Art

- SVG is best (small and sharp on a tablet); PNG and JPG work too.
- Characters: square, about 300×300, standing on the bottom edge, facing right (the home screen flips the sidekick).
- Backgrounds: wide, about 1600×1000, with the interesting part in the top half and plain ground at the bottom where the character and buttons go. Add `preserveAspectRatio="xMidYMax slice"` to SVG backgrounds.
- Stickers: square, round sticker shape.
- Only use art you made or have the right to use. The Beach Day pups are original drawings, not pictures of any TV characters.
