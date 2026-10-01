# OmniPrompt Product Strategy

Status: Draft for founder review · Date: September 29, 2026 · Owner: Product

> **Founder decisions, Sept 30, 2026**: Price is $25 final (one-time lifetime). Option B permissions adopted (curated AI list + optional everywhere + activeTab). Free/Pro re-split approved (folders, tags, bulk edit, tidy-up, remembered answers, version history view/copy are Free; 20-prompt custom limit, workspaces, saved value sets, chains, folder sync, one-click restore are Pro). Sections 9 and 10 pricing/packaging ideas are superseded by this decision.

---

## 1. The answer on one page

**Who we build for:** people who use two or more AI tools every day, and who also write in Gmail, Slack, Jira, or Docs. The people most likely to pay are freelancers, agencies, and consultants who do the same AI tasks for many clients.

**What we sell:** "Your reusable text actions, in every AI and every text box. No account. Nothing leaves your browser."

We do not sell a prompt store. Users do not trust built-in prompt collections much, and single prompts sell for about $6 on marketplaces.

**Why we can win:**
- Every AI company now ships saved prompts behind "/". Each one only works inside its own app.
- The top competitors are losing users because of the same five mistakes: tiny free tiers, upgrade nags, lost data, breaking when sites change, and billing traps.
- OmniPrompt already avoids most of these. We need to prove it, and fill the gaps users keep asking for.

**The five things that make us the best product in this category:**
1. **Never lose a prompt.** Automatic local backups, a visible "last backup" status, one-click restore, and version history.
2. **Never break silently.** Insertion checks itself. If it fails, the text goes to the clipboard and the user sees why.
3. **Find it in one keystroke.** Search that works when you only half remember a prompt: title, body, notes, and tags.
4. **Capture from anywhere.** Save any selected text or any chat-box draft as a prompt in two clicks.
5. **Context, not just prompts.** Reusable context blocks (for example "Client A brief") plus `{{selection}}`, page variables, and dropdowns.

**How we make money:** free core with 25 custom prompts. Pro is a one-time lifetime license. It unlocks power features, not access to your own data. Teams come later as a per-seat subscription, only if individual buyers ask for it.

**Before launch, fix three problems in the current code (details in section 7):**
1. Two hardcoded test keys unlock Pro for anyone.
2. The README and privacy text say "no network requests", but license activation now calls Dodo Payments.
3. Pack gating is inconsistent. Free users can already turn on all packs.

---

## 2. What we researched

| Source | What we got | How reliable |
|---|---|---|
| Reddit, 48 threads (Jan 2025 to Sep 2026) | Pain points, workarounds, reasons people refuse to pay | Directional. About half the threads were posted by tool builders. Read through a Reddit archive because reddit.com blocked direct access. |
| Store reviews for 17 competitors (Chrome Web Store, Firefox add-ons, chrome-stats, Tooltivity, G2) | Complaint and praise themes, pricing, user counts | Good for themes. Counts are the reviews we read, not a full census. |
| Platform announcements (OpenAI, Anthropic, Google, Microsoft, Perplexity, xAI, Mistral) | What the AI companies ship natively | Good. A few dates come from one source only. |
| Security reports (2024 to 2026) | Extensions that steal AI chats, Chrome Web Store policy changes | Good. Multiple security firms. |
| Product Hunt, Hacker News, Indie Hackers, TrustMRR | Revenue, pricing models, channels | TrustMRR numbers are verified by payment processors. Others are self-reported. |

---

## 3. What users actually want

### 3.1 Ranked pain points (Reddit)

