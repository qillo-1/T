# Moonie Tales 🌙 Story Studio

A free website that turns a story, your own pictures and your own audio into a vertical (9:16) video. It runs entirely in your browser. There is no server, no AI, no API key and nothing to pay for.

## Publish it on GitHub Pages

1. Sign in at github.com and click **New repository**. Name it (for example `moonie-tales`), choose **Public**, and click **Create repository**.
2. Click **uploading an existing file**, drag in `index.html`, `style.css`, `script.js` and `README.md`, then click **Commit changes**.
3. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then click **Save**.
4. Wait a minute or two. Your site will be at `https://YOUR-USERNAME.github.io/moonie-tales/`.

All files use relative paths, so the site works under a repository path. To test locally, double-click `index.html`.

## How to use it

1. **Story:** type a title, paste the story, choose sentences or paragraphs, and click *Split into scenes*. Edit any scene text.
2. **Pictures:** upload your artwork once, then pick the same picture for as many scenes as you like. Choose *contain* or *cover* and a motion (zoom or pan) per scene.
3. **Scenes:** set each scene's seconds, and move, duplicate or delete scenes.
4. **Audio:** add narration, music and a sound effect, each with its own volume, start time and fades. *Match scene lengths to narration* spreads your scenes across the narration by word count.
5. **Preview** the video, then click **Record and download video**.

## Good to know

- **Keep the tab open and visible while exporting.** Recording happens in real time, so a 2-minute story takes about 2 minutes.
- **Formats:** Chrome, Edge and Firefox save **WebM**. Safari may save **MP4**. The file extension always matches what was actually recorded. Browsers cannot convert WebM to MP4 without extra software. For YouTube, WebM uploads fine.
- **Size:** use 720 × 1280 on phones and older computers. 1080 × 1920 needs a stronger device.
- **Privacy:** pictures and audio never leave your device.
- **Saving:** the project `.json` keeps your text, settings and file names, but not the pictures or audio. After a refresh or a load, select those files again (same file names relink automatically). Keep your own copies of your assets.
- There is one track each for narration, music and sound effect. Music that is shorter than the video plays once, and longer music is cut at the end.
