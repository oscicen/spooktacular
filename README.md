# Spooktacular Costume Awards

A no-login Halloween costume rating app built for Vercel. Guests can add contestants, upload a costume portrait, and score each costume across five categories. Scores remain hidden during judging and are only available at `/results` with the organizer's secret code.

## What it includes

- Shared costume roster with photos and descriptions
- Five 1–5 judging criteria: originality, creativity, effort, craftsmanship, and spooky presence
- One editable vote per browser per costume
- Hidden, code-protected results page with podium, overall average, vote count, and category breakdown
- Organizer-only contestant removal from the protected results page (including photo and votes)
- Responsive gothic-storybook design
- Vercel Blob storage (no separate database account needed)
- GitHub-ready automatic Vercel deployments

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app needs a public Vercel Blob store to load and save party data. After linking the project with Vercel, run `vercel env pull` to fetch `BLOB_READ_WRITE_TOKEN` locally.

## Deploy to Vercel with GitHub

1. Create a GitHub repository and push this folder to its `main` branch.
2. In Vercel, choose **Add New → Project**, import the repository, and deploy it.
3. In the Vercel project, open **Storage → Create Database → Blob**. Create a **Public** store and connect it to Production, Preview, and Development. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
4. In **Settings → Environment Variables**, add `RESULTS_CODE` with a private code of your choice for all environments.
5. Redeploy once after adding the storage and environment variable.

Every later push to `main` deploys to production automatically. Other branches and pull requests receive preview deployments.

## Results access

- Code entry: visit `/results` and enter `RESULTS_CODE`.
- Secret link: share `/results?code=YOUR_CODE` only with organizers.

The code is checked server-side. It is not included in the client bundle.

## Data notes

Vercel Blob stores each costume and vote as a separate JSON object. Costume images are public because they are displayed to every guest. A randomly generated browser ID makes repeat submissions update the same vote rather than add another one; this is suitable for a friendly party, not adversarial public voting.
