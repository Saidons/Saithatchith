# Vel Aari Designer — Launch checklist

The customer enquiry form opens a regular WhatsApp conversation with the customer’s details prefilled. Normal WhatsApp links cannot attach local files automatically; the customer must attach the selected photo in WhatsApp and tap **Send**.

- [ ] Install Node.js 20+ and dependencies; run `npm test` and `npm audit --omit=dev`.
- [ ] Connect `Saidons/Saithatchith` to Render using **New → Blueprint** and `render.yaml`. Review current paid Starter and 1 GB persistent disk pricing before creating the service.
- [ ] Set a strong private `ADMIN_TOKEN` in Render's environment settings before applying the Blueprint.
- [ ] Confirm the GitHub Actions `Verify website` workflow passes. Note: Render auto-deploys `main` independently, so check build logs too.
- [ ] After deployment, copy the actual HTTPS URL shown in the Render dashboard and open it on phone and desktop.
- [ ] Copy `.env.example` to the hosting environment and set a unique `ADMIN_TOKEN` with at least 32 random characters.
- [ ] Verify the WhatsApp contact is `+91 95002 04337`.
- [ ] Test the WhatsApp link on Android, iPhone, and desktop/WhatsApp Web. Check prefilled enquiry text and make sure instructions remind customers to attach the photo and press Send.
- [ ] Open `/studio-admin.html` over HTTPS, confirm the admin token, and test review approve/reject.
- [ ] Replace gallery sample images with the designer’s own work; confirm image usage rights.
- [ ] Confirm designer/developer credits, contact details, service area, turnaround times, privacy notice, and terms.
- [ ] Test accessibility, mobile layout, review submission, and browser popup-blocking behavior.

No payment or WhatsApp Cloud API setup is used by the customer enquiry flow. A regular WhatsApp link cannot transmit a photo from a website; customers must choose/attach the image in the opened chat and send it themselves.
