# Member research and daily email

Public Pages contains charts only. Research lives in Supabase project `zkyhhoxcrjkhywblzehr`, in `innerg_research_content`. The `member-research` function validates the account and active numbered membership before returning it. Existing grandfathered access remains valid. Never grant membership based on browser state, a typed member number, or user metadata.

The GitHub `Update asset news` job refreshes protected news every two hours. Its `RESEARCH_PUBLISH_KEY` secret is publisher-only. Never print it. Do not commit research payloads. Use `.private-research/` locally. The Pages artifact includes only the allowlist in `scripts/build_public_site.mjs`.

Previously public news remains in Git history. These controls protect new editions, not copies already downloaded.

## Daily delivery

The existing Codex automation `sunday-innerg-market-pulse` publishes the protected What to Watch For edition at 9 AM Eastern daily, then prepares the member email. There is no separate Sunday Brief publication. The page uses `#what-to-watch`; old `#sunday-brief` links remain supported. It uses the connected OwnYourWeb Gmail account. This editorial delivery needs Codex and its connected tools available; it is separate from the always-on GitHub news collector. Do not claim a standalone email server exists.

1. Read current research and source dates. Open sources before summarizing. No Reddit. Review every tracked asset; select up to five material stories for a short email and disclose coverage gaps.
2. Use `scripts/research-email.mjs` with news, watch points, risk, daily brief, verified public-safe work from the last calendar week, and upcoming-week focus. Never include private client details. If the plan is not verified, label it as proposed. No invented founder progress.
3. Publish the sourced daily page brief in `innerg_research_content` under `brief` after archiving the prior payload privately. Use `edition: "daily what to watch for"`, actual publication time, and truthful price-capture timestamps. Never fabricate a quote. Preserve dated earlier context only when still relevant. Save the final email subject and plain-text body into `innerg_research_editions` with id `daily-YYYY-MM-DD` using the Eastern date. Use ON CONFLICT DO NOTHING, then read the saved edition. Reuse it on retries. Do not edit a sent edition or send a second daily email that day. Substack drafts reuse the verified research and require owner approval before publishing or emailing; Substack subscribers are not automatically INNERG members and must not be added to Gmail delivery lists.
4. Select only opted-in, verified-email, active numbered members with unexpired access. Never automatically subscribe existing members. Each email goes individually through Gmail, not a visible recipient list.
5. Immediately before each send, atomically claim the delivery by INSERT SELECT using the eligibility query below, `ON CONFLICT DO NOTHING RETURNING user_id`. Only send when a new claim is returned. Recheck consent and membership immediately before sending. If they changed, do not send and mark the claim failed.
6. Send through the connected Gmail account only after verifying it is `ownyourwebsmm@gmail.com`. Record the returned Gmail message ID and status `sent`. If the call times out or returns an ambiguous result, mark `uncertain`, inspect Sent mail for that exact recipient and subject, and do not resend blindly. Existing sending/sent/uncertain rows block duplicates. Failed rows require a verified no-send result before any operator retry.
7. Keep member emails and delivery records out of public files, Git commits, and task summaries. Report counts and actionable failures only. Never exceed Gmail limits or bypass a provider block.

Eligibility query, used as the SELECT part of the atomic claim:

```sql
select p.user_id, u.email
from public.innerg_research_preferences p
join public.innerg_memberships m on m.user_id=p.user_id
join auth.users u on u.id=p.user_id
where p.daily_email is true and u.email_confirmed_at is not null
and m.status='active' and m.membership_number is not null
and (m.access_source='grandfathered' or m.access_expires_at is null or m.access_expires_at>now());
```

`innerg_research_deliveries` has a unique `(edition_id,user_id)` key. Never remove a delivery claim to force a resend. Use a distinct `test-` edition only for the owner delivery test. A test does not subscribe the owner or change member access.

The email footer links to the sign-in panel and opt-out checkbox. Former members can use Turn off research emails even when access has expired. This is an authenticated preference link, not one-click unsubscribe.
