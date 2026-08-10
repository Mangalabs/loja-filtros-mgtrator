# ARQUIVO 7

# CAMINHO: <project>/.agents/security.md

# ============================================================

# SECURITY RULES

Treat these as high-risk surfaces:

- authentication;
- authorization;
- roles;
- permissions;
- payments;
- account ownership;
- secrets;
- personal data;
- file uploads;
- webhooks;
- administrative features.

# 1. AUTHENTICATION VS AUTHORIZATION

Authentication establishes identity.

Authorization establishes permission.

Authentication does not imply authorization.

Authorization must be enforced server-side.

Never trust client-provided:

- user IDs;
- roles;
- ownership;
- permissions;

without validation against trusted server-side state.

---

# 2. SECRETS

Never:

- hardcode credentials;
- expose backend secrets to frontend bundles;
- commit secrets;
- log access tokens;
- log refresh tokens;
- log passwords;
- return sensitive configuration through APIs.

Use the repository's established environment/configuration mechanism.

---

# 3. INPUT SECURITY

Treat external input as untrusted.

Consider risks including:

- injection;
- path traversal;
- malicious uploads;
- unexpected MIME types;
- malformed webhooks;
- hostile external API payloads;
- unsafe redirects;
- unsafe dynamic queries.

Use established validation and sanitization mechanisms.

---

# 4. LOGGING

Do not unnecessarily log:

- passwords;
- access tokens;
- refresh tokens;
- API secrets;
- complete payment information;
- sensitive personal information.

Logs should contain enough context to debug problems without exposing secrets.

---

# 5. SECURITY FIXES

Never disable a security mechanism merely to make a feature or test pass.

Fix the underlying incompatibility.

Do not silently reduce validation or authorization requirements.
