(function () {
  'use strict';

  /* Storage key */
  const STORAGE_KEY = 'dbc_data';

  /* Field definitions */
  const FIELDS = [
    { key: 'name',        label: 'Name',             prefix: '' },
    { key: 'companyName', label: 'Company Name',     prefix: '' },
    { key: 'email',       label: 'Email',             prefix: 'mailto:' },
    { key: 'phone',       label: 'Phone',             prefix: 'tel:' },
    { key: 'website',     label: 'Personal Website',  prefix: '' },
    { key: 'company',     label: 'Company Website',   prefix: '' },
    { key: 'linkedin',    label: 'LinkedIn',          prefix: 'https://linkedin.com/in/' },
    { key: 'github',      label: 'GitHub',            prefix: 'https://github.com/' },
  ];

  /* State */
  let data = {};
  let qrItems = [];    // [{label, value, qrContent}]
  let qrIndex = 0;

  /* DOM refs */
  const editPanel   = document.getElementById('edit-panel');
  const qrPanel     = document.getElementById('qr-panel');
  const qrCard      = document.getElementById('qr-card');
  const qrEmpty     = document.getElementById('qr-empty');
  const qrCounter   = document.getElementById('qr-counter');
  const qrLabel     = document.getElementById('qr-field-label');
  const qrValue     = document.getElementById('qr-field-value');
  const qrCanvas    = document.getElementById('qr-canvas');
  const btnPrev     = document.getElementById('btn-prev');
  const btnNext     = document.getElementById('btn-next');
  const btnDownload = document.getElementById('btn-download');
  const colorHexInput = document.getElementById('color-hex-input');
  const btnExport   = document.getElementById('btn-export-json');
  const modeBtns    = document.querySelectorAll('.mode-btn');

  /* Load from localStorage */
  function load() {
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      data = {};
    }

    // Backward compat: strip full URL prefix from linkedin/github if previously stored as full URL
    const LI_PREFIX = 'https://linkedin.com/in/';
    const GH_PREFIX = 'https://github.com/';
    if (data.linkedin && data.linkedin.startsWith(LI_PREFIX)) {
      data.linkedin = data.linkedin.slice(LI_PREFIX.length);
    }
    if (data.github && data.github.startsWith(GH_PREFIX)) {
      data.github = data.github.slice(GH_PREFIX.length);
    }

    // Populate fields
    FIELDS.forEach(({ key }) => {
      const el = document.querySelector(`[data-key="${key}"]`);
      if (el && data[key]) el.value = data[key];
    });

    // Theme color
    if (data.themeColor) {
      colorHexInput.value = data.themeColor;
      applyTheme(data.themeColor);
    }
  }

  /* Save to localStorage */
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* Theme */
  function applyTheme(hex) {
    document.documentElement.style.setProperty('--theme', hex);
    // derive a darker shade (~20% darker) for hover
    const dark = darken(hex, 0.2);
    document.documentElement.style.setProperty('--theme-dark', dark);
  }

  function darken(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /* vCard helpers */
  function escapeVCard(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n');
  }

  function buildVCard() {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (data.name)        lines.push(`FN:${escapeVCard(data.name.trim())}`);
    if (data.companyName) lines.push(`ORG:${escapeVCard(data.companyName.trim())}`);
    if (data.email)       lines.push(`EMAIL;TYPE=INTERNET:${data.email.trim()}`);
    if (data.phone)       lines.push(`TEL;TYPE=CELL:${data.phone.trim()}`);

    const urls = [];
    if (data.website)  urls.push({ url: data.website.trim(),                                   label: 'Personal Website' });
    if (data.company)  urls.push({ url: data.company.trim(),                                   label: 'Company Website' });
    if (data.linkedin) urls.push({ url: `https://linkedin.com/in/${data.linkedin.trim()}`,     label: 'LinkedIn' });
    if (data.github)   urls.push({ url: `https://github.com/${data.github.trim()}`,            label: 'GitHub' });

    const urlLines = urls.map(({ url, label }) => `URL;TYPE=${label}:${url}`);
    lines.push(...urlLines);

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /* Build QR items list */
  function buildQrItems() {
    qrItems = FIELDS
      .filter(({ key }) => key !== 'name' && key !== 'companyName' && data[key] && data[key].trim())
      .map(({ key, label, prefix }) => {
        const raw = data[key].trim();
        const qrContent = prefix && !raw.startsWith(prefix) ? prefix + raw : raw;
        return { label, value: raw, qrContent };
      });

    // Prepend a Contact Card (vCard) QR when any field is filled
    if (qrItems.length > 0) {
      qrItems.unshift({
        label: 'Contact Card',
        value: 'Scan to save all contact details',
        qrContent: buildVCard(),
      });
    }
  }

  /* Render QR */
  function renderQr() {
    buildQrItems();

    if (qrItems.length === 0) {
      qrCard.style.display = 'none';
      qrEmpty.style.display = '';
      qrCounter.textContent = '';
      return;
    }

    qrCard.style.display = '';
    qrEmpty.style.display = 'none';

    // Clamp index
    qrIndex = Math.max(0, Math.min(qrIndex, qrItems.length - 1));

    const item = qrItems[qrIndex];
    qrLabel.textContent = item.label;
    qrValue.textContent = item.value;
    qrCounter.textContent = `${qrIndex + 1} of ${qrItems.length}`;

    btnPrev.disabled = qrIndex === 0;
    btnNext.disabled = qrIndex === qrItems.length - 1;

    // QR size: viewport minus ~96px (card padding 24px×2 + nav/counter margins)
    const size = Math.max(120, Math.min(window.innerWidth - 96, 280));

    if (typeof QRCode === 'undefined') {
      qrLabel.textContent = item.label;
      qrValue.textContent = 'QR library failed to load. Please check your internet connection and reload.';
      return;
    }

    QRCode.toCanvas(qrCanvas, item.qrContent, {
      width: size,
      margin: 2,
      color: {
        dark: /^#[0-9a-fA-F]{6}$/.test(data.themeColor) ? data.themeColor : '#4f7d9b',
        light: '#ffffff',
      },
    }, function (err) {
      if (err) console.error('QR error:', err);
    });
  }

  /* Mode switching */
  function switchMode(mode) {
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'edit') {
      editPanel.classList.add('active');
      qrPanel.classList.remove('active');
    } else {
      editPanel.classList.remove('active');
      qrPanel.classList.add('active');
      qrIndex = 0;
      renderQr();
    }
  }

  /* Event listeners */

  // Field inputs → save
  FIELDS.forEach(({ key }) => {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) return;
    el.addEventListener('input', () => {
      data[key] = el.value;
      save();
    });
  });

  // Mode toggle
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // Prev / Next
  btnPrev.addEventListener('click', () => { qrIndex--; renderQr(); });
  btnNext.addEventListener('click', () => { qrIndex++; renderQr(); });

  // Keyboard navigation (when QR panel is active)
  document.addEventListener('keydown', (e) => {
    if (!qrPanel.classList.contains('active')) return;
    if (e.key === 'ArrowLeft' && qrIndex > 0)               { qrIndex--; renderQr(); }
    if (e.key === 'ArrowRight' && qrIndex < qrItems.length - 1) { qrIndex++; renderQr(); }
  });

  // Download QR
  btnDownload.addEventListener('click', () => {
    const item = qrItems[qrIndex];
    if (!item) return;
    const link = document.createElement('a');
    link.download = `qr-${item.label.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
  });

  // Theme color
  colorHexInput.addEventListener('input', () => {
    const raw = colorHexInput.value.trim();
    const hex = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      data.themeColor = hex;
      save();
      applyTheme(hex);
    }
  });

  // Export contact data as JSON
  btnExport.addEventListener('click', () => {
    const exportData = {};
    FIELDS.forEach(({ key }) => {
      if (data[key] && data[key].trim()) exportData[key] = data[key].trim();
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'business-card.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });

  /* Init */
  load();

}());
