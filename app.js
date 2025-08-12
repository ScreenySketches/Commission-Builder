/* app.js
   Commission Builder with configurable data and theming
   - Loads commission data from config/commission-config.json
   - Loads theme settings from config/theme-config.json
   - Features visual step tracker
   - Exports PDF via html2canvas + jsPDF (local vendor files).
*/

/* ---------- Config Loading ---------- */
let CONFIG = null;
let THEME = null;

async function loadConfigs() {
  try {
    const [commissionResponse, themeResponse] = await Promise.all([
      fetch('config/commission-config.json'),
      fetch('config/theme-config.json')
    ]);
    
    CONFIG = await commissionResponse.json();
    THEME = await themeResponse.json();
    
    // Apply theme to CSS
    applyTheme();
    
    // Update labels
    updateLabels();
    
    return true;
  } catch (error) {
    console.error('Failed to load config files:', error);
    alert('Failed to load configuration. Please check config files.');
    return false;
  }
}

function applyTheme() {
  if (!THEME) return;
  
  const root = document.documentElement;
  const colors = THEME.colors;
  const spacing = THEME.spacing;
  
  // Primary colors
  root.style.setProperty('--bg', colors.primary.background);
  root.style.setProperty('--card', colors.primary.card);
  root.style.setProperty('--panel', colors.primary.panel);
  root.style.setProperty('--text', colors.primary.text);
  root.style.setProperty('--muted', colors.primary.muted);
  root.style.setProperty('--accent', colors.primary.accent);
  root.style.setProperty('--accent-2', colors.primary.accentSecondary);
  
  // Interactive elements
  root.style.setProperty('--btn-primary-bg', colors.interactive.buttonPrimary);
  root.style.setProperty('--btn-primary-text', colors.interactive.buttonPrimaryText);
  root.style.setProperty('--btn-primary-disabled', colors.interactive.buttonPrimaryDisabled);
  root.style.setProperty('--btn-primary-disabled-text', colors.interactive.buttonPrimaryDisabledText);
  root.style.setProperty('--btn-ghost-bg', colors.interactive.buttonGhost);
  root.style.setProperty('--btn-ghost-border', colors.interactive.buttonGhostBorder);
  root.style.setProperty('--btn-ghost-text', colors.interactive.buttonGhostText);
  root.style.setProperty('--btn-back-bg', colors.interactive.buttonBack);
  root.style.setProperty('--btn-back-border', colors.interactive.buttonBackBorder);
  root.style.setProperty('--btn-back-text', colors.interactive.buttonBackText);
  
  // Form elements
  root.style.setProperty('--input-bg', colors.forms.inputBackground);
  root.style.setProperty('--input-border', colors.forms.inputBorder);
  root.style.setProperty('--input-text', colors.forms.inputText);
  root.style.setProperty('--select-bg', colors.forms.selectBackground);
  root.style.setProperty('--select-border', colors.forms.selectBorder);
  root.style.setProperty('--select-text', colors.forms.selectText);
  
  // Borders
  root.style.setProperty('--border-card', colors.borders.card);
  root.style.setProperty('--border-panel', colors.borders.panel);
  root.style.setProperty('--border-radio', colors.borders.radioCard);
  root.style.setProperty('--border-addon', colors.borders.addon);
  root.style.setProperty('--border-uploader', colors.borders.uploader);
  root.style.setProperty('--border-thumb', colors.borders.fileThumb);
  root.style.setProperty('--border-total', colors.borders.totalLine);
  
  // Step tracker
  root.style.setProperty('--step-completed', colors.stepTracker.completed);
  root.style.setProperty('--step-current', colors.stepTracker.current);
  root.style.setProperty('--step-upcoming', colors.stepTracker.upcoming);
  root.style.setProperty('--step-completed-text', colors.stepTracker.completedText);
  root.style.setProperty('--step-current-text', colors.stepTracker.currentText);
  root.style.setProperty('--step-upcoming-text', colors.stepTracker.upcomingText);
  root.style.setProperty('--step-connector', colors.stepTracker.connector);
  root.style.setProperty('--step-connector-active', colors.stepTracker.connectorActive);
  
  // Effects
  root.style.setProperty('--glass', colors.effects.glass);
  root.style.setProperty('--overlay', colors.effects.overlay);
  root.style.setProperty('--file-remove', colors.effects.fileRemove);
  
  // Spacing
  root.style.setProperty('--radius', spacing.radius);
  root.style.setProperty('--gap', spacing.gap);
}