| Rank | Pain | Threads | What it means for us |
|---|---|---|---|
| 1 | **Finding, not storing.** Prompts saved in Notion or Notes turn into a "graveyard" nobody can search. | 14 | Search quality and one-keystroke insertion matter more than library size. |
| 2 | **Portability.** One library across ChatGPT, Claude, Gemini, devices, and browsers. | 10 | Our cross-AI approach is right. Firefox and Edge support are real requests. |
| 3 | **Retyping and copy-paste.** Short instructions typed 20 times a day. | 9 | Modifiers and short snippets are a core use, not a side feature. |
| 4 | **Distrust of extensions.** People ask "how is this free?" and "what can it see?" | 9 | Privacy must be provable, not claimed. |
| 5 | **Native features are locked to one AI.** GPTs, Gems, Projects, and Spaces do not carry over and have size limits. | 9 | Our main opening. |
| 6 | **A prompt without context is useless later.** Why it worked, which model, what it produced. | 8 | Add notes, model tag, example output, and versions. |
| 7 | **Tools break** after site redesigns, or insertion breaks undo. | 6 | Reliability is a feature. |
| 8 | **Too bare or too bloated.** | 5 | Stay small and fast. Say no to "AI platform" features. |
| 9 | **Placeholder mistakes.** Unfilled brackets get sent. Filled values overwrite the template. | 5 | Our form already helps. Add warnings for unfilled fields. |
| 10 | **Hoarding.** 100 prompts saved, 8 used. | 4 | Show usage, suggest cleanup, keep the menu short. |

### 3.2 What they ask for most

1. Insert straight into the chat box with a slash or hotkey. **We have this.** Several competitors have it too, so it is expected, not special.
2. Sync across browsers, devices, and operating systems. **We only have Chrome profile sync.**
3. Version history plus notes (why it works, model, example output). **Missing.**
4. Import and export with no lock-in. **We have this.**
5. Search that works with fuzzy memory. **Partly.** We search titles and shortcuts. We need body, notes, and tags.
6. `{{variables}}`. **We have this.**
7. Reusable context blocks (per-client briefs, personas). **Missing.**
8. Multi-step chains. **Missing.**
9. API or MCP access so AI agents can read the library. **Missing.** Developer-only demand.
10. Nested folders and tags. **We have categories only.**

### 3.3 Who pays

| Segment | What they need | Will they pay? |
|---|---|---|
| Freelancers, agencies, consultants | Per-client context, templates, version logs, later team sharing | **Most likely.** They repeat 12 to 15 prompts a day across clients. |
| Marketers and writers | Templates with variables, tone dropdowns, Gmail and Docs support | Likely, one-time |
| Developers | Local files, versioning, minimal permissions, MCP | Rarely. They build their own or use Git. |
| Heavy image-prompt users | Huge collections, example images, bulk organization | Maybe. Niche. |
| Casual users and students | Free, simple, no account | No. They bring installs and reviews. |

### 3.4 What people will pay, in their words (paraphrased)
- "I don't mind paying, but a subscription is too much for such a simple tool."
- They will pay once. They are tired of monthly bills for small utilities.
- They pay when a tool removes steps from a daily task, not for repackaged text.

---

## 4. Competitor teardown

### 4.1 The field

