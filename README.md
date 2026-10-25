# Vel Aari Designer website

Luxury Aari embroidery studio website. Customers fill in their design details and choose a photo, then the site opens a normal WhatsApp chat to **+91 95002 04337** with their details prefilled. WhatsApp does not allow a website to attach a local photo automatically, so the customer must attach the selected photo in the opened WhatsApp chat and press **Send**. The studio then contacts the customer directly. No WhatsApp Business API credentials are needed.

Designer: C. Jeyamalathi · App developer: C. Sai Thatchith.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set a private `ADMIN_TOKEN` for review moderation.
3. Install dependencies with `npm install`.
4. Start the site with `npm start`, then open `http://localhost:3000`.

The main site uses a WhatsApp `wa.me` link for direct contact. The Node server is used for customer review display and moderation, not for forwarding customer photos. For direct WhatsApp photo sending, customers need WhatsApp installed or WhatsApp Web available, and they must send the chat message themselves.

## Publish and get a website link

This project includes a Render deployment blueprint in `render.yaml` and a GitHub Actions test workflow in `.github/workflows/ci.yml`.

### First publish

1. Confirm the latest project changes are pushed to the GitHub repository.
2. Sign in to Render and choose **New → Blueprint**.
3. Connect the GitHub account and choose `Saidons/Saithatchith`.
4. Review the blueprint's service, Starter plan, and 1 GB persistent disk. This configuration is paid; check the current price in Render before approving.
5. Before creating the service, set a strong private `ADMIN_TOKEN` in Render's environment settings (at least 32 characters). Do not paste it into the repository.
6. Click **Apply** / **Create Blueprint**. Render installs dependencies and starts the app.
7. When the deploy is marked **Live**, use the public `onrender.com` URL shown in the service dashboard. The exact subdomain is assigned by Render; it cannot be predicted in advance.
8. Open that URL on a phone and computer. Test the WhatsApp button, form-to-WhatsApp message, `/healthz`, customer review submission, and `/studio-admin.html` moderation login.
9. Optionally add a custom domain from the Render service settings and follow its DNS and HTTPS instructions.

### Publish future updates

- Push or merge changes to the GitHub `main` branch. Render is configured with `autoDeploy: true`, so it automatically builds and deploys new commits.
- GitHub Actions runs `npm test` on pushes and pull requests to `main`. Review the Actions tab for the test result; do not merge if checks fail.
- Render deploys from the connected branch independently of GitHub Actions checks. Review the commit and build log in Render after each push.

I can't publish it or create the public URL from this workspace because deployment requires access to your hosting account and the repository must be connected there.

## Reviews

Customer ratings are saved as pending and appear publicly only after studio approval. `/studio-admin.html` is the private moderation page; serve the site over HTTPS and set a strong admin token before launch.

## Before launch

- Deploy the website with HTTPS. The full website server is needed for ratings and review moderation.
- Set a unique, private `ADMIN_TOKEN` for the review dashboard.
- Replace sample gallery images with the designer's own work and confirm usage rights.
- Verify the WhatsApp number, contact information, service area, turnaround times, privacy notice, and terms.
- Test the WhatsApp link on mobile and desktop. Confirm that the prefilled message appears and clearly prompts customers to attach the photo and press Send.
- Test mobile layout, keyboard navigation, and review moderation.

No payment options are shown. The website cannot attach a file to an ordinary WhatsApp link automatically; customers attach the photo after WhatsApp opens.
