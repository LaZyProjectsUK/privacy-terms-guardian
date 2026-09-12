# Privacy & Terms Guardian — Chrome Extension

## Purpose

A Chrome extension that protects users before and during website use by analysing:

- Terms & Conditions
- Privacy Policies
- Cookie consent
- Marketing/email permissions
- Data sharing and selling
- Tracking and profiling

It should explain risks in plain English and, where possible, automatically protect the user's privacy.

## Core Features

### 1. Privacy & Terms Analysis

Analyse the site's policies and identify:

- Personal data collected
- Whether data is sold or shared
- Third-party/partner sharing
- Advertising and profiling
- Email/SMS/marketing permissions
- Data retention
- AI training/data usage
- International data transfers
- Account termination
- Automatic renewals
- Refund/cancellation restrictions
- Broad liability or content licences
- Unusually one-sided terms

Pay particular attention to qualifications hidden behind reassuring statements such as:

> "We don't sell your personal information."

Compare this with the detailed policy to identify exceptions that may allow sharing, marketing or disclosure.

### 2. Privacy Risk Report

Give simple classifications:

- 🟢 Reasonable
- 🟡 Worth knowing
- 🟠 Concerning
- 🔴 High concern

Every significant finding should link back to the exact clause in the policy.

Example:

**🔴 Marketing email risk — HIGH**

The policy permits your email address to be used for marketing and/or shared with selected partners.

### 3. Cookie Protection

Automatically detect cookie consent systems.

Preferred behaviour:

1. Reject all non-essential cookies where possible.
2. If there is no "Reject All", open preferences.
3. Disable optional categories.
4. Leave strictly necessary cookies enabled.
5. Save preferences.
6. Verify that the intended settings were actually applied.

Categories should include:

- Necessary
- Functional
- Analytics
- Advertising
- Personalisation
- Social Media
- Other

Use deterministic rules for known consent platforms rather than AI where possible.

Use AI only when the consent interface is unfamiliar or ambiguous.

### 4. Marketing Protection

Identify whether signing up may result in:

- Marketing emails
- Partner emails
- SMS marketing
- Telephone marketing
- Push notifications
- Advertising profiling

Distinguish between:

- Explicit opt-in
- Pre-ticked consent
- Opt-out
- Consent buried in Terms
- Consent inferred from use
- Sharing with marketing partners

### 5. Find Better Alternatives

Identify websites providing the same or substantially similar service.

Compare them against the current site:

- Privacy
- Data sharing
- Marketing
- Cookies/tracking
- Terms
- Data retention
- User rights

Example:

| Service | Function | Privacy | Terms | Cookies | Overall |
|---|---|---|---|---|---|
| Current site | Same | 🔴 | 🟠 | 🔴 | 42/100 |
| Alternative A | Same | 🟢 | 🟢 | 🟢 | 91/100 |
| Alternative B | Same | 🟢 | 🟠 | 🟢 | 82/100 |

The goal is not simply to find the "best" website, but the best alternative matching the user's privacy preferences.

### 6. Personal Privacy Profile

Allow users to define preferences such as:

- No sale of personal data
- No advertising-partner sharing
- No marketing emails unless explicitly requested
- No behavioural profiling
- Essential cookies only
- No data used for AI training
- Minimal data retention
- No cross-site tracking

Use these preferences when analysing sites and recommending alternatives.

## AI Role

Use GPT-6 Astra for:

- Understanding policies
- Detecting hidden qualifications and exceptions
- Comparing statements across different policy sections
- Explaining clauses in plain English
- Determining what a website actually provides
- Finding semantically similar alternative services
- Handling unfamiliar cookie/consent interfaces

Do NOT use AI for every cookie action.

Use deterministic browser rules/APIs for known consent systems and use AI as a fallback for ambiguous interfaces.

## Architecture

### Chrome Extension

- TypeScript
- Chrome Manifest V3
- Content scripts
- Background/service worker
- Extension popup/sidebar

### Backend

- Node.js
- TypeScript
- OpenAI Responses API
- GPT-6 Astra

The OpenAI API key must remain on the backend and never be embedded in the extension.

### Browser Controls

Expose controlled tools such as:

