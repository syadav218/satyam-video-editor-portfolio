const WHATSAPP_NUMBER = '917393092630';

const projects = [
  {
    title: 'Brand Launch Ad',
    type: 'ads',
    label: 'Advertising',
    description: 'A fast, hook-first ad edit designed to introduce a product quickly and drive action.',
    video: '/media/ad-1.mp4'
  },
  {
    title: 'Product Deep Dive',
    type: 'product',
    label: 'Product Review',
    description: 'Clean product storytelling with b-roll, punchy transitions and readable on-screen information.',
    video: '/media/product-1.mp4'
  },
  {
    title: 'Creator Reel',
    type: 'reels',
    label: 'Reels & Shorts',
    description: 'A retention-focused vertical cut with captions, pattern interrupts and social-first pacing.',
    video: '/media/reels-1.mp4'
  },
  {
    title: 'Explainer Cut',
    type: 'explainer',
    label: 'Explainer',
    description: 'A clear, visual explanation built around structure, motion graphics and sound design.',
    video: '/media/explainer-1.mp4'
  }
];

const grid = document.querySelector('#projectGrid');

function waLink(title) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Satyam, I liked your "${title}" project and want to discuss a similar video.`
  )}`;
}

function card(p, i) {
  return `
    <article class="project" data-type="${p.type}" style="--i:${i}">
      <div class="project-media">

        <video
          muted
          loop
          playsinline
          preload="metadata"
          controls
          data-video
        >
          <source src="${p.video}" type="video/mp4">
        </video>

        <div class="media-fallback">
          <span>${p.label}</span>
          <small>${p.video}</small>
        </div>

        <button class="play" aria-label="Play ${p.title}">▶</button>
      </div>

      <div class="project-info">
        <div>
          <p class="eyebrow">${p.label}</p>
          <h3>${p.title}</h3>
        </div>

        <a
          class="round-link"
          href="${waLink(p.title)}"
          target="_blank"
          rel="noopener"
          aria-label="Discuss ${p.title}"
        >
          ↗
        </a>
      </div>

      <p>${p.description}</p>
    </article>
  `;
}

function bindVideos() {
  document.querySelectorAll('.project-media').forEach(box => {
    const video = box.querySelector('[data-video]');
    const button = box.querySelector('.play');
    const fallback = box.querySelector('.media-fallback');

    // Hide fallback when video loads successfully
    video.addEventListener('loadeddata', () => {
      fallback.style.display = 'none';
    });

    video.addEventListener('canplay', () => {
      fallback.style.display = 'none';
    });

    // Show fallback only if video fails
    video.addEventListener('error', () => {
      fallback.style.display = 'grid';
    });

    // Play / Pause button
    button.addEventListener('click', () => {
      if (video.paused) {
        video.play()
          .then(() => {
            button.textContent = '❚❚';
          })
          .catch(() => {
            button.textContent = '▶';
          });
      } else {
        video.pause();
        button.textContent = '▶';
      }
    });
  });
}

function render(filter = 'all') {
  grid.innerHTML = projects
    .filter(p => filter === 'all' || p.type === filter)
    .map(card)
    .join('');

  bindVideos();
}

render();

document.querySelectorAll('.cat').forEach(btn => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('.cat')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');
    render(btn.dataset.filter);
  });
});

// Showreel
const showreel = document.querySelector('#showreel');
const showreelFallback = document.querySelector('#showreelFallback');

if (showreel) {
  showreel.addEventListener('loadeddata', () => {
    if (showreelFallback) {
      showreelFallback.classList.remove('show');
    }
  });

  showreel.addEventListener('error', () => {
    if (showreelFallback) {
      showreelFallback.classList.add('show');
    }
  });
}

// Contact form
const contactForm = document.querySelector('#contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const note = document.querySelector('#formNote');
    note.textContent = 'Sending…';

    const body = new URLSearchParams(
      new FormData(e.currentTarget)
    );

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const data = await response.json();

      note.textContent = data.message;

      if (data.ok) {
        e.currentTarget.reset();
      }
    } catch {
      note.textContent =
        'Could not send right now. Please message me on WhatsApp.';
    }
  });
}
const profileButton = document.querySelector('#profileButton');

if (profileButton) {
  profileButton.addEventListener('click', () => {
    const overlay = document.createElement('div');

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      cursor: zoom-out;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <img
        src="/media/profile.jpg"
        alt="Satyam Yadav"
        style="
          max-width: min(90vw, 500px);
          max-height: 85vh;
          width: auto;
          height: auto;
          object-fit: cover;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,.5);
        "
      />
    `;

    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    document.body.appendChild(overlay);
  });
}