function updateLabels() {
  if (!CONFIG) return;
  
  const labels = CONFIG.labels;
  document.getElementById('siteTitle').textContent = labels.siteTitle;
  document.getElementById('footerText').textContent = labels.footerText;
  document.getElementById('currencyLabel').textContent = labels.currencyLabel;
  
  // Form field labels
  document.getElementById('nameFieldLabel').textContent = labels.nameFieldLabel;
  document.getElementById('descriptionFieldLabel').textContent = labels.descriptionFieldLabel;
  
  // Form field placeholders
  document.getElementById('usernameInput').placeholder = labels.nameFieldPlaceholder;
  document.getElementById('descriptionInput').placeholder = labels.descriptionFieldPlaceholder;
  
  // Update reference discount text
  updateReferenceDiscountText();
  
  // Populate currency selector
  const currencySelect = document.getElementById('currencySelect');
  const currencies = getCurrencies();
  currencySelect.innerHTML = '';
  
  Object.entries(currencies).forEach(([code, currency]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${currency.symbol} ${code}`;
    currencySelect.appendChild(option);
  });
}

function updateReferenceDiscountText() {
  if (!CONFIG) return;
  
  const discountSettings = getDiscountSettings();
  const currencies = getCurrencies();
  const currentCurrency = currencies[state.currency] || currencies['USD'];
  const template = CONFIG.labels.referenceDiscountText;
  
  const discountText = template
    .replace(/{currency}/g, currentCurrency.symbol)
    .replace(/{amount}/g, discountSettings.referenceDiscountPerFile)
    .replace(/{max}/g, discountSettings.maxReferenceDiscount);
    
  document.getElementById('referenceDiscountText').textContent = discountText;
}

/* ---------- Data from Config ---------- */
function getCommissionTypes() {
  return CONFIG ? CONFIG.commissionTypes : [];
}

function getCurrencies() {
  return CONFIG ? CONFIG.currencies : {};
}

function getArtStyles() {
  return CONFIG ? CONFIG.artStyles : {};
}

function getDiscountSettings() {
  return CONFIG ? CONFIG.discountSettings : { referenceDiscountPerFile: 2, maxReferenceDiscount: 4 };
}

function getThumbnails() {
  return CONFIG ? CONFIG.thumbnails : {};
}

function getThumbnailUrl(type, id) {
  const thumbnails = getThumbnails();
  if (!thumbnails) return '';
  
  // Get thumbnail path from config
  let imagePath = '';
  if (type === 'commissionType') {
    imagePath = thumbnails.commissionTypes?.[id];
  } else if (type === 'subType') {
    imagePath = thumbnails.subTypes?.[id];
  }
  
  // Use fallback if no specific thumbnail found
  if (!imagePath) {
    imagePath = thumbnails.fallback || 'images/celestialbody.png';
  }
  
  return imagePath;
}

function createThumbnailElement(type, id, altText = '') {
  const thumbnails = getThumbnails();
  const settings = thumbnails?.settings || {};
  const imagePath = getThumbnailUrl(type, id);
  
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.style.height = `${settings.height || 120}px`;
  thumb.style.borderRadius = settings.borderRadius || '10px';
  thumb.style.overflow = 'hidden';
  thumb.style.position = 'relative';
  
  const img = document.createElement('img');
  img.src = imagePath;
  img.alt = altText;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = settings.objectFit || 'cover';
  img.style.objectPosition = 'center';
  
  // Error handling for missing images
  img.onerror = () => {
    const fallbackPath = thumbnails?.fallback || 'images/celestialbody.png';
    if (img.src !== fallbackPath) {
      img.src = fallbackPath;
    } else {
      // If even fallback fails, show a placeholder
      thumb.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:14px;">No Image</div>';
    }
  };
  
  thumb.appendChild(img);
  return thumb;
}

/* ---------- Step Tracker ---------- */
function updateStepTracker() {
  const steps = ['type', 'subtype', 'details', 'upload', 'summary', 'tos'];
  const currentStepIndex = steps.indexOf(state.step);
  
  document.querySelectorAll('.step-item').forEach((item, index) => {
    const step = item.getAttribute('data-step');
    const stepIndex = steps.indexOf(step);
    
    // Remove all classes
    item.classList.remove('completed', 'current', 'upcoming');
    
    // Add appropriate class
    if (stepIndex < currentStepIndex) {
      item.classList.add('completed');
    } else if (stepIndex === currentStepIndex) {
      item.classList.add('current');
    } else {
      item.classList.add('upcoming');
    }
  });
  
  // Update connectors
  document.querySelectorAll('.step-connector').forEach((connector, index) => {
    connector.classList.toggle('active', index < currentStepIndex);
  });
}

/* ---------- Hover Thumbnail System ---------- */
let hoverThumbnail = null;

function createHoverThumbnail() {
  if (!hoverThumbnail) {
    hoverThumbnail = document.createElement('div');
    hoverThumbnail.className = 'hover-thumbnail';
    hoverThumbnail.innerHTML = '<img><div class="placeholder">No Preview</div>';
    document.body.appendChild(hoverThumbnail);
  }
  return hoverThumbnail;
}

function showHoverThumbnail(element, type, id, event) {
  const thumbnails = getThumbnails();
  if (!thumbnails) return;
  
  let imagePath = '';
  
  // Get thumbnail path based on type
  if (type === 'tier') {
    imagePath = thumbnails.tiers?.[id];
  } else if (type === 'style') {
    imagePath = thumbnails.artStyles?.[id];
  } else if (type === 'addon') {
    imagePath = thumbnails.addons?.[id];
  }
  
  // Use fallback if no specific thumbnail
  if (!imagePath) {
    imagePath = thumbnails.fallback;
  }
  
  if (!imagePath) return;
  
  const thumb = createHoverThumbnail();
  const img = thumb.querySelector('img');
  const placeholder = thumb.querySelector('.placeholder');
  
  // Update position based on mouse
  const updatePosition = (e) => {
    thumb.style.left = e.clientX + 'px';
    thumb.style.top = e.clientY + 'px';
  };
  
  // Set initial position
  updatePosition(event);
  
  // Load image
  img.src = imagePath;
  img.style.display = 'block';
  placeholder.style.display = 'none';
  
  img.onerror = () => {
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  };
  
  // Show thumbnail
  thumb.classList.add('show');
  
  // Track mouse movement
  const mouseMoveHandler = (e) => updatePosition(e);
  document.addEventListener('mousemove', mouseMoveHandler);
  
  // Store handler for cleanup
  thumb._mouseMoveHandler = mouseMoveHandler;
}

function hideHoverThumbnail() {
  if (!hoverThumbnail) return;
  
  hoverThumbnail.classList.remove('show');
  
  // Remove mouse move listener
  if (hoverThumbnail._mouseMoveHandler) {
    document.removeEventListener('mousemove', hoverThumbnail._mouseMoveHandler);
    delete hoverThumbnail._mouseMoveHandler;
  }
}

function addHoverThumbnailEvents(element, type, id) {
  element.addEventListener('mouseenter', (e) => {
    showHoverThumbnail(element, type, id, e);
  });
  
  element.addEventListener('mouseleave', () => {
    hideHoverThumbnail();
  });
}

/* ---------- Markdown Parser ---------- */
function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Convert bold text
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  
  // Convert italic text (single asterisk, but not within bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/gim, '<em>$1</em>');
  
  // Convert bullet points
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>(<br>)?)+/gims, function(match) {
    const listItems = match.replace(/<br>/g, '').trim();
    return '<ul>' + listItems + '</ul>';
  });
  
  // Convert double line breaks to paragraphs
  html = html.replace(/<br><br>/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br>/g, '<p>');
  html = html.replace(/<br><\/p>/g, '</p>');
  
  // Clean up paragraphs around headers and lists
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  
  return html;
}

function getTermsOfService() {
  const tos = CONFIG ? CONFIG.termsOfService : null;
  if (tos && Array.isArray(tos.content)) {
    // Join array content with newlines for easier editing
    return {
      ...tos,
      content: tos.content.join('\n')
    };
  }
  return tos;
}

/* ---------- State ---------- */
const state = {
  step: 'type',
  selectedTypeId: null,
  selectedSubId: null,
  selectedTierIdx: 0,
  selectedStyleId: 'style_basic', // 'style_basic' will mean no fee
  selectedAddons: new Map(), // key => value (for flat count or bool)
  files: [], // {name,size,lastModified,url,file}
  username: '', // user's name for the commission
  tosAccepted: false, // whether user has accepted TOS
  currency: 'USD', // selected currency
  description: '' // commission description
};

const storageKey = 'strongslime_comm_v2';

/* ---------- Persistence ---------- */
function saveState(){
  const save = {
    step: state.step,
    selectedTypeId: state.selectedTypeId,
    selectedSubId: state.selectedSubId,
    selectedTierIdx: state.selectedTierIdx,
    selectedStyleId: state.selectedStyleId,
    selectedAddons: Array.from(state.selectedAddons.entries()),
    files: state.files.map(f=>({name:f.name,size:f.size,lastModified:f.lastModified})),
    username: state.username,
    tosAccepted: state.tosAccepted,
    currency: state.currency,
    description: state.description
  };
  localStorage.setItem(storageKey, JSON.stringify(save));
}
function loadState(){
  try{
    const raw = localStorage.getItem(storageKey);
    if(!raw) return;
    const obj = JSON.parse(raw);
    state.step = obj.step || state.step;
    state.selectedTypeId = obj.selectedTypeId || state.selectedTypeId;
    state.selectedSubId = obj.selectedSubId || state.selectedSubId;
    state.selectedTierIdx = obj.selectedTierIdx || state.selectedTierIdx;
    state.selectedStyleId = obj.selectedStyleId || state.selectedStyleId;
    if(obj.selectedAddons) state.selectedAddons = new Map(obj.selectedAddons);
    if(obj.files) state.files = obj.files.map(f=>Object.assign({},f));
    state.username = obj.username || state.username;
    state.tosAccepted = obj.tosAccepted || state.tosAccepted;
    state.currency = obj.currency || state.currency;
    state.description = obj.description || state.description;
  }catch(e){ console.warn('loadState',e); }
}

/* ---------- Helpers ---------- */
function findType(id){ return getCommissionTypes().find(t=>t.id===id); }
function findSub(type, subId){ return type?.subTypes.find(s=>s.id===subId); }

// Currency helpers
function convertPrice(usdPrice) {
  const currencies = getCurrencies();
  const rate = currencies[state.currency]?.rate || 1;
  return usdPrice * rate;
}

function formatPrice(usdPrice) {
  const converted = convertPrice(usdPrice);
  const currencies = getCurrencies();
  const symbol = currencies[state.currency]?.symbol || '$';
  return `${symbol}${converted.toFixed(2)}`;
}

// Calculate addon price based on base tier price
function calculateAddonPrice(addon, baseTierPrice) {
  if (addon.type === 'percent') {
    return Math.round(baseTierPrice * (addon.value / 100));
  }
  return addon.value; // flat rate
}

/* ---------- DOM refs ---------- */
const typesGrid = document.getElementById('typesGrid');
const subtypesGrid = document.getElementById('subtypesGrid');
const crumb = document.getElementById('crumb');
const backBtn = document.getElementById('backBtn');
const pdfSpinner = document.getElementById('pdfSpinner');
const currencySelect = document.getElementById('currencySelect');

/* ---------- Renderers ---------- */
function renderTypes(){
  typesGrid.innerHTML = '';
  getCommissionTypes().forEach(type=>{
    const c = document.createElement('div'); 
    c.className='card';
    
    // Create thumbnail element
    const thumbnailEl = createThumbnailElement('commissionType', type.id, type.name);
    
    // Create content
    const title = document.createElement('h3');
    title.textContent = type.name;
    
    const priceRange = document.createElement('div');
    priceRange.className = 'muted';
    priceRange.textContent = type.priceRange;
    
    // Add elements to card
    c.appendChild(thumbnailEl);
    c.appendChild(title);
    c.appendChild(priceRange);
    
    if(type.comingSoon) {
      c.classList.add('coming-soon');
      c.style.opacity = 0.6;
      c.style.pointerEvents = 'none';
    } else {
      c.addEventListener('click', ()=> {
        state.selectedTypeId = type.id;
        state.selectedSubId = null;
        state.selectedTierIdx = 0;
        state.selectedAddons.clear();
        state.files = [];
        state.step = 'subtype';
        saveState(); render();
      });
    }
    typesGrid.appendChild(c);
  });
}

function renderSubtypes(){
  subtypesGrid.innerHTML = '';
  const type = findType(state.selectedTypeId);
  if(!type) return;
  document.getElementById('subtypeTitle').textContent = type.name;
  type.subTypes.forEach(sub=>{
    const c = document.createElement('div'); 
    c.className='card';
    
    // Create thumbnail element for subtype
    const thumbnailEl = createThumbnailElement('subType', sub.id, sub.name);
    
    // Create content
    const title = document.createElement('h3');
    title.textContent = sub.name;
    
    const priceInfo = document.createElement('div');
    priceInfo.className = 'muted';
    const rep = sub.tiers && sub.tiers.length ? (formatPrice(sub.tiers[0].price) + ' starting') : '';
    priceInfo.textContent = rep;
    
    // Add elements to card
    c.appendChild(thumbnailEl);
    c.appendChild(title);
    c.appendChild(priceInfo);
    
    c.addEventListener('click', ()=>{
      state.selectedSubId = sub.id;
      state.selectedTierIdx = 0;
      state.selectedAddons.clear();
      state.step = 'details';
      saveState(); render();
    });
    subtypesGrid.appendChild(c);
  });
}

function renderDetails(){
  const type = findType(state.selectedTypeId);
  if(!type) return;
  const sub = findSub(type, state.selectedSubId);
  if(!sub) return;
  document.getElementById('selectedLabel').textContent = `${type.name} — ${sub.name}`;

  // tiers
  const tiersArea = document.getElementById('tiersArea'); tiersArea.innerHTML='';
  sub.tiers.forEach((tier, idx)=>{
    const r = document.createElement('label'); r.className='radio-card';
    r.innerHTML = `<input name="tier" type="radio" ${state.selectedTierIdx===idx?'checked':''} data-idx="${idx}"> <div style="font-weight:700">${tier.name}</div><div class="muted">${formatPrice(tier.price)}</div>`;
    r.querySelector('input').addEventListener('change', ()=>{ 
      state.selectedTierIdx = idx; 
      saveState(); 
      // Re-render the entire details section to update all prices
      renderDetails(); 
    });
    
    // Add hover thumbnail
    addHoverThumbnailEvents(r, 'tier', tier.name);
    
    tiersArea.appendChild(r);
  });

  // art styles (basic = no fee)
  const styleArea = document.getElementById('styleArea'); styleArea.innerHTML='';
  const baseTierPrice = sub.tiers[state.selectedTierIdx]?.price || 0;
  const artStyles = getArtStyles();
  
  Object.entries(artStyles).forEach(([styleId, styleData])=>{
    const r = document.createElement('label'); r.className='radio-card';
    let priceDisplay = '';
    if (styleData.type === 'none') {
      priceDisplay = ' (no fee)';
    } else {
      const calculatedPrice = calculateAddonPrice(styleData, baseTierPrice);
      priceDisplay = ` (+${formatPrice(calculatedPrice)})`;
    }
    r.innerHTML = `<input type="radio" name="style" ${state.selectedStyleId===styleId?'checked':''} data-id="${styleId}"> <div style="font-weight:700">${styleData.label}${priceDisplay}</div>`;
    r.querySelector('input').addEventListener('change', ()=>{ 
      state.selectedStyleId = styleId; 
      saveState(); 
      calculateAndShow(); 
    });
    
    // Add hover thumbnail
    addHoverThumbnailEvents(r, 'style', styleId);
    
    styleArea.appendChild(r);
  });

  // addons
  const addonsArea = document.getElementById('addonsArea'); addonsArea.innerHTML='';
  (type.addons||[]).forEach(addon=>{
    const aid = addon.id;
    const a = document.createElement('div'); a.className='addon';
    
    // for item/prop allow count input
    if(addon.id === 'itemProp'){
      const itemPrice = formatPrice(addon.value);
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">${itemPrice} each</div> <input type="number" min="1" value="${state.selectedAddons.get(aid)||1}" data-count="${aid}" style="width:68px;margin-left:10px">`;
      
      const checkbox = a.querySelector('input[type="checkbox"]');
      const numberInput = a.querySelector('input[data-count]');
      
      // Checkbox change handler
      checkbox.addEventListener('change', (e)=>{
        if(e.target.checked) state.selectedAddons.set(aid, Number(numberInput.value || 1));
        else state.selectedAddons.delete(aid);
        saveState(); calculateAndShow();
      });
      
      // Number input change handler
      numberInput.addEventListener('change', (e)=>{
        const val = Math.max(1, Math.floor(Number(e.target.value) || 1));
        e.target.value = val;
        if(state.selectedAddons.has(aid)) state.selectedAddons.set(aid, val);
        saveState(); calculateAndShow();
      });
      
      // Make entire card clickable (except number input)
      a.addEventListener('click', (e) => {
        // Don't trigger if clicking on number input
        if (e.target === numberInput) return;
        
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
      
    } else {
      // checkbox only
      let priceDisplay;
      if (addon.type === 'percent') {
        const calculatedPrice = calculateAddonPrice(addon, baseTierPrice);
        priceDisplay = `+${formatPrice(calculatedPrice)}`;
      } else {
        priceDisplay = `+${formatPrice(addon.value)}`;
      }
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">${priceDisplay}</div>`;
      
      const checkbox = a.querySelector('input');
      
      // Checkbox change handler
      checkbox.addEventListener('change', (e)=>{
        if(e.target.checked) state.selectedAddons.set(aid, true);
        else state.selectedAddons.delete(aid);
        saveState(); calculateAndShow();
      });
      
      // Make entire card clickable
      a.addEventListener('click', (e) => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    }
    
    // Add hover thumbnail for all addons
    addHoverThumbnailEvents(a, 'addon', aid);
    
    addonsArea.appendChild(a);
  });

  // next/reset handlers
  document.getElementById('nextToUpload').onclick = ()=>{ state.step='upload'; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); };
  document.getElementById('resetSelection').onclick = ()=>{ if(confirm('Reset selections for this subtype?')){ state.selectedTierIdx=0; state.selectedAddons.clear(); state.selectedStyleId='style_basic'; saveState(); renderDetails(); calculateAndShow(); }};

  calculateAndShow();
}

/* ---------- File upload ---------- */
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const usernameInput = document.getElementById('usernameInput');
const descriptionInput = document.getElementById('descriptionInput');

document.getElementById('addFilesBtn').addEventListener('click', ()=> fileInput.click());

// Username input handler
usernameInput.addEventListener('input', (e) => {
  state.username = e.target.value;
  saveState();
});

// Description input handler
descriptionInput.addEventListener('input', (e) => {
  state.description = e.target.value;
  saveState();
});

// Currency selector handler
currencySelect.addEventListener('change', (e) => {
  state.currency = e.target.value;
  saveState();
  // Update reference discount text with new currency
  updateReferenceDiscountText();
  // Re-render details to update all price displays
  if (state.step === 'details') {
    renderDetails();
  }
  // Update live calculations
  calculateAndShow();
});

fileInput.addEventListener('change', (e)=>{
  const files = Array.from(e.target.files || []);
  addFiles(files);
  fileInput.value = '';
});

function addFiles(files){
  files.forEach(f=>{
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    const exists = state.files.some(existing=> `${existing.name}:${existing.size}:${existing.lastModified}` === key);
    if(exists) return;
    
    let url = null;
    let fileType = 'other';
    
    if(f.type.startsWith('image/')) {
      url = URL.createObjectURL(f);
      fileType = 'image';
    } else if(f.type.startsWith('text/') || f.name.toLowerCase().endsWith('.txt')) {
      fileType = 'text';
    }
    
    state.files.push({name:f.name,size:f.size,lastModified:f.lastModified,url,file:f,fileType});
  });
  saveState();
  renderFileList();
  calculateAndShow();
}

function renderFileList(){
  fileList.innerHTML = '';
  state.files.forEach((f, idx)=>{
    const d = document.createElement('div'); d.className='file-thumb';
    
    if (f.url && f.fileType === 'image') {
      // Image thumbnail
      d.innerHTML = `<img src="${f.url}" alt="${f.name}">`;
    } else if (f.fileType === 'text') {
      // Text file icon
      d.innerHTML = `<div class="muted" style="font-size:10px;text-align:center;"><div style="font-size:20px;">📄</div><div>${f.name.split('.')[0]}</div></div>`;
    } else {
      // Other file types
      d.innerHTML = `<div class="muted">${(f.name.split('.').pop()||'FILE').toUpperCase()}</div>`;
    }
    
    const rem = document.createElement('div'); rem.className='file-remove'; rem.textContent='×';
    rem.title='Remove';
    rem.addEventListener('click', ()=>{
      if(f.url) URL.revokeObjectURL(f.url);
      state.files.splice(idx,1);
      saveState(); renderFileList(); calculateAndShow();
    });
    d.appendChild(rem);
    fileList.appendChild(d);
  });
}

/* ---------- Calculations ---------- */
function calculateTotalNumbers(){
  const type = findType(state.selectedTypeId);
  if(!type) return { total:0, breakdown:{ base:0, addons:0, refDiscount:0 } };
  const sub = findSub(type, state.selectedSubId);
  if(!sub) return { total:0, breakdown:{ base:0, addons:0, refDiscount:0 } };
  const tier = sub.tiers[state.selectedTierIdx] || sub.tiers[0];
  const base = tier.price || 0;

  // style
  let styleAdd = 0;
  const artStyles = getArtStyles();
  if(state.selectedStyleId && artStyles[state.selectedStyleId]) {
    const styleData = artStyles[state.selectedStyleId];
    if(styleData.type === 'percent') {
      styleAdd = base * (styleData.value / 100);
    }
  }

  // addons
  let addonsSum = 0;
  (type.addons || []).forEach(a=>{
    if(!state.selectedAddons.has(a.id)) return;
    if(a.type === 'percent'){
      // percent of base
      addonsSum += base * (a.value / 100);
    } else {
      // flat: itemProp may have count
      if(a.id === 'itemProp'){
        const count = Number(state.selectedAddons.get(a.id) || 1);
        addonsSum += a.value * count;
      } else {
        addonsSum += a.value || 0;
      }
    }
  });

  const discountSettings = getDiscountSettings();
  const uniqueCount = state.files.length;
  const extra = Math.max(0, uniqueCount - 1);
  const refDiscount = Math.min(discountSettings.referenceDiscountPerFile * extra, discountSettings.maxReferenceDiscount);

  const total = Math.max(0, base + styleAdd + addonsSum - refDiscount);
  return { total, breakdown:{ base, styleAdd, addons:addonsSum, refDiscount } };
}

function calculateAndShow(){
  const calc = calculateTotalNumbers();
  document.getElementById('liveSubtotal').textContent = formatPrice(calc.total);
  document.getElementById('refDiscount').textContent = `-${formatPrice(calc.breakdown.refDiscount)}`;
}

/* ---------- PDF Export (html2canvas + jsPDF) ---------- */
function showSpinner(){ pdfSpinner.classList.add('show'); }
function hideSpinner(){ pdfSpinner.classList.remove('show'); }

function fileToDataURL(file){
  return new Promise((resolve)=>{
    if(!file) return resolve(null);
    const fr = new FileReader();
    fr.onload = ()=> resolve(fr.result);
    fr.onerror = ()=> resolve(null);
    fr.readAsDataURL(file);
  });
}

async function exportPDF(){
  const type = findType(state.selectedTypeId);
  const sub = findSub(type, state.selectedSubId);
  const tier = sub?.tiers[state.selectedTierIdx];
  const calc = calculateTotalNumbers();

  showSpinner();

  try{
    // ensure jsPDF present
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF){
      alert('jsPDF not loaded (window.jspdf). Check vendor/jspdf.umd.min.js');
      hideSpinner();
      return;
    }

    // Create PDF document
    const pdf = new jsPDF({ 
      unit: 'pt', 
      format: 'letter', 
      orientation: 'portrait' 
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin + 20;

    // Helper function to add text with word wrapping
    function addText(text, x, y, options = {}) {
      const fontSize = options.fontSize || 12;
      const fontStyle = options.fontStyle || 'normal';
      const maxWidth = options.maxWidth || contentWidth;
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      
      return y + (lines.length * fontSize * 1.2);
    }

    // Helper function to add a line
    function addLine(y) {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageWidth - margin, y);
      return y + 15;
    }

    // Title
    yPosition = addText('Commission Summary', margin, yPosition, {
      fontSize: 20,
      fontStyle: 'bold'
    });
    yPosition += 10;

    yPosition = addText('(SEND THIS TO ME WITH YOUR PAYMENT)', margin, yPosition, {
      fontSize: 14,
      fontStyle: 'italic'
    });
    yPosition += 15;

    // Username
    if (state.username.trim()) {
      yPosition = addText(`Client: ${state.username}`, margin, yPosition, {
        fontSize: 14,
        fontStyle: 'bold'
      });
      yPosition += 10;
    }
    
    // Description
    if (state.description.trim()) {
      yPosition = addText('COMMISSION DESCRIPTION', margin, yPosition, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      yPosition += 5;
      yPosition = addText(state.description, margin, yPosition, {
        fontSize: 11
      });
      yPosition += 10;
    }

    yPosition = addLine(yPosition);

    // Commission Details
    yPosition = addText('COMMISSION DETAILS', margin, yPosition, {
      fontSize: 14,
      fontStyle: 'bold'
    });
    yPosition += 10;

    yPosition = addText(`Type: ${type?.name || 'Not selected'}`, margin, yPosition);
    yPosition += 5;
    
    yPosition = addText(`Subtype: ${sub?.name || 'Not selected'}`, margin, yPosition);
    yPosition += 5;
    
    yPosition = addText(`Tier: ${tier?.name || 'Not selected'} - ${formatPrice(tier?.price || 0)}`, margin, yPosition);
    yPosition += 5;
    
    const currencies = getCurrencies();
    yPosition = addText(`Currency: ${currencies[state.currency]?.name || state.currency}`, margin, yPosition);
    yPosition += 15;

    // Style
    const artStyles = getArtStyles();
    let styleName = 'Basic (no extra cost)';
    
    if (state.selectedStyleId && artStyles[state.selectedStyleId]) {
      const styleData = artStyles[state.selectedStyleId];
      styleName = styleData.label;
      
      // Add style cost if not basic
      if (styleData.type !== 'none') {
        const baseTierPrice = tier?.price || 0;
        const styleCost = calculateAddonPrice(styleData, baseTierPrice);
        styleName += ` (+${formatPrice(styleCost)})`;
      } else {
        styleName += ' (no extra cost)';
      }
    }
    yPosition = addText(`Art Style: ${styleName}`, margin, yPosition);
    yPosition += 15;

    // Add-ons
    yPosition = addText('ADD-ONS', margin, yPosition, {
      fontSize: 14,
      fontStyle: 'bold'
    });
    yPosition += 10;

    if (state.selectedAddons.size > 0) {
      const addonsText = Array.from(state.selectedAddons.keys()).map(id => {
        const addon = (type.addons||[]).find(x => x.id === id);
        if (!addon) return id;
        
        if (addon.type === 'percent') {
          return `• ${addon.label}`;
        }
        if (addon.id === 'itemProp') {
          const count = state.selectedAddons.get(addon.id) || 1;
          return `• ${addon.label} x${count}`;
        }
        return `• ${addon.label}`;
      });
      
      for (const addonText of addonsText) {
        yPosition = addText(addonText, margin, yPosition);
        yPosition += 5;
      }
    } else {
      yPosition = addText('• None selected', margin, yPosition);
      yPosition += 5;
    }
    yPosition += 10;

    // Reference Files
    yPosition = addText('REFERENCE SHEETS', margin, yPosition, {
      fontSize: 14,
      fontStyle: 'bold'
    });
    yPosition += 10;

    if (state.files.length > 0) {
      yPosition = addText(`${state.files.length} file(s) uploaded:`, margin, yPosition);
      yPosition += 5;
      
      for (const file of state.files) {
        yPosition = addText(`• ${file.name}`, margin, yPosition);
        yPosition += 5;
      }

      // Try to embed images
      for (const file of state.files) {
        if (file.file && file.file.type.startsWith('image/')) {
          try {
            // Check if we need a new page
            if (yPosition > pageHeight - 200) {
              pdf.addPage();
              yPosition = margin + 20;
            }

            const dataUrl = await fileToDataURL(file.file);
            if (dataUrl) {
              // Get image dimensions to calculate proper aspect ratio
              const img = new Image();
              await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                img.src = dataUrl;
              });
              
              // Calculate dimensions maintaining aspect ratio
              const maxWidth = 200;
              const maxHeight = 150;
              let imgWidth = img.naturalWidth || img.width || maxWidth;
              let imgHeight = img.naturalHeight || img.height || maxHeight;
              
              // Scale down if too large
              const widthRatio = maxWidth / imgWidth;
              const heightRatio = maxHeight / imgHeight;
              const scale = Math.min(widthRatio, heightRatio, 1); // Don't scale up
              
              imgWidth *= scale;
              imgHeight *= scale;
              
              pdf.addImage(dataUrl, 'JPEG', margin, yPosition, imgWidth, imgHeight);
              yPosition = addText(file.name, margin + imgWidth + 10, yPosition + 20, {
                fontSize: 10
              });
              yPosition = Math.max(yPosition, yPosition + imgHeight + 10);
            }
          } catch (e) {
            console.warn('Failed to embed image:', file.name, e);
          }
        }
      }
    } else {
      yPosition = addText('No reference sheets uploaded', margin, yPosition);
    }
    yPosition += 20;

    // Pricing Breakdown
    yPosition = addLine(yPosition);
    
    yPosition = addText('PRICING BREAKDOWN', margin, yPosition, {
      fontSize: 14,
      fontStyle: 'bold'
    });
    yPosition += 10;

    yPosition = addText(`Base Price: ${formatPrice(calc.breakdown.base)}`, margin, yPosition);
    yPosition += 5;
    
    if (calc.breakdown.styleAdd > 0) {
      yPosition = addText(`Style Add-on: +${formatPrice(calc.breakdown.styleAdd)}`, margin, yPosition);
      yPosition += 5;
    }
    
    if (calc.breakdown.addons > 0) {
      yPosition = addText(`Add-ons: +${formatPrice(calc.breakdown.addons)}`, margin, yPosition);
      yPosition += 5;
    }
    
    if (calc.breakdown.refDiscount > 0) {
      yPosition = addText(`Reference Discount: -${formatPrice(calc.breakdown.refDiscount)}`, margin, yPosition);
      yPosition += 5;
    }
    
    yPosition += 10;
    yPosition = addText(`TOTAL ESTIMATED PRICE: ${formatPrice(calc.total)}`, margin, yPosition, {
      fontSize: 16,
      fontStyle: 'bold'
    });

    // Footer
    yPosition = pageHeight - 10;
    yPosition = addText(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition, {
      fontSize: 10,
      fontStyle: 'italic'
    });

    // Save the PDF
    pdf.save('commission-summary.pdf');
    console.log('PDF generated successfully');

  } catch(err) {
    console.error('PDF export error:', err);
    alert('PDF export failed. Check console for details.');
  } finally {
    hideSpinner();
  }
}

