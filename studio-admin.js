const loginForm = document.querySelector('#admin-login');
const tokenInput = document.querySelector('#admin-token');
const message = document.querySelector('#admin-message');
const reviewsElement = document.querySelector('#admin-reviews');
let studioToken = '';

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

async function loadReviews() {
  setMessage('Loading customer ratings…');
  const response = await fetch('/api/studio/reviews', {
    headers: { 'x-studio-admin-token': studioToken },
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load customer ratings.');

  reviewsElement.replaceChildren();
  if (!result.reviews.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = 'No customer ratings submitted yet.';
    reviewsElement.append(empty);
  }

  result.reviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'admin-review';
    const header = document.createElement('div');
    header.className = 'admin-review-head';
    const title = document.createElement('strong');
    title.textContent = review.name;
    const status = document.createElement('span');
    status.className = 'admin-review-status';
    status.textContent = review.status.toUpperCase();
    header.append(title, status);

    const stars = document.createElement('p');
    stars.className = 'admin-stars';
    stars.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
    const text = document.createElement('p');
    text.textContent = review.text;
    const date = document.createElement('p');
    date.textContent = new Date(review.createdAt).toLocaleString();
    card.append(header, stars, text, date);

    if (review.status !== 'approved') {
      const actions = document.createElement('div');
      actions.className = 'admin-review-actions';
      actions.append(createModerationButton(review.id, 'approved', 'Approve'), createModerationButton(review.id, 'rejected', 'Reject'));
      card.append(actions);
    }
    reviewsElement.append(card);
  });
  setMessage(`${result.reviews.length} rating(s) loaded.`);
}

function createModerationButton(reviewId, status, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const response = await fetch(`/api/studio/reviews/${encodeURIComponent(reviewId)}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-studio-admin-token': studioToken },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update the rating.');
      await loadReviews();
      setMessage(`Rating ${status}.`);
    } catch (error) {
      button.disabled = false;
      setMessage(error.message, true);
    }
  });
  return button;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  studioToken = tokenInput.value;
  try {
    await loadReviews();
  } catch (error) {
    studioToken = '';
    setMessage(error.message, true);
  }
});