- Read page
- Read policy
- Find consent controls
- Click element
- Toggle setting
- Enter text
- Scroll
- Open page
- Verify cookie/consent state

The extension must validate AI-generated actions before executing them.

## Main User Experience

### Analyse

"What does this website's policy actually mean?"

### Protect

"Reject non-essential cookies and verify the result."

### Find Better

"Find equivalent services with better privacy and terms."

### Protect Automatically

"Apply my privacy preferences automatically on future websites."

## Important Safety/Accuracy Rules

- Do not claim a term is illegal unless supported by appropriate legal analysis.
- Prefer wording such as "potentially unfair", "unusually one-sided" or "potential privacy concern".
- Always show the source clause for significant findings.
- Clearly distinguish facts from AI interpretation.
- Never silently accept optional cookies or marketing consent.
- Never submit forms or provide personal information without explicit user control.
- Verify cookie settings after changing them.

## Product Positioning

**A personal privacy agent for the web.**

The key differentiator is not simply analysing Terms & Conditions. It connects:

**Privacy Policy + Terms + Cookies + Marketing + User Preferences + Better Alternatives**

to answer the question:

> "Before I use this website, what am I agreeing to, what could happen to my data, and is there a better alternative?"

## Product Hunt / GPT-6 Astra Challenge Packaging

### Recommended Product Format

For the GPT-6 Astra Challenge, the product should be packaged as a **Chrome extension + web backend**, rather than as a standalone website or an extension containing the OpenAI API key.

The Chrome extension is the user-facing product and gives the AI controlled access to the browser. The backend handles Astra requests, policy analysis, comparison, alternative discovery, user privacy preferences, and any server-side caching/storage.

Recommended architecture:

```text
Chrome Extension
       |
       | HTTPS API
       v
Your Backend API
       |
       | OpenAI Responses API
       v
GPT-6 Astra
```

### Why a Chrome Extension?

The extension makes the product immediately useful on real websites because it can:

- Detect Terms & Conditions and Privacy Policy pages.
- Extract and analyse policy text.
- Highlight clauses directly on the page.
- Detect cookie consent interfaces.
- Reject non-essential cookies.
- Open detailed cookie preferences when necessary.
- Toggle optional consent categories off.
- Save and verify the resulting consent state.
- Detect marketing/email consent during sign-up flows.
- Apply the user's privacy profile.
- Help the user decide whether to continue with the current website.
- Find alternative websites offering substantially the same service.

A website-only implementation would make the most interesting browser-control part of the product much harder to demonstrate.

### Why Not Put Astra Directly in the Extension?

The OpenAI API key must **never** be embedded in the Chrome extension.

The extension should communicate with our backend. The backend calls GPT-6 Astra through the OpenAI Responses API.

This also gives us a central place to:

- Control prompts and tools.
- Validate requests.
- Cache expensive analysis.
- Rate-limit users.
- Store privacy profiles if required.
- Add authentication later.
- Change models without rebuilding the extension.

### Astra Browser-Control Pattern

Astra should not have unrestricted control over Chrome.

Use a controlled tool/action architecture:

```text
Astra decides what needs to happen
          |
          v
Structured action request
          |
          v
Extension validates the action
          |
          v
Chrome executes the action
          |
          v
Extension verifies the result
          |
          v
Result returned to Astra
```

Example actions:

- `read_page`
- `read_policy`
- `find_consent_controls`
- `click_element`
- `toggle_consent`
- `scroll`
- `open_page`
- `highlight_clause`
- `verify_consent_state`

Every action should have strict validation so that an AI decision cannot accidentally click unrelated controls, submit forms, or disclose personal information.

### Cookie Automation Strategy

Do not use Astra for every cookie interaction.

Use deterministic code for known consent platforms and common patterns. This will be faster, cheaper, and more reliable.

For unfamiliar or ambiguous interfaces, Astra can inspect the page and determine the appropriate action.

Preferred workflow:

1. Detect the consent platform/interface.
2. If a known deterministic handler exists, use it.
3. Otherwise ask Astra to identify the relevant controls.
4. Validate Astra's proposed action.
5. Disable all non-essential categories.
6. Leave strictly necessary cookies enabled.
7. Save the settings.
8. Re-read the interface/cookies where possible.
9. Verify that optional consent is actually disabled.
10. Report the result to the user.

