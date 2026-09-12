# IT Service UI foundation

This document is the visual contract for operational screens. Page-specific styling should use
these rules before introducing a new pattern.

## Brand and color

- Navy (`--sidebar`) anchors the application chrome and can be reused for one primary focal area
  per screen; semantic colors remain reserved for state, not decoration.
- Brand blue (`--brand`) identifies links, focus, active navigation, and the primary action.
- Cool gray surfaces organize information without adding a second visual theme.
- Amber means waiting or attention, green means completed, red means error/destructive, and gray
  means inactive or cancelled. Semantic colors are not decoration.
- A normal screen should not have multiple colored icon tiles competing for attention.

## Typography

- IBM Plex Sans Thai is the interface font for headings, forms, tables, navigation, data, and
  the login/home introduction. Keeping one family across the product makes Thai text easier to
  scan and avoids a disconnected display treatment.
- Operational page titles use semibold UI text.
- Identifiers such as ticket numbers and asset numbers may use monospace.

## Surfaces

- Use a single bordered work surface for related content instead of a card for every subsection.
- Default radius is 10px. Strong shadows are reserved for overlays such as dialogs and toasts.
- Use dividers, spacing, and typography before adding a new background color.
- Wide screens use the available area; constrain width only when a narrow reading or decision flow
  materially improves comprehension.

## Interaction

- Each region has one primary action. Other actions use secondary or ghost treatment.
- Buttons use 32px, 40px, or 44px heights through the shared Button component.
- Status badges are compact rounded rectangles rather than decorative pills.
- Focus remains visible for keyboard users. Motion must never be required to understand state.
- Form controls (input/select/textarea) fill with `--surface-subtle`, not white — a white field on a
  white card only had a 1px border to separate it, which read as flat and hard to scan on dense
  forms. Focus lifts the field to white (`--card`) plus the brand ring, so the active field is the
  brightest thing on the page.

## Application shell

- Desktop navigation is a fixed 248px deep-navy rail (`--sidebar`, a refined lighter navy — not the
  near-black tone a full-rail fill needs to stay legible and calm) attached to the left edge and
  full viewport height.
- Primary and service navigation use a quiet white-on-navy hierarchy; category icons stay monochrome.
- The active item is a solid brand-blue pill with white text, not a left rule or translucent tint —
  the rail is already colored, so the active state needs real contrast against it, not another shade
  of the same navy.
- The rail footer carries the signed-in identity (avatar, name, site) instead of repeating it in the
  top header; the header only repeats it below the desktop breakpoint, where the rail is hidden.
- The top header stays white and quiet so it does not compete with the current task.
- Main content is fluid. Width limits belong to focused tasks, not to the application shell.
- Mobile primary navigation scrolls horizontally; service entry remains on the home screen.

## Operational forms

- Fields stack one per row, top to bottom — a 2-3 column field grid made the eye jump around instead
  of reading straight down, which read as more confusing than the plain single-column legacy paper
  forms it replaced. A short field (text/select/date) caps at a comfortable reading width
  (`max-w-md`) instead of stretching edge-to-edge; long text, checkbox groups, and explanatory
  content still span the complete field area.
- The form card itself caps at `max-w-3xl`, not the full 1fr grid track — single-column fields
  inside a full-width card left a large dead strip of blank white space beside the summary sidebar
  on wide screens. Let the page background show through as margin instead of leaving empty space
  inside a bordered surface.
- Help and validation text stay next to their field and are connected with `aria-describedby`.
- A single persistent footer holds cancellation and submission actions.
- Context such as SLA, required-field count, and attachment limits appears once above the form.
- Advice is placed beside the relevant field instead of in a generic helper card.

## Ticket detail and workflow

- Start with the ticket identity, then use one navy summary strip for status, progress, owner, and site.
- Keep requester data, submitted details, approvals, attachments, and loan records in one divided
  information surface. Do not turn each group into a floating card.
- Put history in a separate, quieter surface and show the newest event first.
- On desktop, workflow actions use a 352px sticky rail. On smaller screens the rail moves above the
  details so the next action is not buried after a long record.
- Show only one dominant next action for the current state. Progress, comments, assignment, and case
  controls are visually subordinate and grouped by purpose.
- Closing and cancelling require confirmation. Returning an unresolved result requires a reason, and
  an empty comment cannot be submitted.
- Red is reserved for rejection, cancellation, and errors; green is reserved for completed outcomes.

## Page archetypes

1. List: page header, compact filter bar, one data surface, pagination.
2. Detail: identity summary, grouped information surface, contextual action rail when needed.
3. Form: grouped sections, clear required fields, persistent action footer.
4. Dashboard: one priority area, one summary strip, then supporting tables or comparisons.
5. Focused task: intentionally narrow content for login, confirmation, or evaluation only.
