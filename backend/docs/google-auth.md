# Google authentication

`POST /auth/google` accepts `{ "idToken": "..." }`. The frontend uses the
Google Identity Services sign-in button (`GoogleLogin`) and sends its
`credential`, not an OAuth access token. The backend verifies the token with
`google-auth-library` / `verifyIdToken` before any database access.

Required configuration (do not put secrets in version control):

- Backend: `GOOGLE_CLIENT_ID` and the existing `JWTSECRET`.
- Frontend build: `VITE_GOOGLE_CLIENT_ID` with the same web client ID and
  `VITE_API_URL` with the HTTPS backend URL.
- Configure the intended HTTPS frontend origins in Google Identity Services
  and the backend CORS allowlist before enabling this in production.

Missing backend configuration fails closed with HTTP 503. Validation errors
return 401. Successful authentication returns the existing ReVeste JWT shape
(`id`, stored `email`, stored `role`, expiry 48 hours).

## Identity and linking

Google users are identified by `googleSub`. New Google accounts always have
role `user` and a random, hashed password. Tokens cannot supply roles or user IDs.
For an existing sub, the stored role and email remain authoritative.

An email match without a matching sub returns HTTP 409 / `GOOGLE_LINK_REQUIRED`.
It does not modify the account or issue a session, even if the caller supplies
a local JWT or password. This includes administrative accounts. There is no
linking endpoint in this version. Until an explicit confirmation flow with
fresh local reauthentication is designed and tested, the user must use their
traditional login. Do not manually attach identities as an authentication shortcut.

## Database prerequisite (not performed by this change)

The schema declares two named unique indexes:

- `google_sub_unique`: `{ googleSub: 1 }`, partial filter
  `{ googleSub: { $type: "string" } }`. Existing users can omit the field.
- `email_case_insensitive_unique`: `{ email: 1 }`, collation
  `{ locale: "en", strength: 2 }`. Prevents case variants and registration races.

Before production rollout, audit existing emails for case-insensitive
duplicates and Google identities for duplicates. Resolve any collisions through
an authorized process. This email constraint intentionally prevents new case
variants of existing accounts; traditional login lookup itself is unchanged.
Provision the declared indexes using the approved database migration process.
Do not drop indexes, run `syncIndexes`, or connect to production from tests.
Production uses administratively managed indexes. The first import of
`backend/index.js` is `config/mongoose.js`: it loads dotenv and sets Mongoose's
global `autoIndex` to `false` when `NODE_ENV=production`, before routes or models
are evaluated. All current schemas inherit this policy; do not add schema or
connection overrides that enable automatic indexing in production. Development
and test keep Mongoose's existing defaults. This does not disable collection
auto-creation or prohibit explicit administrative index commands.

In production, Google login skips `User.init()` and only inspects actual index
definitions with `listIndexes`. Missing indexes, a missing collection, or lack
of permission to inspect indexes result in HTTP 503, without creating an
account or trying to create indexes. Outside production it still awaits
`User.init()` before inspection, preserving development/test behavior.
The existing unique email constraint is preserved. Duplicate-key races return
409; they never fall back to authentication by email.

Before deployment, verify `NODE_ENV=production`, audit duplicates and provision
all required indexes through the approved migration process. Inspect their
completed definitions before enabling Google login. Startup and requests must
not serve as a migration tool. Existing traditional login and registration do
not depend on this Google-only index inspection, but registration still needs
the existing unique email index to enforce uniqueness. Disabling `autoIndex`
does not remove, rebuild or repair any existing index.

## Offline verification

Run `node --test backend/tests/*.test.js` from the project root after installing
backend dependencies. Security tests use real RSA signatures, the official
Google verifier, bcrypt and JWT. They replace certificate retrieval with local
keys and replace persistence with an in-memory model. No `.env` is read and
no Google or MongoDB connection is made. The schema is inspected offline;
actual MongoDB index enforcement remains a deployment prerequisite.
