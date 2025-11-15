const THEME_STORAGE_KEY = 'rs-theme-preference';
const STATUS_CHECK_TIMEOUT = 8000;
const STATUS_TEXT = {
    checking: 'Memeriksa status…',
    online: 'Terhubung',
    offline: 'Tidak Dapat Diakses'
};
const ERAPOR_DEFAULT_YEAR = '2025/2026';
const ERAPOR_PORTAL_HINT = 'Klik untuk membuka portal pada tab baru, lalu masuk dengan akun yang sudah dibagikan.';
const copyFeedbackTimers = typeof WeakMap === 'function' ? new WeakMap() : null;
const ERAPOR_CONFIG = {
    '2025/2026': {
        serviceName: 'E-Rapor 2025',
        url: 'https://rapor.smkn1telagasari.web.id/',
        summary: 'Gunakan format E-Rapor 2025 untuk pelaporan kurikulum terbaru.',
        note: 'Portal terbuka di tab baru. Ini aplikasi E-Rapor 2025 untuk Kurikulum Merdeka; gunakan akun E-Rapor 2025 (akun baru). Akun lama tidak berlaku di versi ini.',
        highlight: true,
        allowOpaque: false
    },
    '2024/2025': {
        serviceName: 'E-Rapor SMK',
        url: 'https://erapor.smkn1telagasari.web.id/',
        summary: 'Gunakan portal E-Rapor SMK untuk pengolahan nilai tahun 2024/2025.',
        note: 'Portal terbuka di tab baru. Ini aplikasi E-Rapor SMK lama; gunakan akun E-Rapor SMK lama. Akun E-Rapor 2025 tidak berlaku untuk versi ini.',
        highlight: false,
        allowOpaque: false
    },
    '2023/2024': {
        serviceName: 'E-Rapor SMK',
        url: 'https://erapor.smkn1telagasari.web.id/',
        summary: 'Gunakan portal E-Rapor SMK untuk pelaporan tahun 2023/2024.',
        note: 'Portal terbuka di tab baru. Ini aplikasi E-Rapor SMK lama; gunakan akun E-Rapor SMK lama. Akun E-Rapor 2025 tidak berlaku untuk versi ini.',
        highlight: false,
        allowOpaque: false
    },
    '2022/2023': {
        serviceName: 'E-Rapor SMK',
        url: 'https://erapor.smkn1telagasari.web.id/',
        summary: 'Portal E-Rapor SMK mendukung arsip nilai tahun 2022/2023.',
        note: 'Portal terbuka di tab baru. Ini aplikasi E-Rapor SMK lama; gunakan akun E-Rapor SMK lama. Akun E-Rapor 2025 tidak berlaku untuk versi ini.',
        highlight: false,
        allowOpaque: false
    }
};
const serviceStatusCache = typeof Map === 'function' ? new Map() : null;
const serviceStatusStore = serviceStatusCache ? null : {};

