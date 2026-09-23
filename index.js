(() => {
  'use strict';

  // Safety net: if anything below throws, or IntersectionObserver never
  // fires for some other reason, force-reveal everything after a short
  // delay so the page can never stay permanently blank.
  addEventListener('load', () => {
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
        el.style.opacity = '1';
        el.classList.add('in');
      });
    }, 3000);
  });

  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------------------------------------------------
     1. Mobile menu
  --------------------------------------------------------- */
  const header = $('.site-header');
  const toggle = $('.menu-toggle');

  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) header.classList.remove('hide');
  };

  toggle.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });

  $$('.nav-links a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------------------------------------------------------
     2. Header: hides on scroll down, returns on scroll up.
        Also drives the progress bar where CSS scroll timelines
        aren't supported.
  --------------------------------------------------------- */
  const progress = $('.progress');
  const nativeProgress = CSS.supports('animation-timeline: scroll()');
  let lastY = scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 8);

    if (!document.body.classList.contains('menu-open') && Math.abs(y - lastY) > 6) {
      if (y > lastY && y > 240) header.classList.add('hide');
      else header.classList.remove('hide');
      lastY = y;
    }

    if (!nativeProgress && progress) {
      const max = doc.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
    ticking = false;
  };

  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // keyboard users tabbing into a hidden header should see it
  header.addEventListener('focusin', () => header.classList.remove('hide'));

  /* ---------------------------------------------------------
     3. Highlight the nav link for the section in view
  --------------------------------------------------------- */
  const navLinks = new Map(
    $$('.nav-links a:not(.btn)').map((a) => [a.getAttribute('href').slice(1), a])
  );

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.removeAttribute('aria-current'));
        const link = navLinks.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    $$('main section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------------------------------------------------------
     4. Scroll reveals
  --------------------------------------------------------- */
  $$('[data-stagger]').forEach((group) => {
    $$(':scope > .reveal', group).forEach((el, i) => el.style.setProperty('--i', i));
  });

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------------------------------------------------------
     5. Animated counters (hero stats)
  --------------------------------------------------------- */
  const counters = $$('[data-count]');

  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    counters.forEach((el) => { el.textContent = '0' + (el.dataset.suffix || ''); });
    const counterIO = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.closest('.hero') ? 1100 : 0; // wait for the hero entrance
        setTimeout(() => runCounter(entry.target), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => counterIO.observe(el));
  }

  /* ---------------------------------------------------------
     6. Hero ticket tilts toward the cursor (desktop only)
  --------------------------------------------------------- */
  const scene = $('[data-tilt]');
  if (scene && finePointer && !reduceMotion) {
    const tilt = $('.tk-tilt', scene);
    const hero = scene.closest('.hero');
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    let frame;

    const update = (x, y) => {
      const r = scene.getBoundingClientRect();
      const dx = clamp((x - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1);
      const dy = clamp((y - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1);
      tilt.style.setProperty('--ry', `${dx * 14}deg`);
      tilt.style.setProperty('--rx', `${-dy * 10}deg`);
      tilt.style.setProperty('--gx', `${clamp(((x - r.left) / r.width) * 100, 0, 100)}%`);
      tilt.style.setProperty('--gy', `${clamp(((y - r.top) / r.height) * 100, 0, 100)}%`);
    };

    hero.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update(e.clientX, e.clientY));
    });

    hero.addEventListener('pointerleave', () => {
      ['--rx', '--ry', '--gx', '--gy'].forEach((prop) => tilt.style.removeProperty(prop));
    });
  }

  /* ---------------------------------------------------------
     7. Card spotlight follows the cursor
  --------------------------------------------------------- */
  if (finePointer) {
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------------------------------------------------------
     8. Forms
        Set data-endpoint on each <form> in index.html to a
        Formspree (or similar) URL to receive submissions.
        With no endpoint the form only simulates success.
  --------------------------------------------------------- */
  $$('form[data-form]').forEach((form) => {
    const status = $('.form-status', form);
    const button = $('button[type="submit"]', form);
    const endpoint = form.dataset.endpoint;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.dataset.state = 'loading';
      status.textContent = 'Sending…';
      button.disabled = true;

      try {
        if (endpoint) {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        } else {
          console.info('VibeVoyage: no data-endpoint set on this form, so nothing was sent.');
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        form.dataset.state = 'success';
        status.textContent = form.dataset.success;
        form.reset();
      } catch (error) {
        console.error(error);
        form.dataset.state = 'error';
        status.textContent = form.dataset.error;
      } finally {
        button.disabled = false;
      }
    });
  });

  /* ---------------------------------------------------------
     9. Footer year
  --------------------------------------------------------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     10. DEMO ticket checkout
        Everything here is a client-side simulation:
        - "payment" is a timed fake, nothing is charged
        - tickets are saved only to this browser's localStorage
        - nothing is emailed or texted to anyone
        Replace this whole block once a real payment provider
        (e.g. M-Pesa Daraja) and a backend are in place.
  --------------------------------------------------------- */
  const PRICE = 500; // KES, demo only
  const STORAGE_KEY = 'vv_demo_tickets';

  const buyBtn = $('#demo-buy-btn');
  if (buyBtn) {
    const modal = $('#demo-modal');
    const mineModal = $('#demo-mine-modal');
    const mineBtn = $('#demo-view-btn');
    const steps = {
      details: $('#demo-step-details'),
      pay: $('#demo-step-pay'),
      ticket: $('#demo-step-ticket'),
    };
    const qtyOut = $('#d-qty');
    const totalEls = [$('#d-total'), $('#d-total-2')];
    let qty = 1;
    let lastFocused = null;

    const readTickets = () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
      catch { return []; }
    };
    const saveTicket = (ticket) => {
      const all = readTickets();
      all.push(ticket);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* storage full or blocked */ }
    };

    const updateTotal = () => {
      qtyOut.textContent = String(qty);
      totalEls.forEach((el) => { if (el) el.textContent = `KES ${PRICE * qty}`; });
    };

    const showStep = (name) => {
      Object.entries(steps).forEach(([key, el]) => { el.hidden = key !== name; });
    };

    const openModal = () => {
      lastFocused = document.activeElement;
      qty = 1;
      updateTotal();
      showStep('details');
      $('#demo-step-pay .btn').disabled = false;
      $('#demo-processing').hidden = true;
      modal.hidden = false;
      document.body.classList.add('menu-open'); // reuse the same scroll-lock behaviour
      $('#d-name').focus();
    };

    const closeModal = (el) => {
      el.hidden = true;
      document.body.classList.remove('menu-open');
      if (lastFocused) lastFocused.focus();
    };

    buyBtn.addEventListener('click', openModal);

    $$('[data-demo-close]').forEach((el) => el.addEventListener('click', () => {
      closeModal(modal);
      closeModal(mineModal);
    }));

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!modal.hidden) closeModal(modal);
        if (!mineModal.hidden) closeModal(mineModal);
      }
    });

    $('[data-qty="up"]').addEventListener('click', () => { qty = Math.min(qty + 1, 10); updateTotal(); });
    $('[data-qty="down"]').addEventListener('click', () => { qty = Math.max(qty - 1, 1); updateTotal(); });

    let buyerName = '';

    steps.details.addEventListener('submit', (e) => {
      e.preventDefault();
      buyerName = $('#d-name').value.trim() || 'Guest';
      showStep('pay');
    });

    $('[data-step-back]').addEventListener('click', () => showStep('details'));

    $('#demo-pay-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      $('#demo-processing').hidden = false;
      // Simulated processing delay — no real transaction happens here.
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const ticketNo = String(Math.floor(100000 + Math.random() * 900000));
      const total = PRICE * qty;

      $('#dtk-name').textContent = buyerName;
      $('#dtk-qty').textContent = String(qty);
      $('#dtk-total').textContent = `KES ${total}`;
      $('#dtk-no').textContent = ticketNo;
      drawFakeQr($('#dtk-qr'), ticketNo);

      saveTicket({
        no: ticketNo,
        name: buyerName,
        qty,
        total,
        email: $('#d-email').value.trim(),
        phone: $('#d-phone').value.trim(),
        date: new Date().toISOString(),
      });

      btn.disabled = false;
      $('#demo-processing').hidden = true;
      showStep('ticket');
      refreshMineButton();
    });

    // A deterministic-looking but fake pixel grid — this is NOT a scannable QR code.
    function drawFakeQr(container, seedStr) {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      const size = 7;
      canvas.width = size;
      canvas.height = size;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      const ctx = canvas.getContext('2d');
      let seed = [...seedStr].reduce((a, c) => a + c.charCodeAt(0), 0);
      const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      ctx.fillStyle = '#f3efe7';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#0a0a0a';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (rand() > 0.5) ctx.fillRect(x, y, 1, 1);
        }
      }
      container.appendChild(canvas);
    }

    $('#demo-download-btn').addEventListener('click', () => {
      const ticketEl = $('#demo-ticket');
      const rect = ticketEl.getBoundingClientRect();
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#f3efe7';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#c81d25';
      ctx.fillRect(0, 0, rect.width, 40);
      ctx.fillStyle = '#f3efe7';
      ctx.font = '700 11px monospace';
      ctx.fillText('VIBEVOYAGE', 18, 25);
      ctx.textAlign = 'right';
      ctx.fillText('DEMO', rect.width - 18, 25);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0a0a0a';
      ctx.font = '700 13px monospace';
      ctx.fillText('VibeVoyage Demo Night', 18, 66);
      ctx.font = '700 22px sans-serif';
      ctx.fillText($('#dtk-name').textContent, 18, 96);
      ctx.font = '700 12px monospace';
      ctx.fillText(`Qty ${$('#dtk-qty').textContent}   ${$('#dtk-total').textContent}   No. ${$('#dtk-no').textContent}`, 18, 122);
      ctx.font = '10px monospace';
      ctx.fillText('DEMO — NOT VALID FOR ENTRY', 18, rect.height - 16);

      const a = document.createElement('a');
      a.download = `vibevoyage-demo-ticket-${$('#dtk-no').textContent}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    });

    // "My demo tickets" panel
    function refreshMineButton() {
      mineBtn.hidden = readTickets().length === 0;
    }
    refreshMineButton();

    mineBtn.addEventListener('click', () => {
      const list = $('#demo-mine-list');
      const tickets = readTickets();
      list.innerHTML = tickets.length
        ? tickets.map((t) => `
            <div class="demo-mine-item">
              <span>${t.name} &middot; Qty ${t.qty} &middot; KES ${t.total} &middot; No. ${t.no}</span>
            </div>`).join('')
        : '<p class="demo-mine-empty">No demo tickets yet.</p>';
      lastFocused = document.activeElement;
      mineModal.hidden = false;
      document.body.classList.add('menu-open');
    });
  }
})();