# Content editor acceptance checks

The initial browser checks used a production build with local WCA and Directus fixtures. Those checks did not change production records.

## Passed checks

- An anonymous visitor cannot open the editor or save content.
- A full editor can add a draft delegate, publish it, hide it, and change its region.
- Public delegate lists show only published profiles.
- A full editor can add, publish, hide, and delete FAQ questions.
- A full editor can update page content and inspect its preview.
- Scripts do not run in the preview or on the public page.
- A full editor can add, deactivate, and delete another editor.
- The editor cannot revoke accounts listed in `CONTENT_EDITOR_WCA_IDS` through the website.
- A delegate sees only their own profile and can edit its name, email, region, blurb, publication status, and display order.
- A delegate's WCA ID is read-only, and the server rejects attempts to change it.
- The editor selects a delegate's profile automatically when there is one matching record.
- A saved blurb remains after a page reload.
- Forged requests cannot edit another delegate or change a delegate's WCA ID.
- All public routes load without horizontal overflow at the desktop width.
- The delegate editor fits a mobile screen.
- Sign out removes access and returns to the login page.
- Browser checks reported no JavaScript errors.

The automated checks cover OAuth state, PKCE, encrypted sessions, expiration, current WCA roles, and same-origin protection. They also cover input limits, publication filters, editor revocation, and repeatable setup on Directus 10 and 11. Setup tests include legacy FAQ field names and Boolean editor flags. Form tests cover automatic profile selection, editable profile fields, and the read-only WCA ID.

## Live setup recovery

The recovery checks used `https://admin.pnwcubing.com` on November 5, 2026. Setup completed and reused `FAQ.Answer` without renaming the field. Repeated setup runs also completed.

The live checks passed:

- All 15 original delegate records and the original FAQ record stayed unchanged.
- The service token read all four CMS collections.
- The service role had only the 14 required content rules, with administrator and Data Studio access disabled.
- The service token could not read fields, users, roles, or permissions.
- FAQ creation and updates used the existing `Answer` field.
- Hidden FAQ records and draft delegate records stayed out of public lists.
- A test delegate identity could edit its matching blurb but could not edit another delegate.
- `SiteEditors.active` returned Boolean values after setup repaired its format.
- The temporary FAQ and delegate records were removed after the checks.

The local login route reached the WCA authorization endpoint. These API checks used test identities for ownership checks. The production build passed. API checks do not replace a real WCA sign-in and the full editor browser checks.
