<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the uploaded Sudanese hero artwork as the home hero because the user explicitly preferred the original image over a CSS reconstruction.
- Keep the app on TanStack Start SSR routing for portable hosting; do not add SPA fallback rewrites because nested routes are server-rendered.
- Vercel builds use the nitro "vercel" preset only when VERCEL is set (vite.config.ts); Lovable hosting keeps its default target because the sandbox forces it.