/* ---------- Summary ---------- */
function renderSummary(){
  const type = findType(state.selectedTypeId);
  const sub = findSub(type, state.selectedSubId);
  const tier = sub?.tiers[state.selectedTierIdx];
  const calc = calculateTotalNumbers();

  const pieces = [
    ...(state.username.trim() ? [`Client: ${state.username}`] : []),
    ...(state.description.trim() ? [`Description: ${state.description}`] : []),
    `Type: ${type?.name || ''}`,
    `Subtype: ${sub?.name || ''}`,
    `Tier: ${tier?.name || '—'} (${formatPrice(tier?.price ?? 0)})`,
    `Style: ${state.selectedStyleId}`,
    `Currency: ${getCurrencies()[state.currency]?.name || state.currency}`,
    `Add-ons: ${Array.from(state.selectedAddons.keys()).map(id=>{
      const a = (type.addons||[]).find(x=>x.id===id);
      return a ? a.label : id;
    }).join('; ') || 'None'}`,
    `Reference sheets uploaded: ${state.files.length} (${state.files.map(f=>f.name).join(', ') || '—'})`,
    `Reference discount applied: -${formatPrice(calc.breakdown.refDiscount)}`,
    `Estimated total: ${formatPrice(calc.total)}`
  ];

  document.getElementById('summaryText').innerHTML = '<div class="strong">Quick Summary</div><div class="muted" style="margin-top:8px">' + pieces.join('<br>') + '</div>';
  document.getElementById('finalTotal').textContent = formatPrice(calc.total);
  document.getElementById('summaryCopy').value = pieces.join('\n');

  document.getElementById('copySummary').onclick = ()=>{ document.getElementById('summaryCopy').select(); document.execCommand('copy'); alert('Summary copied to clipboard.'); };
}

