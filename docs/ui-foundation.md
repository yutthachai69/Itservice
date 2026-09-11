# IT Service UI foundation

This document is the visual contract for operational screens. Page-specific styling should use
these rules before introducing a new pattern.

## Brand and color

- Navy (`--sidebar`) is reserved for one primary focal area per screen, not the whole navigation rail.
- Brand blue (`--brand`) identifies links, focus, active navigation, and the primary action.
- Cool gray surfaces organize information without adding a second visual theme.
- Amber means waiting or attention, green means completed, red means error/destructive, and gray
  means inactive or cancelled. Semantic colors are not decoration.
- A normal screen should not have multiple colored icon tiles competing for attention.

## Typography

- IBM Plex Sans Thai is the interface font for headings, forms, tables, navigation, and data.
- Itim is reserved for a deliberately expressive surface such as the login or home introduction.
- Operational page titles use semibold UI text, not the display font.
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

## Application shell

- Desktop navigation is a fixed 248px white rail attached to the left edge and full viewport height.
- Primary and service navigation use the same blue-gray hierarchy; category icons stay monochrome.
- The active item uses a brand-blue left rule, pale-blue background, and stronger blue text.
- The top header stays white and quiet so it does not compete with the current task.
- Main content is fluid. Width limits belong to focused tasks, not to the application shell.
- Mobile primary navigation scrolls horizontally; service entry remains on the home screen.

## Operational forms

- Form pages use the full content area; the form itself controls readable field widths through its grid.
- Each section has a quiet 224px context column and a responsive one-to-three-column field area.
- Long text, checkbox groups, and explanatory content span the complete field area.
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