### Main Product Hunt Demo

The strongest demo should show one complete end-to-end workflow rather than a collection of unrelated features.

Suggested demonstration:

```text
User visits a website
        |
        v
Privacy Guardian detects the site's policies
        |
        v
Analyse Privacy
        |
        v
Astra finds reassuring headline claims
and contradictory/qualifying language elsewhere
        |
        v
Risk is explained in plain English
with the exact source clause
        |
        v
User selects Protect
        |
        v
Non-essential cookies are rejected
        |
        v
Extension verifies the consent state
        |
        v
Find Better
        |
        v
Astra identifies equivalent services
with better privacy/terms
```

The key message is:

> **Before I use this website, tell me what I am agreeing to, protect me from unnecessary tracking, and show me a better alternative if one exists.**

### Recommended Project Structure

```text
privacy-guardian/
│
├── extension/
│   ├── manifest.json
│   ├── background.ts
│   ├── content.ts
│   ├── popup.ts
│   ├── sidebar.ts
│   ├── cookie-engine/
│   ├── policy-analyser/
│   ├── policy-highlighter/
│   └── browser-tools/
│
├── api/
│   ├── server.ts
│   ├── astra.ts
│   ├── analysis.ts
│   ├── alternatives.ts
│   ├── privacy-profile.ts
│   └── routes/
│
├── web/
│   └── landing-page/
│
└── README.md
```

Use **TypeScript** across the extension and backend where practical.

### Product Hunt Packaging

The submission should present Privacy & Terms Guardian as a real product, not merely an AI demo.

Recommended package:

1. **Chrome extension** — the main product users interact with.
2. **Backend API** — securely connects the extension to GPT-6 Astra.
3. **Simple landing page** — explains the product and provides the project/demo link.
4. **GitHub repository** — contains the extension and backend source where appropriate.
5. **Short product demo video/GIF** — demonstrates the complete Analyse → Protect → Find Better workflow.
6. **README** — explains the architecture, Astra integration, browser tools, safety controls, and setup.

The Chrome extension should be the headline product because it demonstrates something Astra is particularly well suited to: reasoning about real web interfaces and taking controlled browser actions on the user's behalf.

### Challenge-Focused MVP

Do not attempt to build the entire vision before the challenge launch.

The MVP should concentrate on three spectacular capabilities:

#### 1. Analyse

Analyse a website's Privacy Policy and Terms and identify hidden qualifications, data sharing, marketing permissions, tracking, retention, and unusually one-sided clauses.

#### 2. Protect

Automatically reject non-essential cookies, including navigating complicated preference panels, then verify that the intended settings were applied.

#### 3. Find Better

Determine what service the user is trying to use and identify equivalent alternatives with better privacy and terms, taking the user's privacy profile into account.

Everything else can be presented as the roadmap.

### Product Differentiator

The product should not be positioned as simply another Terms & Conditions summariser.

Its differentiator is the combination of:

```text
Privacy Policy
      +
Terms & Conditions
      +
Cookie Protection
      +
Marketing Protection
      +
Personal Privacy Profile
      +
Browser Automation
      +
Better Alternatives
```

Positioning:

> **A personal privacy agent for the web.**

The product does not merely tell the user what a website's policies say. It helps the user understand the consequences, actively protects their preferences, and suggests a better option when one exists.

### Challenge Submission Considerations

The GPT-6 Astra Challenge is intended to showcase ambitious products built with Astra. The implementation should therefore make Astra's contribution obvious rather than using it as an invisible text-generation layer.

The demo should visibly show Astra doing meaningful work such as:

- Resolving contradictions between different sections of a policy.
- Understanding unfamiliar web interfaces.
- Reasoning about which consent controls correspond to optional tracking.
- Choosing safe browser actions.
- Determining what service a website provides.
- Finding semantically equivalent alternatives.
- Comparing alternatives against the user's stated privacy preferences.

At the same time, deterministic code should handle predictable operations wherever possible. This makes the product more reliable and demonstrates that Astra is being used where its reasoning and browser-use capabilities provide genuine value.
