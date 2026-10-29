# PARASENS measurement

## Google Analytics

Created 29 October 2026 in the owner's Google account, with the owner personally
accepting Google's terms. Account: PARASENS (414003127). Property: PARASENS Website
(561403815). Web stream: PARASENS Public Website (16230074117), measurement ID
`G-D5WMC49KG3`. Reporting uses Sweden time and SEK. Optional account data sharing
and enhanced measurement are disabled.

The public homepage loads Analytics only after explicit consent. No consent means
no Google Analytics tag, events or analytics cookies from this implementation.
The footer's Analytics settings lets a visitor decline or withdraw; withdrawing
stops collection, deletes this site's GA cookies and reloads to unload the tag.
Choices expire after 180 days. Advertising storage, advertising user data,
personalisation and Google signals are disabled. Portal, preview and local hosts
are excluded. Page URLs and referrers are stripped of query strings and fragments;
referrers retain only the origin. Campaign query parameters are intentionally not
collected.

An accepted contact-form response triggers `generate_lead`, marked as a key event
in GA4, with no monetary value and once-per-event counting. The event-scoped
custom dimension **Submission type** reads `form_type`: `music_submission` or
`enquiry`. No name, email, track title, message, music link or request ID is sent.
The request ID is used only locally to prevent duplicate measurement. Failed or
unconfirmed submissions do not trigger the event. Visitors declining analytics
are not counted, so Analytics totals will be lower than actual enquiries.

For reporting, compare Search Console clicks with Analytics organic-search
traffic and `generate_lead` counts. Use **Submission type** to separate artist
music submissions and general enquiries. Search Console measures search activity;
Analytics attribution covers consented visits and does not provide a complete
count of all submissions.

## Mobile baseline

[PageSpeed report, 29 October 2026 at 16:04 Europe/Stockholm](https://pagespeed.web.dev/analysis/https-parasens-com/xjmzehffys?form_factor=mobile)

- Mobile performance: 87/100; accessibility: 90/100; best practices: 100/100; SEO: 100/100.
- FCP 2.9 seconds; LCP 3.4 seconds; total blocking time 10 ms; CLS 0; speed index 2.9 seconds.
- Simulated Moto G Power, slow 4G, Lighthouse 13.5.0. No real-user field data yet.
- Main opportunities: render-blocking resources (estimated 1.33 seconds), large
  DOM from the catalogue, unused JavaScript/CSS. Accessibility flags: an unnamed
  button and missing main landmark. These are observations, not fixes made by
  this measurement setup. Scores are test-specific and do not guarantee ranking.

## Validation

`tests/analytics.test.mjs` covers consent defaults, one tag/page view, safe
payloads, duplicate protection, opt-out, cookie isolation, expiry and excluded
hosts/routes. Contact-form and public-rendering tests also pass. No live enquiry
or email is generated to test analytics; successful-submission behaviour is
verified with controlled tests, and production receipt is checked with a page view.