function applyThemePreference(theme){
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    const toggle = document.querySelector('.theme-toggle');
    if (toggle){
        const icon = toggle.querySelector('i');
        if (icon){
            icon.className = nextTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        toggle.setAttribute('aria-label', nextTheme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
        toggle.setAttribute('title', nextTheme === 'dark' ? 'Mode terang' : 'Mode gelap');
    }
}

function resolveInitialTheme(){
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

applyThemePreference(resolveInitialTheme());

const modalFocusMap = new WeakMap();

function getFocusableElements(container){
    if (!container) return [];
    return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && isElementVisible(el));
}

function isElementVisible(el){
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function applyModalFocus(modal, triggerEl, priorityFocusEl){
    if (!modal) return;
    const previous = triggerEl instanceof HTMLElement ? triggerEl : document.activeElement;
    const handler = function(e){
        if (e.key === 'Tab'){
            const focusables = getFocusableElements(modal);
            if (focusables.length === 0){
                e.preventDefault();
                modal.setAttribute('tabindex','-1');
                modal.focus();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;
            if (e.shiftKey){
                if (active === first || !modal.contains(active)){
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last){
                    e.preventDefault();
                    first.focus();
                }
            }
        }
        if (e.key === 'Enter'){
            const active = document.activeElement;
            if (active && active.classList.contains('close-btn')){
                e.preventDefault();
                active.click();
            }
        }
    };

    modalFocusMap.set(modal, { previous, handler });
    modal.addEventListener('keydown', handler);

    const target = (priorityFocusEl && typeof priorityFocusEl.focus === 'function') ? priorityFocusEl : getFocusableElements(modal)[0];
    window.requestAnimationFrame(() => {
        if (target && typeof target.focus === 'function'){
            target.focus();
        } else {
            modal.setAttribute('tabindex','-1');
            modal.focus();
        }
    });
}

function releaseModalFocus(modal){
    const state = modalFocusMap.get(modal);
    if (!state) return;
    modal.removeEventListener('keydown', state.handler);
    const previous = state.previous;
    modalFocusMap.delete(modal);
    if (previous && typeof previous.focus === 'function' && document.contains(previous)){
        previous.focus();
    }
}

function openGenericModal(modal, triggerEl, focusTarget){
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    applyModalFocus(modal, triggerEl, focusTarget);
}

function closeGenericModal(modal){
    if (!modal) return;
    modal.classList.remove('active');
    releaseModalFocus(modal);
    if (!document.querySelector('.modal.active')){
        document.body.style.overflow = '';
    }
}

document.addEventListener('DOMContentLoaded', function(){
    const toggle = document.querySelector('.theme-toggle');
    const initial = document.documentElement.getAttribute('data-theme') || resolveInitialTheme();
    applyThemePreference(initial);
    if (!toggle) return;
    toggle.addEventListener('click', function(){
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_STORAGE_KEY, next);
        applyThemePreference(next);
    });

    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (media){
        const listener = function(e){
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') return;
            applyThemePreference(e.matches ? 'dark' : 'light');
        };
        if (media.addEventListener) media.addEventListener('change', listener);
        else if (media.addListener) media.addListener(listener);
    }
});

// ===========================
// E-Rapor Modal Functionality
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    const eraporBtn = document.getElementById('erapor-btn');
    const modal = document.getElementById('erapor-modal');
    const closeBtn = document.getElementById('close-modal');

    if (eraporBtn && modal){
        eraporBtn.addEventListener('click', function(e){
            e.preventDefault();
            const firstOption = modal.querySelector('.modal-option');
            openGenericModal(modal, eraporBtn, firstOption);
        });
    }

    if (closeBtn && modal){
        closeBtn.addEventListener('click', function(){
            closeGenericModal(modal);
        });
    }

    setupLoadingLinks();
    setupEraporSelector();
});

function setupLoadingLinks(){
    const overlay = document.getElementById('redirect-overlay');
    const links = Array.from(document.querySelectorAll('[data-loading-link]'));
    if (!overlay || links.length === 0) return;
    const messageEl = overlay.querySelector('[data-loading-message]');
    const hideOverlay = () => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.modal.active')){
            document.body.style.overflow = '';
        }
    };
    const showOverlay = (message) => {
        if (messageEl){
            messageEl.textContent = message;
        }
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay){
            hideOverlay();
        }
    });
    links.forEach(link => {
        link.addEventListener('click', function(event){
            const targetUrl = this.getAttribute('href');
            if (!targetUrl || targetUrl === '#') return;
            event.preventDefault();
            const message = this.getAttribute('data-loading-text') || 'Mengarahkan ke layanan…';
            const targetName = this.getAttribute('data-loading-target') || '_blank';
            showOverlay(message);
            const features = targetName === '_blank' ? 'noopener' : '';
            setTimeout(() => {
                try {
                    window.open(targetUrl, targetName, features);
                } catch(err){
                    console.warn('Gagal membuka tautan:', err);
                }
                setTimeout(hideOverlay, 700);
            }, 600);
        });
    });
}

function copyTextToClipboard(text){
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful){
                resolve();
            } else {
                reject(new Error('Copy command unsuccessful'));
            }
        } catch(err){
            reject(err);
        }
    });
}

