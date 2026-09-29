# Security

## Authentication

- Session tokens in httpOnly cookies (`vda_session`)  
- Token hashed (SHA-256) at rest  
- bcrypt password hashing (cost 12)  
- Auth rate limiting  

## Application hardening

- Helmet security headers  
- CORS restricted to `CORS_ORIGIN`  
- Zod input validation  
- Prisma parameterized queries  
- Express JSON body size limits  
- Audit logging for signup/login/logout  

## Secrets

- `SESSION_SECRET`, `ENCRYPTION_KEY`, exchange keys via env only  
- Exchange credentials encrypted AES-256-GCM  
- Never log plaintext secrets  

## Exchange policy

- Read-only scopes only  
- No trade / withdraw  
- No storage of exchange passwords  

## CSRF

Cookie `SameSite=Lax` for session. Additional CSRF tokens recommended when mutating from third-party origins in production hardening (Phase 10).
