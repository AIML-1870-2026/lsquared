// ===== State =====
const state = {
  bg: { r: 15, g: 17, b: 23 },
  txt: { r: 241, g: 245, b: 249 },
  fontSize: 32,
  vision: 'normal'
};

const presets = [
  { name: 'High Contrast (Black on White)', bg: {r:255,g:255,b:255}, txt: {r:0,g:0,b:0} },
  { name: 'White on Black', bg: {r:0,g:0,b:0}, txt: {r:255,g:255,b:255} },
  { name: 'Low Contrast — Gray on Gray', bg: {r:180,g:180,b:180}, txt: {r:140,g:140,b:140} },
  { name: 'Web Classic (Navy on White)', bg: {r:255,g:255,b:255}, txt: {r:0,g:0,b:128} },
  { name: 'Amber on Dark (terminal)', bg: {r:20,g:20,b:20}, txt: {r:255,g:176,b:0} },
  { name: 'Ocean Blue', bg: {r:13,g:71,b:161}, txt: {r:255,g:255,b:255} },
  { name: 'Soft Pink on White', bg: {r:255,g:255,b:255}, txt: {r:194,g:24,b:91} },
  { name: 'Problematic: Yellow on White', bg: {r:255,g:255,b:255}, txt: {r:255,g:230,b:0} },
  { name: 'Problematic: Red on Green', bg: {r:0,g:180,b:0}, txt: {r:220,g:0,b:0} },
  { name: 'Solarized (Classic)', bg: {r:253,g:246,b:227}, txt: {r:101,g:123,b:131} }
];

// ===== DOM Elements =====
const els = {
  bgSliders: {
    r: document.getElementById('bg-r-slider'),
    g: document.getElementById('bg-g-slider'),
    b: document.getElementById('bg-b-slider')
  },
  bgNums: {
    r: document.getElementById('bg-r-num'),
    g: document.getElementById('bg-g-num'),
    b: document.getElementById('bg-b-num')
  },
  txtSliders: {
    r: document.getElementById('txt-r-slider'),
    g: document.getElementById('txt-g-slider'),
    b: document.getElementById('txt-b-slider')
  },
  txtNums: {
    r: document.getElementById('txt-r-num'),
    g: document.getElementById('txt-g-num'),
    b: document.getElementById('txt-b-num')
  },
  fontSlider: document.getElementById('fontSize-slider'),
  fontNum: document.getElementById('fontSize-num'),
  textDisplay: document.getElementById('textDisplay'),
  textDisplayWrapper: document.getElementById('textDisplayWrapper'),
  bgSwatch: document.getElementById('bgSwatch'),
  txtSwatch: document.getElementById('txtSwatch'),
  contrastValue: document.getElementById('contrastValue'),
  bgLuminosity: document.getElementById('bgLuminosity'),
  txtLuminosity: document.getElementById('txtLuminosity'),
  badgeNormalAA: document.getElementById('badgeNormalAA'),
  badgeLargeAA: document.getElementById('badgeLargeAA'),
  presetSelect: document.getElementById('presetSelect'),
  presetSwatchBg: document.getElementById('presetSwatchBg'),
  presetSwatchTxt: document.getElementById('presetSwatchTxt'),
  visionRadios: document.querySelectorAll('input[name="vision"]'),
  visionNote: document.getElementById('visionNote'),
  bgControls: document.getElementById('bgControls'),
  textControls: document.getElementById('textControls')
};