/* ---------- Terms of Service ---------- */
function renderTos(){
  const tosCheckbox = document.getElementById('tosCheckbox');
  const exportBtn = document.getElementById('exportPdfBtn');
  const tosContent = document.getElementById('tosContent');
  
  // Load and render TOS content from config
  const tosData = getTermsOfService();
  if (tosData && tosData.content) {
    // Convert markdown to HTML
    const htmlContent = parseMarkdown(tosData.content);
    tosContent.innerHTML = htmlContent;
    tosContent.style.whiteSpace = 'normal';
    tosContent.style.fontFamily = 'inherit';
  }
  
  // Update agreement text
  const agreementLabel = document.getElementById('tosAgreementText');
  if (agreementLabel && tosData && tosData.agreementText) {
    agreementLabel.textContent = tosData.agreementText;
  }
  
  // Set checkbox state
  tosCheckbox.checked = state.tosAccepted;
  
  // Enable/disable export button based on checkbox
  function updateExportButton() {
    if (tosCheckbox.checked) {
      exportBtn.disabled = false;
      exportBtn.style.opacity = '1';
      exportBtn.style.cursor = 'pointer';
    } else {
      exportBtn.disabled = true;
      exportBtn.style.opacity = '0.5';
      exportBtn.style.cursor = 'not-allowed';
    }
  }
  
  // Initial button state
  updateExportButton();
  
  // Handle checkbox change
  tosCheckbox.addEventListener('change', () => {
    state.tosAccepted = tosCheckbox.checked;
    saveState();
    updateExportButton();
  });
  
  // Handle export button click
  exportBtn.onclick = async () => {
    if (tosCheckbox.checked) {
      await exportPDF();
    }
  };
}

