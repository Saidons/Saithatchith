const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const inquiryForm = document.querySelector('#inquiry-form');
const photoInput = document.querySelector('#design-photo');
const uploadDropzone = document.querySelector('#upload-dropzone');
const uploadPreview = document.querySelector('#upload-preview');
const previewImage = document.querySelector('#preview-image');
const uploadFileName = document.querySelector('#upload-file-name');
const uploadError = document.querySelector('#upload-error');
const formMessage = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-inquiry');
const reviewForm = document.querySelector('#review-form');
const reviewMessage = document.querySelector('#review-message');
let previewUrl;

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  });
});

document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach((item) => {
      const isActive = item === button;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    document.querySelectorAll('.gallery-card').forEach((card) => {
      card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.category !== filter);
    });
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

async function loadCustomerReviews() {
  const response = await fetch('/api/reviews', { cache: 'no-store' });
  if (!response.ok) throw new Error('Reviews are temporarily unavailable.');
  const data = await response.json();
  const list = document.querySelector('#review-list');
  list.replaceChildren();
  document.querySelector('#rating-count').textContent = `${data.count} ${data.count === 1 ? 'review' : 'reviews'}`;
  document.querySelector('#average-rating').textContent = data.count ? data.average.toFixed(1) : '—';
  const roundedAverage = Math.round(data.average);
  const starsLabel = `${roundedAverage} out of 5 stars`;
  const summaryStars = document.querySelector('#summary-stars');
  summaryStars.textContent = `${'★'.repeat(roundedAverage)}${'☆'.repeat(5 - roundedAverage)}`;
  summaryStars.setAttribute('aria-label', data.count ? starsLabel : 'No ratings yet');

  if (!data.reviews.length) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = 'Be the first to share your experience with Vel Aari Designer.';
    list.append(empty);
    return;
  }

  data.reviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'review-card';
    const stars = document.createElement('div');
    stars.className = 'review-card-stars';
    stars.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
    stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    const quote = document.createElement('blockquote');
    quote.textContent = `“${review.text}”`;
    const footer = document.createElement('footer');
    footer.textContent = review.name;
    const date = document.createElement('time');
    date.dateTime = review.createdAt;
    date.textContent = new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    footer.append(date);
    card.append(stars, quote, footer);
    list.append(card);
  });
}

loadCustomerReviews().catch(() => {
  document.querySelector('#rating-count').textContent = 'Reviews temporarily unavailable';
});

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;
  const submit = reviewForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  reviewMessage.textContent = 'Submitting your review…';
  reviewMessage.classList.remove('error');
  try {
    const values = new FormData(reviewForm);
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.get('reviewName'), rating: values.get('rating'), text: values.get('reviewText') }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not submit your review.');
    reviewForm.reset();
    reviewMessage.textContent = result.message;
    reviewMessage.classList.add('success');
  } catch (error) {
    reviewMessage.textContent = error.message;
    reviewMessage.classList.add('error');
  } finally {
    submit.disabled = false;
  }
});

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('success', !isError);
  formMessage.classList.toggle('error', isError);
}

function showSelectedPhoto(file) {
  uploadError.hidden = true;
  uploadError.textContent = '';
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    photoInput.value = '';
    uploadError.textContent = 'Please choose a JPG, PNG, or WEBP image.';
    uploadError.hidden = false;
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    photoInput.value = '';
    uploadError.textContent = 'That photo is larger than 5 MB. Please choose a smaller image.';
    uploadError.hidden = false;
    return;
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  uploadFileName.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  uploadPreview.hidden = false;
  uploadDropzone.hidden = true;
}

photoInput.addEventListener('change', () => showSelectedPhoto(photoInput.files[0]));

document.querySelector('#remove-upload').addEventListener('click', () => {
  photoInput.value = '';
  previewImage.removeAttribute('src');
  uploadPreview.hidden = true;
  uploadDropzone.hidden = false;
  uploadError.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
});

uploadDropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  uploadDropzone.classList.add('dragging');
});
uploadDropzone.addEventListener('dragleave', () => uploadDropzone.classList.remove('dragging'));
uploadDropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  uploadDropzone.classList.remove('dragging');
  const [file] = event.dataTransfer.files;
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  photoInput.files = transfer.files;
  showSelectedPhoto(file);
});

inquiryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!inquiryForm.reportValidity()) return;

  const values = new FormData(inquiryForm);
  const message = [
    'Hello Vel Aari Designer, I would like to discuss a custom design.',
    '',
    `Name: ${values.get('name')}`,
    `Email: ${values.get('email')}`,
    `Design: ${values.get('design')}`,
    `Details: ${values.get('message')}`,
    '',
    `I have selected a design photo (${photoInput.files[0].name}). I will attach it here in WhatsApp.`,
  ].join('\n');
  const whatsappUrl = `https://wa.me/919500204337?text=${encodeURIComponent(message)}`;
  const whatsappWindow = window.open(whatsappUrl, '_blank');

  if (whatsappWindow) {
    whatsappWindow.opener = null;
    setFormMessage('WhatsApp opened with your details. Please attach your selected photo in the chat, then press Send.');
  } else {
    setFormMessage('Your browser blocked the new tab. Open WhatsApp using the link on this page, paste your details, attach your selected photo, and press Send.', true);
    window.location.assign(whatsappUrl);
  }
});
