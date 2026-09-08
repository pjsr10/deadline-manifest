# Manifest

A deadline list that sorts itself, with each signed-in person seeing only
their own items. Built with Vite + React, backed by Supabase (Postgres +
auth), deployed for free via GitHub Pages.

## 1. Set up Supabase

You already have an account, so:

1. Create a new project at [supabase.com](https://supabase.com) (or use an
   existing one) — free tier is plenty for this.
2. Go to the **SQL Editor** and run:

   ```sql
   create table items (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     name text not null,
     deadline date not null,
     created_at timestamptz default now()
   );

   alter table items enable row level security;

   create policy "select own items"
     on items for select
     using (auth.uid() = user_id);

   create policy "insert own items"
     on items for insert
     with check (auth.uid() = user_id);

   create policy "delete own items"
     on items for delete
     using (auth.uid() = user_id);
   ```

   The `user_id references auth.users` line ties every row to a real
   signed-in person, and the three policies are what actually enforce
   "you can only see and touch your own rows" — without them, Row Level
   Security defaults to blocking everything.

3. Email magic-link sign-in is on by default under **Authentication >
   Providers > Email**, nothing else to configure there.
4. Go to **Settings > API** and copy the **Project URL** and the **anon
   public** key — you'll need both twice: once locally, once in GitHub.

## 2. Run it locally

```bash
cp .env.example .env
# paste your Project URL and anon key into .env
npm install
npm run dev
```

Open the printed `localhost` URL, enter your email, and check your inbox
for the sign-in link.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create deadline-manifest --public --source=. --push
```

(No `gh` CLI? Create the repo on github.com instead, then `git remote add
origin <url>` and `git push -u origin main`.)

If you name the repo something other than `deadline-manifest`, update the
`base` path in `vite.config.js` to match — it has to be `/your-repo-name/`
exactly, or the deployed site will load with broken paths.

## 4. Add your Supabase keys as GitHub secrets

In your new repo: **Settings > Secrets and variables > Actions**, add two
repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are the same two values from your `.env` — the deploy workflow
needs them to bake into the production build, since GitHub Pages can't
read your local `.env` file.

## 5. Turn on GitHub Pages

In the repo: **Settings > Pages**, set **Source** to **GitHub Actions**.
That's it — the workflow in `.github/workflows/deploy.yml` handles the
rest and runs automatically on every push to `main`.

Check the **Actions** tab for progress. Once it finishes, your app is
live at `https://<your-username>.github.io/deadline-manifest/`.

## 6. Share it

Send that URL to your 3 testers. Each one enters their email, clicks the
link Supabase sends them, and gets their own private list from then on.

## Notes

- Supabase's free tier pauses a project after 7 days with no activity —
  one click in the dashboard un-pauses it, but it's worth knowing about
  if testing goes quiet for a while.
- The anon key is meant to be public — it's safe to have it visible in
  the deployed site's JS bundle. What actually protects each person's
  data is the Row Level Security policies from step 1, not keeping the
  key secret.