/* ---------- Navigation & Render ---------- */
function showStep(step){
  document.querySelectorAll('#app .step').forEach(s=>s.style.display='none');
  document.getElementById('step-' + step).style.display='block';
  crumb.textContent = { type:'Pick a commission type', subtype:'Pick a subtype', details:'Details & add-ons', upload:'Reference upload', summary:'Summary', tos:'Terms of Service' }[step];
  state.step = step;
}

function removePdfOverlay(){
  const primary = document.getElementById('pdfExportWrapper');
  if(primary) primary.remove();
  const nodes = document.querySelectorAll('[data-ss-pdf-export]');
  nodes.forEach(n=>n.remove());
}

function render(){
  removePdfOverlay();
  backBtn.style.display = state.step === 'type' ? 'none' : 'inline-block';
  showStep(state.step);
  updateStepTracker(); // Update step tracker
  
  // Hide hover thumbnail when changing steps
  if (state.step !== 'details') {
    hideHoverThumbnail();
  }
  
  if(state.step === 'type') renderTypes();
  if(state.step === 'subtype') renderSubtypes();
  if(state.step === 'details') {
    renderDetails();
    // Set currency selector value
    currencySelect.value = state.currency;
  }
  if(state.step === 'upload'){ 
    // Update file input accept attribute based on commission type
    const type = findType(state.selectedTypeId);
    if(type && type.id === 'other') {
      // For "Other" category, allow both images and text files
      fileInput.setAttribute('accept', 'image/*,application/pdf,.txt,text/plain');
    } else {
      // For other categories, only images and PDFs
      fileInput.setAttribute('accept', 'image/*,application/pdf');
    }
    
    // Populate username input
    usernameInput.value = state.username;
    
    // Populate description input
    descriptionInput.value = state.description;
    
    // Update reference discount text for current currency
    updateReferenceDiscountText();
    
    renderFileList(); 
    calculateAndShow(); 
  }
  if(state.step === 'summary'){ renderSummary(); }
  if(state.step === 'tos'){ renderTos(); }
}