function attachCopyHandler(button){
    if (!button || button.dataset.copyAttached === 'true') return;
    const labelSpan = button.querySelector('[data-copy-label]');
    const defaultLabel = button.getAttribute('data-copy-default') || 'Salin Link';
    const successLabel = button.getAttribute('data-copy-success') || 'Tautan disalin';
    const failLabel = button.getAttribute('data-copy-fail') || 'Salin manual';

    const resetState = () => {
        if (labelSpan){
            labelSpan.textContent = defaultLabel;
        }
        button.classList.remove('is-success', 'is-error', 'is-busy');
    };

    const scheduleReset = () => {
        const resetFn = () => {
            resetState();
        };
        if (copyFeedbackTimers){
            const existing = copyFeedbackTimers.get(button);
            if (existing) clearTimeout(existing);
            const timer = setTimeout(resetFn, 2000);
            copyFeedbackTimers.set(button, timer);
        } else {
            setTimeout(resetFn, 2000);
        }
    };

    button.addEventListener('click', () => {
        const url = button.getAttribute('data-copy-url');
        if (!url) return;
        button.classList.add('is-busy');
        copyTextToClipboard(url).then(() => {
            button.classList.remove('is-busy');
            button.classList.add('is-success');
            button.classList.remove('is-error');
            if (labelSpan){
                labelSpan.textContent = successLabel;
            }
            scheduleReset();
        }).catch(() => {
            button.classList.remove('is-busy');
            button.classList.add('is-error');
            button.classList.remove('is-success');
            if (labelSpan){
                labelSpan.textContent = failLabel;
            }
            scheduleReset();
        });
    });

    button.dataset.copyAttached = 'true';
}

function setupEraporSelector(){
    const yearSelect = document.getElementById('erapor-year');
    const semesterSelect = document.getElementById('erapor-semester');
    const resultCard = document.getElementById('erapor-result');
    const titleEl = document.getElementById('erapor-result-title');
    const statusEl = document.getElementById('erapor-result-status');
    const actionEl = document.getElementById('erapor-result-link');
    const noteEl = document.getElementById('erapor-result-note');
    const copyBtn = document.getElementById('erapor-copy-link');
    if (!yearSelect || !semesterSelect || !resultCard || !titleEl || !statusEl || !actionEl || !noteEl || !copyBtn) return;

    attachCopyHandler(copyBtn);

    const updateOutput = () => {
        const selectedYear = yearSelect.value || ERAPOR_DEFAULT_YEAR;
        const semesterValue = semesterSelect.value || 'ganjil';
        const config = ERAPOR_CONFIG[selectedYear] || ERAPOR_CONFIG[ERAPOR_DEFAULT_YEAR];
        const semesterLabel = semesterValue === 'genap' ? 'Semester Genap' : 'Semester Ganjil';
        const metaLabel = `${selectedYear} • ${semesterLabel}`;
        const actionLabel = 'Buka E-Rapor';

        resultCard.classList.toggle('is-current', !!config.highlight);
        titleEl.textContent = metaLabel;

        statusEl.setAttribute('data-status-url', config.url);
        statusEl.setAttribute('data-status-allow-opaque', config.allowOpaque === true ? 'true' : 'false');
        setStatusIndicator(statusEl, 'checking');

        actionEl.href = config.url;
        actionEl.setAttribute('data-loading-text', `Menghubungkan ke portal ${metaLabel}…`);
        actionEl.setAttribute('aria-label', `${actionLabel} ${metaLabel}`);
        actionEl.setAttribute('title', actionLabel);
        const labelSpan = actionEl.querySelector('span');
        if (labelSpan){
            labelSpan.textContent = actionLabel;
        }

        copyBtn.setAttribute('data-copy-url', config.url);
        copyBtn.setAttribute('aria-label', `Salin link portal ${metaLabel}`);
        const copyLabelSpan = copyBtn.querySelector('[data-copy-label]');
        if (copyLabelSpan){
            copyLabelSpan.textContent = copyBtn.getAttribute('data-copy-default') || 'Salin Link';
        }
        copyBtn.classList.remove('is-success', 'is-error');
        copyBtn.classList.remove('is-busy');
        if (copyFeedbackTimers){
            const pending = copyFeedbackTimers.get(copyBtn);
            if (pending) clearTimeout(pending);
            copyFeedbackTimers.delete(copyBtn);
        }

        noteEl.textContent = config.note || ERAPOR_PORTAL_HINT;

        window.requestAnimationFrame(() => evaluateServiceStatuses(true));
    };

    yearSelect.addEventListener('change', updateOutput);
    semesterSelect.addEventListener('change', updateOutput);
    updateOutput();
}

