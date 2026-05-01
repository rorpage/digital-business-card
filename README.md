# digital-business-card

A single-file static web app for managing and sharing contact information via QR codes. No build step, no server, works offline after first load.

## Live site

Deployed via GitHub Pages: <https://rorpage.github.io/digital-business-card/>

## Features

- **Edit mode** - input cards for name, company name, email, phone, personal website, company website, LinkedIn, and GitHub; all fields saved to `localStorage` on every keystroke
- **QR mode** - the first QR is a **Contact Card** (vCard 3.0) encoding all filled fields; subsequent QRs are one per field; navigable with arrow buttons or keyboard arrow keys; position counter (e.g. "2 of 6"); each QR downloadable as a PNG
- **Smart URI prefixing** - `mailto:` for email, `tel:` for phone, URLs passed through as-is
- **JSON export** - "Export JSON" button downloads all contact fields as a `.json` file
- **Theme color picker** - recolors the header and all interactive elements via CSS custom properties
- **Header logo** - upload an image file or paste an HTTPS URL

## Security

- CDN script (`QRCode.js`) pinned with an SRI hash (`integrity="sha384-..."`)
- Logo URL input validates `https:` protocol only
- File uploads restricted to safe raster types (JPEG, PNG, GIF, WebP, AVIF), capped at 512 KB to prevent `localStorage` quota exhaustion

## Deployment

The site is deployed automatically to GitHub Pages on every push to `main` via the workflow at `.github/workflows/deploy.yml`.

To enable GitHub Pages for a fork:

1. Go to **Settings > Pages** in your repository.
2. Under **Source**, select **GitHub Actions**.
3. Push to `main` (or trigger the workflow manually) to deploy.