/* back button */
backBtn.addEventListener('click', ()=>{
  if(state.step === 'type') return;
  if(state.step === 'subtype') state.step='type';
  else if(state.step === 'details') state.step='subtype';
  else if(state.step === 'upload') state.step='details';
  else if(state.step === 'summary') state.step='upload';
  else if(state.step === 'tos') state.step='summary';
  saveState(); render();
});

/* skip/finish handlers */
document.getElementById('skipUpload').addEventListener('click', ()=>{ state.step='summary'; saveState(); render(); });
document.getElementById('finishBtn').addEventListener('click', ()=>{ state.step='summary'; saveState(); render(); });
document.getElementById('nextToUpload').addEventListener('click', ()=>{ state.step='upload'; saveState(); render(); });

/* TOS navigation handlers */
document.getElementById('proceedToTos').addEventListener('click', ()=>{ state.step='tos'; saveState(); render(); });
document.getElementById('backToSummary').addEventListener('click', ()=>{ state.step='summary'; saveState(); render(); });

/* safety cleanup */
window.addEventListener('error', ()=> setTimeout(removePdfOverlay, 50));

/* ---------- Initialization ---------- */
async function init() {
  // Load configuration files
  const configsLoaded = await loadConfigs();
  if (!configsLoaded) {
    return; // Exit if configs failed to load
  }
  
  // Load saved state
  loadState();
  
  // Initialize step tracker
  updateStepTracker();
  
  // Render initial view
  render();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('unhandledrejection', ()=> setTimeout(removePdfOverlay, 50));
window.addEventListener('beforeunload', ()=> { state.files.forEach(f=>{ if(f.url) try{ URL.revokeObjectURL(f.url); }catch(e){} }); });