// ===========================
// Bottom Navigation & Sidebar Active State
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    const actionables = document.querySelectorAll('[data-action]');

    actionables.forEach(el => {
        el.addEventListener('click', function(e) {
            const action = this.getAttribute('data-action');
            if (!action) return;
            if (action === 'home') {
                e.preventDefault();
                const home = document.getElementById('home');
                if (home) home.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            if (action === 'contact') {
                e.preventDefault();
                const m = document.getElementById('contact-modal');
                if (m) {
                    const firstField = document.getElementById('cf-name');
                    openGenericModal(m, this, firstField);
                }
                return;
            }
            if (action === 'about') {
                e.preventDefault();
                const m = document.getElementById('about-modal');
                if (m) openGenericModal(m, this);
                return;
            }
            if (action === 'search') {
                e.preventDefault();
                const m = document.getElementById('search-modal');
                if (m) {
                    const input = document.getElementById('search-input');
                    if (input) {
                        input.value = '';
                        renderSearch('');
                    }
                    openGenericModal(m, this, input);
                }
                return;
            }
            if (action === 'guide') {
                e.preventDefault();
                const m = document.getElementById('guide-modal');
                if (m) openGenericModal(m, this);
                return;
            }
        });
    });

    // Close buttons (generic, using data-close)
    document.querySelectorAll('.close-btn[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-close');
            const m = document.getElementById(targetId);
            if (m) closeGenericModal(m);
        });
    });

    // Close on overlay click for all modals
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', function(e) {
            if (e.target === m) closeGenericModal(m);
        });
    });

    // Escape key closes any open modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeGenericModal(m));
        }
    });

});

// ===========================
// App Card Click Handling
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    const appCards = document.querySelectorAll('.app-card:not(#erapor-btn)');
    // No JS interception; allow default navigation. Add minimal press feedback only.
    appCards.forEach(card => {
        card.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.98)';
        });
        card.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
});

// ===========================
// Modal Options Click Handling
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    const modalOptions = document.querySelectorAll('.modal-option');

    modalOptions.forEach(option => {
        option.addEventListener('click', function() {
            const modal = document.getElementById('erapor-modal');
            if (modal) closeGenericModal(modal);
        });
    });
});

// ===========================
// Notification System (Optional)
// (Removed) Notification system to keep UI minimal and focused

// ===========================
// Smooth Scroll Enhancement
// ===========================
// Smooth scroll retained only for internal anchors (currently not used)

// ===========================
// Touch Feedback for Mobile
// ===========================
// Minimal touch feedback (keep it simple)
document.addEventListener('DOMContentLoaded', function() {
    const touchElements = document.querySelectorAll('.app-card, .nav-item, .modal-option, .quick-action');
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() { this.style.opacity = '0.85'; });
        ['touchend','touchcancel'].forEach(ev => element.addEventListener(ev, function() { this.style.opacity = ''; }));
    });
});

function setStatusIndicator(el, state){
    if (!el) return;
    const normalized = state === 'online' || state === 'offline' ? state : 'checking';
    el.classList.remove('status-online','status-offline','status-checking');
    el.classList.add(`status-${normalized}`);
    el.textContent = STATUS_TEXT[normalized] || STATUS_TEXT.checking;
}

function createCacheBustedUrl(url){
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('_status', Date.now().toString());
        return parsed.toString();
    } catch (err){
        return url;
    }
}

function probeImage(src){
    return new Promise(resolve => {
        let settled = false;
        const timer = setTimeout(() => finalize(false), STATUS_CHECK_TIMEOUT);
        const img = new Image();
        if ('referrerPolicy' in img){
            img.referrerPolicy = 'no-referrer';
        }
        img.onload = () => finalize(true);
        img.onerror = () => finalize(false);
        function finalize(result){
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            img.onload = img.onerror = null;
            resolve(result);
        }
        try{
            img.src = src;
        } catch(err){
            finalize(false);
        }
    });
}

