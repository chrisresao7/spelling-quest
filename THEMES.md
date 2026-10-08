# Making a theme

A theme changes how the game looks and the story it tells. It never changes the game itself, so any theme works with any week's words.

```
public/content/themes/
  index.json          # which themes exist and which one is used first
  bluey/              # Beach Day
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
| `story.scenes.<scene>` | One per game: `soundSort`, `pickPatch`, `spellIt`, `tricky`. Each has `speaker` (`hero` or `sidekick`), `title`, `intro` (the story page before it), `prompt` (what the character says while playing), `background` and `item` (a small picture that moves along the progress bar). |
| `rewards` | Sticker pictures, given in order, one per finished chapter. |

Any text can use `{hero}` and `{sidekick}` for the characters' names.

## theme.css

Set any of the `--sq-*` variables from `src/styles.css` under `:root[data-theme='<id>']`, for example `--sq-primary`, `--sq-accent`, `--sq-bg`, the four bag colours `--sq-bucket` to `--sq-bucket-4`, and `--sq-display` for a heading font (load it with `@import` at the top). Keep `--sq-focus` a strong red so the sound's letters match the school sheet.

## Art

- SVG is best (small and sharp on a tablet); PNG and JPG work too.
- Characters: square, about 300×300, standing on the bottom edge, facing right (the home screen flips the sidekick).
- Backgrounds: wide, about 1600×1000, with the interesting part in the top half and plain ground at the bottom where the character and buttons go. Add `preserveAspectRatio="xMidYMax slice"` to SVG backgrounds.
- Stickers: square, round sticker shape.
- Only use art you made or have the right to use. The Beach Day pups are original drawings, not pictures of any TV characters.
