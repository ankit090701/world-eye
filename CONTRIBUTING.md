# Contributing to WorldEye

Thanks for wanting to help. Contributions of any size are welcome, from fixing a typo
to adding a new data source.

## Ways to contribute

- Fix a bug or polish the UI
- Add a new free, keyless data source
- Improve the docs in `README.md` or `docs/`
- Add tests (there aren't many yet)

Not sure where to start? Open an issue and ask.

## Getting set up

1. Fork the repo on GitHub, then clone your fork and install:

   ```bash
   git clone https://github.com/<your-username>/world-eye
   cd world-eye
   npm install
   ```

2. Start the app. The web app runs on http://localhost:5173 and the API on :8787.

   ```bash
   npm run dev
   ```

   Prefer Docker? Run `docker compose up --build -d` and open http://localhost:8080.

You need Node.js 20.19+ or 22.12+. No API keys are required.

## Making a change

1. Create a branch for your change:

   ```bash
   git checkout -b fix-satellite-popup
   ```

2. Make your change. Keep each pull request focused on one thing.
3. Check that everything still type-checks:

   ```bash
   npm run typecheck
   ```

4. Commit with a short, clear message and push to your fork:

   ```bash
   git commit -m "fix satellite popup position"
   git push origin fix-satellite-popup
   ```

5. Open a pull request against `main`. Say what you changed and how you tested it;
   screenshots help for UI changes.

I'll review it, may suggest changes, and merge it once it's ready.

## Guidelines

- Use only free, keyless data sources, and keep the fallback to sample data when an
  upstream fails.
- Keep the OSINT and cyber features passive and limited to public data: no scanning of
  targets and no private-data lookups.
- Match the existing code style (TypeScript, no semicolons, single quotes) and comment
  only what the code doesn't already make clear.
- Update the docs when you change how something works.

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
