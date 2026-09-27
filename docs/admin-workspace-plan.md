# PARASENS admin workspace plan

Saved: 21 September 2026  
Status: Implemented on 27 September 2026; development rollout and verification details are in [admin-workspace-setup.md](admin-workspace-setup.md).

## Purpose

Give administrators a workspace centred on reviewing submitted music, managing artist accounts and maintaining artist profiles. Administrators should arrive at the review queue instead of the artist Catalogue. Uploading music and curating the public website remain available.

## Navigation and landing pages

Administrators have permanent navigation with four sections:

- **Submissions** — the default landing page, showing music awaiting review.
- **Artists** — artist names/acts, their labels and genres, assigned accounts and submissions.
- **Accounts** — invite people and manage account access and artist assignments.
- **Website music** — the existing Music Library, including Spotify imports, genres, publishing, archiving and ordering.

Keep **Upload music** available as a secondary action. Administrators can upload on behalf of an artist. Artists continue to land on their own **Catalogue**, with their releases and upload action.

Remove the separate Music Library promotional banner from the Catalogue. Access to Website music belongs in the admin navigation.

## Submission review

### Statuses

The normal progression is **New → In Review → Accepted → Delivered**. A submission can also be **Declined**.

| Status or action | Behaviour |
| --- | --- |
| New | Submitted music awaiting review. |
| In Review | Music being assessed by an administrator. |
| Request changes | Keep the submission In Review and show an **Awaiting artist changes** badge. Send the artist a message explaining the requested changes. |
| Accepted | Approved music. An acceptance reason is optional. |
| Declined | A reason is required and visible to the artist. |
| Delivered | An administrator manually marks accepted music as delivered after sending it to the label. No delivery-date field is required. |

Keep drafts separate from the submitted review queue. Record review actions and status changes in a history so administrators can understand previous decisions.

### Review screen

Use a submission list alongside the selected submission's details on wider screens, with a suitable stacked layout on smaller screens. Include:

- Filters for submission status, including submissions awaiting artist changes.
- Release and artist information, uploaded files and playback.
- Private administrator notes, clearly separated from messages visible to the artist.
- Actions to start review, request changes, accept, decline and mark delivered.
- Review and message history.

Keep playback available while reviewing details and working with metadata. Avoid unnecessary popups that prevent simultaneous listening and editing.

### Communication

Send review-related email only when music is **declined** or **changes are requested**. Other review updates and messages remain visible in the portal. Normal account invitations and sign-in emails are separate from this rule.

Decline emails must include the reason. Changes-requested emails must explain what the artist needs to update. Private notes must never appear in artist-facing messages or emails.

## Artists and accounts

Treat an artist name/act and a login account as separate records with a many-to-many relationship:

- One account can represent several acts.
- Several accounts can share one act.
- Administrators can assign, remove or reassign artist access at any time, including after an invitation has been accepted.

An artist profile includes its name, corresponding label and genre tags, assigned accounts and linked submissions. Reuse existing label and genre records where appropriate rather than creating conflicting lists.

The upload form's primary-artist selector uses the names assigned to the signed-in account. Include **Suggest a new artist name** in the upload form. Surface suggestions for administrator approval before they become approved, assigned artist profiles.

Accounts management must make both inviting someone and changing an existing person's artist assignments straightforward.

## Permissions

All administrators have full access to review submissions, invite accounts, manage artist profiles and assignments, upload music and curate Website music. Remove owner-only restrictions that conflict with this agreed administrator role.

Artists can access the acts assigned to their account and the associated submissions and artist-visible messages allowed by that membership. They cannot access other acts, admin-only tools or private administrator notes. Enforce access in the backend and database policies as well as the interface.

## Existing Website music features to preserve

- Manual Spotify playlist import with pagination.
- Repeat imports add only missing tracks; existing tracks retain their status, tags and ordering.
- Archived tracks stay archived when the same playlist is imported again.
- Genre and subgenre tagging, including multiple genres where needed.
- Draft, published and archived music management.
- Independent manual ordering for All, genres and subgenres, including the existing drag interaction and exact-position option.
- Inline listening while working with genres.

Submission review statuses and Website music publication states remain distinct. Accepting a submission does not implicitly publish it to the public website.

## Implementation sequence

1. **Inspect the existing portal and data model.** Identify placeholder release data, current authentication and admin checks, upload/storage handling and existing music-library tables. Account for the separate invitation work already in progress without deploying it inadvertently.
2. **Add the data and access foundations.** Implement artist profiles, account-to-artist memberships, label/genre associations, artist-name suggestions, persistent submissions, review states, private notes, artist messages and action history. Define and verify database access policies.
3. **Introduce the admin navigation.** Route administrators to Submissions and artists to Catalogue. Integrate Website music into navigation and retain the upload action.
4. **Build Artists and Accounts.** Support invitations, shared acts, multiple acts per account, assignment changes and artist profile editing.
5. **Connect uploads to assigned artists.** Populate the artist selector, support suggestions and admin uploads on behalf of an artist, and persist submissions and files with appropriate access.
6. **Build the review workspace.** Add the queue, filters, playback, files, notes, messages, state transitions, required decline reason and manual Delivered action.
7. **Add review notifications.** Send decline and changes-requested emails from the server, prevent duplicate sends on retries and surface failures for administrators.
8. **Validate and release to development.** Check the complete admin and artist flows, access isolation, responsiveness and performance using representative data. Keep production unchanged until a separate release is authorized and verified.

## Acceptance checks

- An administrator signing in lands on the review queue; an artist lands on their Catalogue.
- Every administrator can perform all agreed admin actions.
- An account can use multiple assigned acts, and two accounts can share an act.
- Changing assignments after invitation updates the account's available artist names and access.
- An artist cannot read another act's submissions or any private administrator notes.
- Artist profiles support corresponding label and genre tags.
- An artist can suggest a new name during upload and an administrator can approve it.
- Administrators can upload music on behalf of an artist.
- Review states persist, decline requires a reason, and acceptance does not require one.
- Requesting changes retains In Review and shows Awaiting artist changes; the resubmission flow clears the badge when changes are returned for review.
- Delivered is set manually and requires no delivery-date input.
- Review emails are sent only for decline and changes requested, with no private notes exposed.
- Playback remains usable during review and metadata work.
- Existing Spotify import, archive, publishing, tagging and ordering behaviour continues to work.
- Large catalogues and submission lists remain responsive; avoid loading every detail or embedded player at once.

## Implementation details to resolve during build

Use the agreed concept above as the scope. Confirm detailed status-transition rules, the exact visibility of drafts shared within an act, label/genre tag cardinality and suggestion handling against the existing data model before implementing those details. These are implementation decisions, not additional approved features.

Related project notes: [Music Library setup](music-library-setup.md), [portal authentication](portal-auth-setup.md), and [separate invitation work](portal-invitations.md).