function probeByFetch(url, allowOpaque){
    return new Promise(resolve => {
        let completed = false;
        const controller = 'AbortController' in window ? new AbortController() : null;
        const timer = setTimeout(() => finalize(false), STATUS_CHECK_TIMEOUT);
        function finalize(result){
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            resolve(result);
        }
        const target = createCacheBustedUrl(url);
        const options = { method: 'GET', mode: 'no-cors', cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit' };
        if (controller){
            options.signal = controller.signal;
        }
        if (typeof fetch !== 'function'){
            finalize(false);
            return;
        }
        let fetchPromise;
        try {
            fetchPromise = fetch(target, options);
        } catch (err){
            finalize(false);
            return;
        }
        fetchPromise
            .then(response => {
                if (!response){
                    finalize(false);
                    return;
                }
                if (response.type === 'opaque' || response.type === 'opaqueredirect'){
                    finalize(!!allowOpaque);
                    return;
                }
                finalize(response.ok === true);
            })
            .catch(() => finalize(false));
    });
}

function buildProbeCandidates(serviceUrl, probeHint){
    const candidates = [];
    const pushUnique = (value) => {
        if (!value) return;
        if (!candidates.includes(value)) candidates.push(value);
    };
    if (probeHint){
        pushUnique(createCacheBustedUrl(probeHint));
    }
    try{
        const parsed = new URL(serviceUrl);
        const origin = `${parsed.protocol}//${parsed.host}`;
        pushUnique(createCacheBustedUrl(`${origin}/favicon.ico`));
        pushUnique(createCacheBustedUrl(`${origin}/apple-touch-icon.png`));
        if (parsed.pathname && parsed.pathname !== '/'){
            const trimmed = parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname;
            if (trimmed){
                pushUnique(createCacheBustedUrl(`${origin}${trimmed}/favicon.ico`));
            }
        }
    } catch(err){
        pushUnique(createCacheBustedUrl(serviceUrl));
    }
    return candidates;
}

function probeService(url, probeHint, allowOpaque){
    const candidates = buildProbeCandidates(url, probeHint);
    return new Promise(resolve => {
        const fallback = () => {
            const fallbackTarget = probeHint || url;
            if (!fallbackTarget){
                resolve(false);
                return;
            }
            probeByFetch(fallbackTarget, allowOpaque).then(resolve);
        };
        if (!candidates.length){
            fallback();
            return;
        }
        const attempt = (index) => {
            if (index >= candidates.length){
                fallback();
                return;
            }
            probeImage(candidates[index]).then(result => {
                if (result){
                    resolve(true);
                    return;
                }
                attempt(index + 1);
            });
        };
        attempt(0);
    });
}

function requestServiceStatus(url, probeHint, allowOpaque, forceRefresh){
    const cacheKey = `${url}|${probeHint || ''}|${allowOpaque ? 'lenient' : 'strict'}`;
    if (serviceStatusCache){
        if (forceRefresh){
            serviceStatusCache.delete(cacheKey);
        }
        if (!serviceStatusCache.has(cacheKey)){
            serviceStatusCache.set(cacheKey, probeService(url, probeHint, allowOpaque));
        }
        return serviceStatusCache.get(cacheKey);
    }
    if (forceRefresh){
        delete serviceStatusStore[cacheKey];
    }
    if (!serviceStatusStore[cacheKey]){
        serviceStatusStore[cacheKey] = probeService(url, probeHint, allowOpaque);
    }
    return serviceStatusStore[cacheKey];
}

function evaluateServiceStatuses(forceRefresh){
    const statusElements = Array.from(document.querySelectorAll('[data-status-url]'));
    if (statusElements.length === 0) return;
    statusElements.forEach(el => {
        const url = el.getAttribute('data-status-url');
        const probeHint = el.getAttribute('data-status-probe');
        const allowOpaqueAttr = el.getAttribute('data-status-allow-opaque');
        const allowOpaque = allowOpaqueAttr === null ? true : allowOpaqueAttr === 'true';
        if (!url || url === '#'){
            setStatusIndicator(el, 'offline');
            return;
        }
        if (!forceRefresh){
            setStatusIndicator(el, 'checking');
        }
        let finalized = false;
        const guardTimer = setTimeout(() => {
            if (finalized) return;
            finalized = true;
            setStatusIndicator(el, 'offline');
        }, STATUS_CHECK_TIMEOUT + 1500);
        const shouldForce = !!forceRefresh && el.classList.contains('status-checking');
        requestServiceStatus(url, probeHint, allowOpaque, shouldForce)
            .then(isOnline => {
                if (finalized) return;
                finalized = true;
                clearTimeout(guardTimer);
                setStatusIndicator(el, isOnline ? 'online' : 'offline');
            })
            .catch(() => {
                if (finalized) return;
                finalized = true;
                clearTimeout(guardTimer);
                setStatusIndicator(el, 'offline');
            });
    });
}

document.addEventListener('DOMContentLoaded', function(){
    evaluateServiceStatuses(false);
    setTimeout(() => evaluateServiceStatuses(true), STATUS_CHECK_TIMEOUT + 2500);
});

window.addEventListener('focus', () => evaluateServiceStatuses(true));
document.addEventListener('visibilitychange', () => {
    if (!document.hidden){
        evaluateServiceStatuses(true);
    }
});

// ===========================
// Service Worker Registration (Optional - for PWA)
// ===========================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Uncomment when you have a service worker file
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('Service Worker registered'))
        //     .catch(err => console.log('Service Worker registration failed'));
    });
}

