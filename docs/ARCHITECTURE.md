# Architecture and behavior

## Static application boundary

All deployable files live in `dist/`. A static host needs JavaScript module MIME types for `.mjs`; `scripts/serve.mjs` supplies these locally. Navigation uses `#/learn`, `#/lesson/greetings`, `#/practice`, `#/phrasebook`, `#/library`, `#/library/small-steps`, `#/achievements`, `#/profile` and `#/about`. No server rewrite is needed for these routes.

`app.mjs` owns a single application state object and ephemeral quiz/review sessions. A route change discards the unfinished quiz; completed card ratings are saved individually. The skip link deliberately focuses the main landmark without changing the hash route.

## State schema v1

```json
{
  "version": 1,
  "profile": { "name": "", "goal": 10, "reducedMotion": false },
  "completedLessons": {},
  "reviews": {},
  "favorites": [],
  "readArticles": [],
  "activityDays": [],
  "reviewRewards": []
}
```

- `completedLessons[lessonId]`: `{score, completedAt}`. Current curriculum scores are 75 or 100 for a pass.
- `reviews[phraseId]`: `{stage, due, lastReviewed, repetitions}`.
- `reviewRewards`: unique `YYYY-MM-DD:phrase-id` entries; XP derives from these records and passed lesson count.
- Dates use the device's local calendar rather than UTC slicing. Date arithmetic uses local noon to avoid common day-boundary errors.

There is no standalone stored XP total to get out of sync with activity records. All writes pass through `save`; quota or storage errors surface a notice and leave a usable in-memory session. Cross-tab storage events refresh rendered progress, but simultaneous independent writes are last-write-wins: this is not distributed synchronization.

## Domain transitions

`completeLesson` and `reviewPhrase` clone their input state and return the next state with a result. Neither depends on the DOM or browser storage. Both accept an explicit day for deterministic testing.

Card quality values are 0 (difficult), 1 (remembered), and 2 (easy). New cards enter stage 0 regardless of a positive rating. A positive review on the same day cannot advance the stage again; a difficult answer may still shorten the interval. Repetitions can increase without increasing XP. Review sessions prioritize overdue cards, then unseen ones. When every card is scheduled for the future, a clearly labeled free-practice session is offered.

## Untrusted input

Imported files are size-limited to 2 MB and parsed as JSON. `validateImport` reconstructs known fields rather than spreading user objects. It rejects unknown lesson/phrase/article IDs, duplicate lists, invalid dates, wrong types, unsupported schema versions, out-of-range goals and schedules, and prototype-pollution keys used as content IDs. Profile names are escaped before HTML rendering. Search strings are used as data only.

This validation protects application integrity, not the truth of learning claims: a user can intentionally edit their own local history. That is appropriate for a self-study tool, but unsuitable for credentials or a competitive leaderboard.

## Browser APIs

- `localStorage`: local persistence; no server upload.
- `speechSynthesis`: a `kk` voice must exist; absent support receives explicit feedback. Voice availability does not imply linguistically validated pronunciation.
- File API and Blob URLs: portable JSON backups.
- `prefers-reduced-motion` and the profile override: reduce transitions.

## Deployment

Serve the contents of `dist/` with any static host. Assets are relative so a project subpath is supported. The `.openai/hosting.json` file, when present, belongs to the hosting integration; do not copy its project identity into an unrelated fork. The local server binds only to `127.0.0.1`, resolves requested paths against `dist/`, rejects requests outside that root, and sends a restrictive content security policy. Hosted security headers depend on the host.

The buildless approach trades framework ecosystems for inspectability and portability. The largest next engineering improvements would be isolated route controllers, automated browser coverage, and a richer content authoring/validation pipeline before the curriculum expands substantially.