| Product | Users | Rating | Price | Account | Lesson for us |
|---|---|---|---|---|---|
| AIPRM | 1M | 3.9 | $10 to $33+/mo, no refunds | Yes | Huge reach, disliked. Hides prompt text behind top plans and threatens bans for chargebacks. Breaks on ChatGPT updates. |
| Superpower ChatGPT | 100K | 4.5, falling | $10 to $15/mo. Free: 5 prompts | Collects email | Paywalled variables, import, and right-click. Opens newsletter tabs. Hard to cancel. |
| AI Toolbox | 40K+ | 4.7 | $9.99/mo, $99 to $199 lifetime. Free: 2 prompts | Premium only | **Best business in the niche.** $22,061 in the last 30 days (verified). About 75% from lifetime plans. 37% of users come from Google search. |
| XXL Prompt Manager | n/a | 4.1 | Free unlimited. Pro €4.90/mo | Optional | Free and unlimited, but has "prompts don't persist" reviews. |
| Open Prompt Manager | n/a | 4.7 | Free, open source | No | Loved for privacy. Double-paste bugs. Users ask for folders and backup. |
| Text Blaze | 800K | 4.9 | Free 20 snippets. $2.99 to $3.49/mo. Business $6.99/user | Yes | **Proof that a fair free tier plus speed keeps a 4.9 rating.** Complaints: needs an account and internet. |
| Magical | 300K | 4.4, **recent 1.4** | ~$10/mo | Yes | Went paid, added ads, lost user data, blocked export. Users are leaving. |
| HARPA AI | 300K+ | 4.7, falling | $14 to $19/mo | Partly | Charged people even for using their own API key. That caused a wave of 1-star reviews. |
| AI Prompt Genius | n/a | 3.3 | Free with ads | No | Ad tabs and a data wipe sank the rating. |
| Slashprompt | Pre-launch | none | Free 25. $9.99 one-time | No | **Near-clone of us.** Same trigger idea, same free limit, lower price. |
| PromptPerfect, TeamSmart | Shut down 2026 | | | Yes | Cloud-only tools delete your library when they die. |

### 4.2 Why competitors get 1-star reviews (ranked by mentions)

1. **Free tier too small to be useful** (~55 mentions, 8 products). Caps of 2, 5, or 6 prompts make people angry. A cap of 20 to 25 is tolerated (Text Blaze keeps 4.9).
2. **Ads, upgrade nags, tabs that open by themselves** (~20).
3. **Breaks after ChatGPT or Claude changes their page** (~19).
4. **Billing traps**: no self-serve cancel, double charges, no refunds (~13).
5. **Lost data** (~12). The most severe complaint. It hits both local tools and cloud tools.
6. **Slow, crashes, bloated** (~12).
7. **Privacy surprises**: hidden network calls, email harvesting, trackers (~9).
8. **UI that gets in the way**: floating icons over site buttons, `/` triggers that block typing a real slash (~8).
9. **Forced account or online-only** (~7).
10. **Support that never answers** (~7).

### 4.3 Why users give 5 stars
Saves time. Simple and clean. A real free tier. Works across many AI sites. Variables. No registration. Fast. A developer who replies.

### 4.4 The gaps no competitor fills well
1. Local-first **and** no data loss: automatic backups, a visible status, easy restore.
2. Version history in a local tool.
3. Insertion that checks itself and falls back to the clipboard.
4. Honest pricing: one-time, no nags, easy refunds.
5. Triggers that never clash with real typing, and UI that only opens on click.
6. Save selected text as a prompt from any page.
7. Full transparency: always show the exact text before inserting.
8. Privacy you can verify, not just read.

---

## 5. The platform threat

| Platform | Native feature | Who gets it | Limit |
|---|---|---|---|
| Gemini in Chrome | **Skills**: save prompts, run them with "/" (Apr 14, 2026) | Signed-in desktop users, US English | Runs only in Gemini's side panel |
| Gemini app | Gems move to **Skills** from **Nov 17, 2026** | Skills reported as paid (AI Pro+). Free access unconfirmed. | Gemini only |
| ChatGPT | Custom GPTs **retire Dec 11, 2026**. Skills are Business/Enterprise only. No personal prompt library. | Mixed | ChatGPT only |
| Claude | Skills (Oct 2025) | Paid first, now listed for Free | Claude only. Claude often decides when to use them. |
| Grok, Perplexity Comet, Mistral | "/" skills or shortcuts | Varies | Own app only |
| Microsoft 365 Copilot | Prompt Gallery with team sharing | Work accounts | Copilot only |

**What is now free elsewhere:** a saved-prompt list for someone who only uses one AI. The "/" habit. Starter prompt libraries.

**What they will not build:** one library that inserts into a rival's AI. Text inserted into Gmail, Slack, or Jira. Typed fill-in variables. Local storage with no account. A library that survives their product changes.