// ===========================
// Dynamic Year Update (Optional)
// ===========================
// (Removed) Dynamic year and other non-essential demo scripts

// ===========================
// Sidebar Menu Items Functionality
// ===========================
// (Removed) Sidebar handlers

// ===========================
// Add Ripple Effect on Cards
// ===========================
// (Removed) Ripple effect and stat animations

// ===========================
// Dynamic Time Greeting
// ===========================
// (Removed) Greeting and stats demos

// ===========================
// Auto-update stats (demo)
// ===========================
// Removed stats demo block to keep script minimal

// ===========================
// Contact Form -> WhatsApp
// ===========================
document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function(e){
        e.preventDefault();
        const phone = (form.getAttribute('data-whatsapp') || '').replace(/\D/g,'');
        const name = document.getElementById('cf-name')?.value?.trim() || '';
        const msg = document.getElementById('cf-message')?.value?.trim() || '';
        if (!phone) return;
        const text = `Halo Admin SMKN 1 Telagasari,%0A%0ASaya ${encodeURIComponent(name)}.%0A${encodeURIComponent(msg)}%0A%0ATerkirim dari Ruang Sinergi.`;
        const url = `https://wa.me/${phone}?text=${text}`;
        window.open(url, '_blank', 'noopener');
        // Close modal after opening WhatsApp
        const m = document.getElementById('contact-modal');
        if (m) closeGenericModal(m);
        form.reset();
    });
});

// ===========================
// Search functionality
// ===========================
document.addEventListener('DOMContentLoaded', function(){
    const input = document.getElementById('search-input');
    if (input){
        input.addEventListener('input', function(){
            renderSearch(this.value);
        });
    }

    // Keyboard shortcut: '/'
    document.addEventListener('keydown', function(e){
        // Ignore if typing in input/textarea
        const active = document.activeElement;
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (isTyping) return;
        if (e.key === '/'){
            e.preventDefault();
            const m = document.getElementById('search-modal');
            if (m){
                const opener = document.querySelector('[data-action="search"]');
                opener?.click();
            }
        }
    });
});

function renderSearch(query){
    const q = (query||'').toLowerCase().trim();
    const cards = Array.from(document.querySelectorAll('.app-grid .app-card'));
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    const items = cards.map(card => {
        const title = card.querySelector('h3')?.textContent || '';
        const desc = card.querySelector('p')?.textContent || '';
        return {card, title, desc, href: card.getAttribute('href') || '#'};
    }).filter(it => q === '' || it.title.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q));

    if (items.length === 0){
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = 'Tidak ada hasil.';
        resultsEl.appendChild(empty);
        return;
    }

    items.forEach(it => {
        const a = document.createElement('a');
        a.className = 'search-item';
        a.href = it.href;
        a.target = cardTargetForHref(it.href);
        a.rel = 'noopener';
        a.innerHTML = `<i class="fas fa-arrow-up-right-from-square"></i><span><strong>${escapeHtml(it.title)}</strong> — ${escapeHtml(it.desc)}</span>`;
        // If this is the E-Rapor (no href), trigger modal
        if (it.href === '#'){
            a.addEventListener('click', function(e){
                e.preventDefault();
                document.querySelector('[id="erapor-btn"]').click();
            });
        }
        resultsEl.appendChild(a);
    });
}

function cardTargetForHref(href){
    // External links already open in new tab; keep consistent
    if (href && href.startsWith('http')) return '_blank';
    return '_self';
}

function escapeHtml(str){
    return (str||'').replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

// ===========================
// Console Welcome Message
// ===========================
console.log('Ruang Sinergi SMKN 1 Telagasari');
