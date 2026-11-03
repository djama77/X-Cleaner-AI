# X-Cleaner-AI

AI-powered X/Twitter tool to detect automated posts, preserve personal tweets, and support selective cleanup using Groq.

## Project status

Initial scaffold in preparation. The first release is analysis-only: it will classify posts as automated, personal, or uncertain. It will not delete posts automatically.

## Safety and privacy

- Keep the original X archive unchanged and work on a copy.
- Never commit API keys, access tokens, or personal archives.
- Store `GROQ_API_KEY` only as a server-side environment variable.
- Require user review before any future account action.

## Planned stack

- Next.js and TypeScript
- Groq API for optional AI-assisted classification
- Vercel for deployment

## Development

The implementation will be developed on the `develop` branch and reviewed before merging into `main`.
