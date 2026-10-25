require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const appUrl = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).replace(/\/$/, '');
const dataDirectory = path.resolve(process.env.DATA_DIRECTORY || path.join(__dirname, '..', 'aari-studio-private'));
const reviewsPath = path.join(dataDirectory, 'reviews.json');
const reviewSubmissionTimes = new Map();

function requireStudioAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || '';
  const supplied = req.get('x-studio-admin-token') || '';
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (!expected || expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(401).json({ error: 'Studio admin authorization is required.' });
  }
  next();
}

async function readReviews() {
  try {
    return JSON.parse(await fs.readFile(reviewsPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeReviews(reviews) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporary = `${reviewsPath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(reviews, null, 2), { mode: 0o600 });
  await fs.rename(temporary, reviewsPath);
}

async function updateReview(reviewId, status) {
  const reviews = await readReviews();
  const review = reviews.find((item) => item.id === reviewId);
  if (!review) return null;
  review.status = status;
  review.moderatedAt = new Date().toISOString();
  await writeReviews(reviews);
  return review;
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '8kb' }));
app.use(express.static(__dirname, { dotfiles: 'deny', index: 'index.html', maxAge: '1h' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/reviews', async (_req, res) => {
  try {
    const reviews = (await readReviews())
      .filter((review) => review.status === 'approved')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50)
      .map(({ name, rating, text, createdAt }) => ({ name, rating, text, createdAt }));
    const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
    res.json({ reviews, count: reviews.length, average: Number(average.toFixed(1)) });
  } catch (error) {
    console.error('Unable to load customer reviews:', error.message);
    res.status(500).json({ error: 'Could not load customer reviews.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const recent = (reviewSubmissionTimes.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 3) return res.status(429).json({ error: 'Please wait before submitting another review.' });

  const { name, rating, text } = req.body || {};
  const numericRating = Number(rating);
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Please enter a name between 2 and 60 characters.' });
  }
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Please choose a rating from 1 to 5 stars.' });
  }
  if (typeof text !== 'string' || text.trim().length < 8 || text.trim().length > 700) {
    return res.status(400).json({ error: 'Please write a review between 8 and 700 characters.' });
  }

  try {
    const reviews = await readReviews();
    reviews.push({
      id: crypto.randomBytes(16).toString('hex'),
      name: name.trim(),
      rating: numericRating,
      text: text.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    await writeReviews(reviews);
    recent.push(now);
    reviewSubmissionTimes.set(ip, recent);
    res.status(201).json({ submitted: true, message: 'Thank you! Your review was submitted for studio approval.' });
  } catch (error) {
    console.error('Unable to save customer review:', error.message);
    res.status(500).json({ error: 'Could not save your review. Please try again.' });
  }
});

app.get('/api/studio/reviews', requireStudioAdmin, async (_req, res) => {
  try {
    const reviews = (await readReviews()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    res.json({ reviews });
  } catch (error) {
    console.error('Unable to load reviews for moderation:', error.message);
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

app.post('/api/studio/reviews/:reviewId/moderate', requireStudioAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!/^[a-f0-9]{32}$/.test(req.params.reviewId) || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid review or moderation status.' });
  }
  try {
    const review = await updateReview(req.params.reviewId, status);
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json({ moderated: true, status: review.status });
  } catch (error) {
    console.error('Unable to moderate customer review:', error.message);
    res.status(500).json({ error: 'Could not update this review.' });
  }
});

app.listen(port, () => {
  if (process.env.NODE_ENV === 'production' && !appUrl.startsWith('https://')) {
    console.error('Configuration error: APP_URL must use HTTPS in production.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && (process.env.ADMIN_TOKEN || '').length < 32) {
    console.error('Configuration error: set an ADMIN_TOKEN with at least 32 characters before production.');
    process.exit(1);
  }
  console.info(`Vel Aari Designer site is running at ${appUrl}`);
});
