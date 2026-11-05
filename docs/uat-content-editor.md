# Content editor acceptance checks

The checks used a production build with local WCA and Directus fixtures. No production records changed.

## Passed checks

- An anonymous visitor cannot open the editor or save content.
- A full editor can add a draft delegate, publish it, hide it, and change its region.
- Public delegate lists show only published profiles.
- A full editor can add, publish, hide, and delete FAQ questions.
- A full editor can update page content and inspect its preview.
- Scripts do not run in the preview or on the public page.
- A full editor can add, deactivate, and delete another editor.
- The editor cannot revoke the bootstrap account through the website.
- A delegate sees only their own profile and can save only its blurb.
- A saved blurb remains after a page reload.
- Forged requests cannot edit another delegate or publish a profile.
- All public routes load without horizontal overflow at the desktop width.
- The delegate editor fits a mobile screen.
- Sign out removes access and returns to the login page.
- Browser checks reported no JavaScript errors.

The 24 automated checks also cover OAuth state, PKCE, encrypted sessions, expiration, current WCA roles, same-origin protection, input limits, publication filters, editor revocation, and repeatable setup on Directus 10 and 11.

## Live setup still required

The real WCA OAuth application and Directus service token were not available in this environment. Complete the steps in [the setup guide](content-editor.md), then repeat the live acceptance checks there.
