# Refactor Diagnosis UI and Introduce Theme Support
# What does this PR do?

This PR overhauls the patient diagnosis experience to make it more intuitive and introduces system-wide theme support. Specifically, it includes the following updates:

- **Diagnosis Page Redesign:** Revamps the main patient dashboard with a cleaner interface, animated gradient backgrounds, and an AI-powered symptom analysis badge.
- **Theme Support:** Integrates `next-themes` and updates `globals.css` to add full light and dark mode functionality, replacing the previous static DaisyUI theme. It also introduces fluid typography adjustments.
- **Help Guide Enhancements:** Redesigns the symptom help guide into compact inline and detailed modal variants. A new "How to use this app" modal trigger is added directly to the diagnosis page.
- **Layout Consistency:** Updates layout wrappers across patient and clinician pages (History, Profile, Clinician dashboard) to use `min-h-full`, ensuring the footer consistently pins to the bottom.
- **Navigation & Component Updates:** Moves the `HelpButton` directly into the sidebar navigation (`nav-links.tsx`), updates its transition states, and removes the duplicate sign-out button from the header.

# Testing Done:

- Verified the redesign of the diagnosis input form, ensuring the checklist button and auto-expanding textarea behave correctly.
- Toggled light and dark modes to confirm `next-themes` persists user preferences and correctly applies DaisyUI variables.
- Checked the `LegalFooter` placement across History, Profile, and Clinician views to ensure the layout height fix resolves floating footer issues.
- Tested the opening and closing of the newly implemented Help Modal.

# Additional Notes: 

- The `next-themes` package was added to dependencies; please run `bun install` after pulling these changes.
- Fluid typography variables in `globals.css` were updated slightly to better accommodate the new design spacing.
