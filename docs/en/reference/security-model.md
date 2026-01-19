# Security Trust Model

> Our security model is **"guilty until proven innocent"**—we assume the network is hostile and rely on cryptographic guarantees.

## Threat Model

| Attack Type | Scenario |
|-------------|----------|
| **Malicious Frontend** | Fake App phishing for passwords |
| **Malicious Backend** | Fake Router returning deceptive content |
| **Man-in-the-Middle** | DNS hijacking, intercepted communications |

## Defense Layers

### Layer 1: Z-Handshake (Zero-Knowledge)

**Core Principle**: User's plaintext password never travels through any frontend.

**Defense Mechanism**:
```
1. User enters password in App
2. Client-side PBKDF2 hash
3. Server returns dynamic Challenge
4. Client signs Challenge with hash
5. Server verifies signature
```

**Attack Analysis**:
- Attacker gets password from fake App
- But cannot obtain server's dynamic Challenge
- Even forwarded hash only valid for that session
- **Result**: Password leak cannot enable persistent account control

### Layer 2: Code Signing & Certificate Pinning

**App Signing**:
- Official App certified by platform vendor
- Private nodes can verify App authenticity
- Repackaged fake versions fail validation

**Certificate Pinning**:
- Official App embeds server SSL certificate fingerprint
- MITM attacks trigger certificate mismatch alert
- Connection automatically blocked

### Layer 3: UI Source Identification

**Security Overlay**:
When rendering any server content, bottom displays:
```
Current node: FANG_PUB (Official)
Current node: 192.168.1.5 (Private)
```

**Anti-Spoofing**:
- Overlay drawn by client native code
- Backend cannot modify or hide this label
- User always knows who's responding

## Data Sovereignty

```
┌─────────────────────────────────────┐
│  Public (FANG_PUB)                  │
│  - Can fall, but just an entry      │
└─────────────────┬───────────────────┘
                  │ Cannot access
                  ↓
┌─────────────────┴───────────────────┐
│  Private Node (Your server)         │
│  - Local assets controlled by key   │
│  - Entry compromise doesn't help    │
└─────────────────────────────────────┘
```

## Summary

| Attack | Defense Result |
|--------|----------------|
| Fake frontend | Z-Handshake protects, no permissions gained |
| Fake backend | Source label protects, can't impersonate official |
| MITM attack | Certificate pinning blocks connection |
| Malicious service | V-certification blocks high-risk APIs |
