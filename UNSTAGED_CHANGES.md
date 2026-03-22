# What does this PR do?
- Replaces raw confidence/uncertainty metrics with a unified "Reliability" indicator in the frontend patient history table (including PDF exports), making the data more accessible to users.
- Improves backend out-of-scope handling by introducing structured `out_of_scope_type` categories (`CONFLICTING_MATCH` and `NO_CLEAR_MATCH`) and more descriptive, user-friendly messages.
- Updates the frontend diagnosis chat to correctly parse and display these new backend-generated out-of-scope and verification failure messages.
- Extends the `runDiagnosis` server action to handle the new `out_of_scope_type`, `verification_failure`, `message`, and `is_valid` payload fields.
- Updates sorting options in the data table to use the new `reliabilityRank` property.

# Testing Done:
- Reviewed codebase changes to ensure they align with the project's structural and DaisyUI conventions.
- The `getReliability` utility was updated to include a numerical rank to maintain sortability in the UI without needing to expose raw metrics.

# Additional Notes: 
- Includes an untracked SQL migration script (`backend/migrations/add_initial_eig.sql`) that may need to be committed.
- This addresses the copywriting guidelines to ensure user-facing medical messages avoid absolute claims and use practical, supportive wording.