**A timely message:** Gems move on Nov 17. GPTs retire on Dec 11. Users are being moved again, and some features may end up behind a paywall. OmniPrompt's library does not move. Ship Gem and GPT instruction importers before these dates.

---

## 6. Trust: the real moat

AI-themed extensions are now the main way attackers steal chat data:
- **Dec 2025:** Urban VPN and three sister extensions, about 8M users, with "Featured" badges. They captured chats from 8 AI platforms. ([The Hacker News](https://thehackernews.com/2025/12/featured-chrome-browser-extension.html))
- **Jan 2026:** Two AI sidebar extensions, 900K users, sent ChatGPT and DeepSeek chats to attackers. This is known as "prompt poaching". ([The Hacker News](https://thehackernews.com/2026/01/two-chrome-extensions-caught-stealing.html))
- **Mar 2026:** Microsoft found fake AI-assistant extensions in 20,000+ company tenants. ([Microsoft](https://www.microsoft.com/en-us/security/blog/2026/03/05/malicious-ai-assistant-extensions-harvest-llm-chat-histories/))
- **Sep 2026:** Poper Blocker, 2M users, with Featured and Established Publisher badges. It took AI chats and screenshots. ([Dark Reading](https://www.darkreading.com/application-security/chrome-store-poper-blocker-spyware-downloaded-millions))

Store badges no longer prove safety. Google is also ending the Featured badge and weighting ratings toward recent reviews ([Chrome for Developers](https://developer.chrome.com/blog/cws-review-updates-2026)).

**Our trust plan:**
1. **Position:** "OmniPrompt never reads your chats. It only types your text. It talks to one server, and only once, to activate a license."
2. **Make it checkable:**
   - Allow network access only to the Dodo license endpoint. Set a content security policy (`connect-src`) for extension pages.
   - Move license calls into the options page or service worker, never content scripts.
   - Add a CI test that fails if any other network call appears.
3. **Touch only the composer.** Never read the chat transcript. Publish a "What OmniPrompt touches" page.
4. **Permissions:**
   - Consider required access only to the main AI sites.
   - Offer "Everywhere mode" as an optional permission.
   - Stop exposing `content.css` to every site.
   - Decide this before launch. Adding permissions later disables the extension for existing users until they approve.
5. **Supply chain:**
   - Hardware 2FA on the developer account.
   - A public pledge never to sell the extension.
   - No third-party SDKs or analytics.
   - Consider open-sourcing the code.
6. **Policy:** No "jailbreak" prompt packs. The Chrome Web Store banned extensions built to bypass AI safety guardrails in July 2026.

---

## 7. Where OmniPrompt stands today

### 7.1 Already strong (keep and market)
- `//` menu in any text box, Alt+K palette, right-click modifiers.
- `{{variables}}` with a live-preview form and defaults.
- Insertion that keeps the user's draft and uses the browser's native insert, so undo keeps working.
- Import from AIPRM, CSV, Markdown, JSON. Export.
- Favourites, recents, categories, per-site disable, configurable trigger.
- Sync writes are split into small chunks to fit Chrome's limits, with a clear error message.
- Role onboarding on the welcome page. Free limit of 25 custom prompts. Dodo license activation.

### 7.2 Launch blockers found in the code

| # | Problem | Where | Why it matters |
|---|---|---|---|
| B1 | `TEST-PRO-UNLIMITED-KEY` and `PRO-LIFETIME-KEY` unlock Pro with no check | `lib/promptStore.js`, `activateLicense()` | Anyone who reads the code or a Reddit post gets Pro for free. Remove before any public release. |
| B2 | README says "No network requests", but the extension now calls `https://live.dodopayments.com/licenses` | `README.md`, store listing | Chrome policy (Jul 2026) requires honest disclosure. A privacy claim that turns out false destroys trust. |
| B3 | The UI says free = 1 pack, but the default is all packs, and the welcome page's "select all" gives all packs to free users | `lib/promptStore.js` defaults, `welcome/welcome.js` | The paywall is inconsistent. Recommendation: **make all built-in packs free** (see pricing) and remove the pack gate. |
| B4 | `validateLicense()` is never called | `lib/promptStore.js` | OK for a lifetime license. It becomes a problem if refunds or subscriptions are added. Decide on purpose. |

### 7.3 Gaps against the best possible product

| Gap | Evidence strength | Effort |
|---|---|---|
| Automatic local backups plus a visible "last backup" and restore | Very high (data loss is the most severe complaint everywhere) | S |
| Insertion self-check with clipboard fallback and a message | High | S–M |
| Search over body, notes, and tags, with typo tolerance | High (the #1 Reddit pain) | S |
| Save selection or current draft as a prompt | High | S |
| Warn about unfilled placeholders. Never overwrite the template. | Medium | S |
| Prompt notes: why it works, model, example output | High | S |
| Version history (keep the last 20 versions locally) | High | M |
| Context blocks (reusable briefs you can insert inside other prompts) | Medium–High (agencies) | M |
| `{{selection}}`, `{{page_title}}`, `{{page_url}}`, dropdown variables | Medium–High | M |
| Gem, GPT, and SKILL.md import and export | Medium, time-sensitive | S–M |
| Multi-step chains | Medium (competitors charge for it) | M–L |
| Firefox and Edge builds | Medium | M |
| Team packs through `chrome.storage.managed` or a shared file | Low–Medium | M |
| Cloud sync with an account | Medium demand, high cost and risk | L |

---

## 8. Product principles

Each rule comes from a competitor's 1-star reviews.

1. **Your data is never held hostage.** Export, backup, and reading your own prompts are always free, even over the limit.
2. **No nags.** No self-opening tabs, no popups that look like the AI site, and no upgrade prompt more than once a week. Upgrade prompts appear only when the user tries a Pro feature.
3. **Never fail silently.** If insertion fails, say so and copy the text to the clipboard.
4. **No account, ever, for the core.**
5. **One price, one refund rule.** A 14-day refund, no questions asked.
6. **Small and fast.** Every new feature must keep the extension fast and add no clutter to the page.
7. **Show the exact text.** No hidden prompts.

---

## 9. Roadmap

### Phase 0: launch blockers (1 to 2 weeks)

| Item | Why |
|---|---|
| Remove the test bypass keys (B1) | Protects revenue |
| Fix the privacy text in the README, store listing, and privacy tab (B2) | Policy and trust |
| Remove the pack gate; all built-ins free (B3) | Consistent, fair free tier |
| Automatic local snapshots (daily, keep 7) plus a "Last backup: today" line plus restore | Answers the #1 severe complaint |
| Insertion self-check and clipboard fallback | Answers complaint #3 |
| Search over prompt body plus tags | Answers the #1 Reddit pain |
| Store listing: keyword-first description, screenshots, a 30-second video | Store search is a top channel |
| Review request after the 10th successful insert, asked once | Ratings now weight recent reviews |

Name note: keep brand names like "Gemini" out of the extension title. One competitor's listing was pulled over it. Put AI names in the description instead.

### Phase 1: "Best in class" (weeks 3 to 8 after launch) → Pro becomes worth $39

| Feature | Free or Pro |
|---|---|
| Save selection or draft as a prompt (right-click and palette) | Free |
| Unfilled placeholder warning | Free |
| Prompt notes: why, model, example output | Free |
| Gem, GPT, and SKILL.md importers (ship before Nov 17) | Free |
| Version history (last 20 per prompt, restore) | **Pro** |
| Context blocks (`{{@client-a}}` inserts a saved brief) | **Pro** |
| `{{selection}}`, page variables, dropdown variables | **Pro** |
| Unlimited custom prompts | **Pro** |
| Backup to a file the user picks, on a schedule | **Pro** |

### Phase 2: expand reach (months 3 to 5)
- Multi-step chains (**Pro**).
- Firefox and Edge builds.
- SKILL.md export, so a library moves into Claude, ChatGPT, and Mistral skills.
- Public gallery pages for built-in prompts, for Google search traffic (AI Toolbox gets 37% of its users from search).

### Phase 3: only if paying users ask
- **Teams:** shared read-only packs, roles, use counts. About $6 per seat per month.
- **Optional encrypted sync** with an account, off by default.
- **MCP or local API** for developers.

### Not doing (and why)
| Idea | Reason |
|---|---|
| Prompt store or single-prompt sales | Marketplace median is about $6. Users distrust built-in collections. |
| AI "prompt enhancer" on our own API key | Most crowded feature. Costs money per use. Breaks often. Moves us into the "AI extension" risk category. |
| Memory, agents, scheduled tasks | The AI companies own this. |
| Sidebar-heavy UI | Users forget sidebars. Inline wins. |
| Ads or a newsletter pushed on users | Sank Superpower's and AI Prompt Genius's ratings. |

---

## 10. Pricing and packaging

| Tier | Price | Contents |
|---|---|---|
| **Free** | $0 | All insertion features, all 110 built-in prompts, 25 custom prompts, variables, modifiers, import and export, automatic local backups |
| **Pro (lifetime)** | **$19 founder price** for the first 200 buyers or until Phase 1 ships, **then $39** | Unlimited prompts, version history, context blocks, smart variables, scheduled file backup, chains when ready |
| **Teams (later)** | ~$6 per seat per month | Shared packs, roles, use counts |

Why these numbers:
- A free cap of 20 to 25 is tolerated. A cap of 2 to 6 gets people angry.
- Lifetime plans earn most of the money in this niche. AI Toolbox makes about 75% of its revenue from $99 to $199 lifetime plans.
- We are narrower than AI Toolbox. $39 sits between Slashprompt ($9.99) and AI Toolbox ($99).
- The founder price rewards early buyers and gets early reviews.

Over the limit: never lock or delete existing prompts. Users can read, insert, and export everything. Only creating prompt #26 asks for Pro.

Realistic math: extensions usually convert 0.5% to 2% of free users. At $39 and 1%, you need about 2,600 new installs a month for $1,000 a month.

---

## 11. Go-to-market

| Channel | Action | Evidence |
|---|---|---|
| Chrome Web Store search | Keyword-first description ("prompt manager", "text expander", "ChatGPT prompts", "Claude prompts"), localized listings, 5 clear screenshots | One developer saw +340% search impressions after moving to keyword-first titles |
| Reddit | Help first in r/PromptEngineering, r/ChatGPTPro, r/ClaudeAI, r/productivity. Answer "where do you store prompts" threads. Never spam. | Reddit was 41% of installs for one extension. Small, focused subreddits beat big ones. |
| Timely hook | "Gems move Nov 17, GPTs retire Dec 11: keep a library that doesn't move", with the importer | Real, dated user pain |
| YouTube | One 3-minute "stop retyping prompts" video | For one prompt extension, a single video beat 11 months of other traffic |
| Search pages | Gallery page per built-in prompt, plus "vs AIPRM" and "alternatives" pages | AI Toolbox: 37% from Google |
| AppSumo | Once, after 50+ reviews, as a lifetime deal | Brings cash and reviews. Only makes sense with no per-use cost. |
| Skip as main channels | Product Hunt (about 3% of installs), Hacker News (prompt managers get 1 to 4 points) | |

---

## 12. What we measure

Measure without sending data anywhere. Counters stay local. Show users their own stats. Ask for opt-in survey answers only.

| Metric | Target after 60 days |
|---|---|
| New installs per week | Rising week over week |
| Activation: first insert within 24 hours | ≥ 60% |
| Weekly active users as a share of installs | ≥ 30% |
| Inserts per active user per week | ≥ 10 |
| Share of users who hit the 25-prompt limit | 5–10% (if much lower, the limit is too loose) |
| Upgrade click → purchase | ≥ 30% |
| Refund rate | < 5% |
| Store rating (recent reviews) | ≥ 4.7 |
| Insertion failures reported | Fixed within 72 hours of a site change |

For install and retention numbers, use the Chrome Web Store developer dashboard. Use Dodo for sales and refunds.

---

## 13. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| "Prompts don't matter anymore" becomes common opinion | Medium | Position as reusable text actions and context, not "magic prompts" |
| Clones (Slashprompt, SlashSlash, Promptbar) | High | Win on reliability, backups, trust, and speed of fixes |
| AI sites change their pages and insertion breaks | High | Per-site adapters, self-check, fallback, fast releases |
| A native feature goes cross-platform | Low | Business incentives work against it |
| Pro unlock is easy to fake (local storage flag) | Medium | Acceptable at this price. Remove the test keys. Do not add heavy DRM. |
| Permission warnings reduce installs | Medium | Optional "Everywhere mode" |
| Developer account phishing (the Cyberhaven attack pattern) | Low, high impact | Hardware 2FA, training against fake policy emails |

---

## 14. Next two weeks

1. B1: remove the test keys.
2. B2: honest privacy text in the README and store listing.
3. B3: remove the pack gate.
4. Automatic local snapshots, "last backup" status, and restore.
5. Insertion self-check and clipboard fallback.
6. Search over body and tags.
7. Store listing assets and a one-time review request.
8. Publish. Start the Reddit help routine.

---

## 15. Post-launch backlog

### Direct Google Drive API connection
- **Concept:** Connect directly to Google Drive via `chrome.identity` with a user-supplied OAuth client ID or zero-backend OAuth to read and write `omniprompt-library.json` without requiring the local Google Drive for Desktop client.
- **Trade-off analysis:**
  - *Pros:* Works on machines where the user cannot install desktop software (e.g. managed Chromebooks, locked-down work machines).
  - *Cons:* Requires adding the `identity` permission to `manifest.json` (triggering additional permission warnings during install), Google OAuth consent screen, and token refresh logic.
  - *Current decision:* For launch, rely strictly on zero-permission local folder sync via Google Drive for Desktop (set to "Stream files" or "Mirror files"). This upholds Principles 1, 5, and 6 (no network traffic, no account, zero telemetry, zero permissions) while providing seamless cloud sync. Re-evaluate direct API connection based on post-launch user demand.

---

### Key sources
- AI Toolbox verified revenue: [TrustMRR](https://trustmrr.com/startup/ai-toolbox)
- Chrome Skills: [ZDNet](https://www.zdnet.com/article/google-chrome-save-reuse-ai-prompts-skills/)
- Gems to Skills: [TechCrunch](https://techcrunch.com/2026/09/28/google-is-killing-off-geminis-gems-in-favor-of-skills/)
- Custom GPT retirement: [OpenAI Help](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq)
- Chrome Web Store 2026 policy: [Chrome for Developers](https://developer.chrome.com/blog/cws-policy-updates-2026), [review and badge changes](https://developer.chrome.com/blog/cws-review-updates-2026)
- Competitor review analyses: [Tooltivity: Superpower](https://tooltivity.com/extensions/superpower-chatgpt/advisor), [Tooltivity: HARPA](https://tooltivity.com/extensions/harpa-ai/advisor)
- Freemium conversion data: [dev.to](https://dev.to/ktg0215/real-numbers-freemium-chrome-extension-monetization-after-6-months-5hga)
- Reddit threads: 48 threads in r/PromptEngineering, r/ChatGPTPro, r/ClaudeAI, r/ChatGPT, r/chrome_extensions, r/perplexity_ai, r/productivity, r/GoogleGeminiAI (full list available on request)

Content was rephrased for compliance with licensing restrictions.