// ===== Color Math =====
function sRGBtoLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  return 0.2126 * sRGBtoLinear(rgb.r) + 0.7152 * sRGBtoLinear(rgb.g) + 0.0722 * sRGBtoLinear(rgb.b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex(rgb) {
  return '#' + [rgb.r, rgb.g, rgb.b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function toRGB(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

// ===== UI Update =====
let manualChange = false;

function update() {
  const bgColor = toRGB(state.bg);
  const txtColor = toRGB(state.txt);

  // Text display
  els.textDisplay.style.backgroundColor = bgColor;
  els.textDisplay.style.color = txtColor;
  els.textDisplay.style.fontSize = state.fontSize + 'px';

  // Swatches
  els.bgSwatch.style.backgroundColor = bgColor;
  els.bgSwatch.setAttribute('aria-label', 'Background color: ' + toHex(state.bg));
  els.txtSwatch.style.backgroundColor = txtColor;
  els.txtSwatch.setAttribute('aria-label', 'Text color: ' + toHex(state.txt));

  // Luminosity
  const bgL = relativeLuminance(state.bg);
  const txtL = relativeLuminance(state.txt);
  const ratio = contrastRatio(bgL, txtL);

  els.contrastValue.textContent = ratio.toFixed(2) + ':1';
  els.bgLuminosity.textContent = 'BG Luminosity: ' + bgL.toFixed(3);
  els.txtLuminosity.textContent = 'Text Luminosity: ' + txtL.toFixed(3);

  // Color the ratio based on quality
  if (ratio >= 7) {
    els.contrastValue.style.color = '#22c55e';
  } else if (ratio >= 4.5) {
    els.contrastValue.style.color = '#ffb347';
  } else {
    els.contrastValue.style.color = '#ef4444';
  }

  // WCAG Badges
  updateBadge(els.badgeNormalAA, ratio >= 4.5, 'Normal Text AA');
  updateBadge(els.badgeLargeAA, ratio >= 3.0, 'Large Text AA');

  // Sync slider/input values
  ['r', 'g', 'b'].forEach(ch => {
    els.bgSliders[ch].value = state.bg[ch];
    els.bgNums[ch].value = state.bg[ch];
    els.txtSliders[ch].value = state.txt[ch];
    els.txtNums[ch].value = state.txt[ch];
  });
  els.fontSlider.value = state.fontSize;
  els.fontNum.value = state.fontSize;

  // Preset swatch
  updatePresetSwatch();

  // Vision filter
  if (state.vision === 'normal') {
    els.textDisplayWrapper.style.filter = 'none';
    els.visionNote.hidden = true;
    els.bgControls.classList.remove('controls-disabled');
    els.textControls.classList.remove('controls-disabled');
  } else {
    els.textDisplayWrapper.style.filter = `url(#filter-${state.vision})`;
    els.visionNote.hidden = false;
    els.bgControls.classList.add('controls-disabled');
    els.textControls.classList.add('controls-disabled');
  }
}

function updateBadge(badge, pass, label) {
  const wasPass = badge.classList.contains('pass');
  const changed = (pass !== wasPass) && badge.dataset.init === 'true';

  badge.classList.toggle('pass', pass);
  badge.classList.toggle('fail', !pass);
  badge.innerHTML = `<span class="badge-icon">${pass ? '&#10003;' : '&#10007;'}</span> ${label}`;
  badge.setAttribute('aria-label', `${label}: ${pass ? 'Pass' : 'Fail'}`);

  if (changed) {
    badge.classList.add('animate');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => badge.classList.remove('animate'));
    });
  }
  badge.dataset.init = 'true';
}

function updatePresetSwatch() {
  const sel = els.presetSelect.value;
  if (sel === 'custom') {
    els.presetSwatchBg.style.backgroundColor = toRGB(state.bg);
    els.presetSwatchTxt.style.backgroundColor = toRGB(state.bg);
    els.presetSwatchTxt.style.color = toRGB(state.txt);
  } else {
    const p = presets[parseInt(sel)];
    els.presetSwatchBg.style.backgroundColor = toRGB(p.bg);
    els.presetSwatchTxt.style.backgroundColor = toRGB(p.bg);
    els.presetSwatchTxt.style.color = toRGB(p.txt);
  }
}

// ===== Event Wiring =====
function clamp(val, min, max) {
  const n = parseInt(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function wireSliderPair(slider, numInput, target, channel, min, max) {
  slider.addEventListener('input', () => {
    const v = clamp(slider.value, min, max);
    state[target][channel] = v;
    manualChange = true;
    els.presetSelect.value = 'custom';
    update();
  });
  numInput.addEventListener('input', () => {
    const v = clamp(numInput.value, min, max);
    state[target][channel] = v;
    numInput.value = v;
    manualChange = true;
    els.presetSelect.value = 'custom';
    update();
  });
}

// Background RGB
['r', 'g', 'b'].forEach(ch => {
  wireSliderPair(els.bgSliders[ch], els.bgNums[ch], 'bg', ch, 0, 255);
});

// Text RGB
['r', 'g', 'b'].forEach(ch => {
  wireSliderPair(els.txtSliders[ch], els.txtNums[ch], 'txt', ch, 0, 255);
});

// Font size
els.fontSlider.addEventListener('input', () => {
  state.fontSize = clamp(els.fontSlider.value, 10, 72);
  update();
});
els.fontNum.addEventListener('input', () => {
  state.fontSize = clamp(els.fontNum.value, 10, 72);
  els.fontNum.value = state.fontSize;
  update();
});

// Presets
els.presetSelect.addEventListener('change', () => {
  const val = els.presetSelect.value;
  if (val === 'custom') return;
  const p = presets[parseInt(val)];
  state.bg = { ...p.bg };
  state.txt = { ...p.txt };
  update();
});

// Vision simulation
els.visionRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    state.vision = radio.value;
    update();
  });
});

// ===== Init =====
update();
