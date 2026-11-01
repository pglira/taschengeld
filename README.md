# Pocket

A Progressive Web App that manages the pocket money ("Taschengeld") of several children.

- Add, edit and remove children, each with a color. Swipe a child to the left to show Edit and Delete.
- Change the order of the children: tap the order button in the header and drag the handle of a child up or down.
- A new child starts with € 0,00. The start page shows each child with the current balance and the total.
- Add or subtract money with the + and − buttons. Enter the amount with a keypad and add an optional description.
- Tap a child to see the history: each change with the time, the description and the amount. Swipe a change to the left to delete it.
- Back up all data: the backup button exports the data to a JSON file. Import the file on a new phone to replace all data there. The theme is not part of the backup.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/taschengeld/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
