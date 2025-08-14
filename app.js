/* app.js
   Dynamically loads commission configuration from config/prices.json
   - Supports multiple currencies with conversion rates
   - Dynamic pricing tiers, addons, and art styles
   - Reference discount system
   - PDF export with html2canvas + jsPDF
*/

/* ---------- Configuration Data ---------- */
let config = null;
let commissionTypes = [];
let currencies = {};
let currentCurrency = 'USD';

// Load configuration from JSON
async function loadConfiguration() {
  try {
    const response = await fetch('config/prices.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }
    config = await response.json();
    
    // Set up currencies
    currencies = config.currencies || {};
    currentCurrency = config.defaultCurrency || 'USD';
    
    // Set up commission types  
    commissionTypes = config.commissionTypes || [];
    
    return config;
  } catch (error) {
    console.warn('Could not load external config, using fallback configuration:', error);
    // Fallback to default configuration if loading fails
    config = getDefaultConfig();
    commissionTypes = config.commissionTypes;
    currencies = config.currencies;
    currentCurrency = config.defaultCurrency;
    console.log('Using fallback config:', config);
    return config;
  }
}

// Fallback configuration
function getDefaultConfig() {
  return {
    currencies: {
      USD: { symbol: "$", name: "US Dollar", rate: 1.0 }
    },
    defaultCurrency: "USD",
    commissionTypes: [
      {
        id: "commission",
        name: "Start Commission", 
        thumbSVG: `<svg width="290" height="120" viewBox="0 0 290 120" xmlns="http://www.w3.org/2000/svg">
          <image href="images/celestialbody.png" x="0" y="0" width="290" height="120" preserveAspectRatio="xMidYMid slice" />
        </svg>`,
        priceRange: "$5 – $30",
        subTypes: [
          {
            id: "headshot",
            name: "Head Shot",
            thumbnail: "images/chucksketch.PNG",
            priceRange: "$5 – $20",
            tiers: [
              { name: "Sketch", price: 5 },
              { name: "Flat Color", price: 10 },
              { name: "Shaded", price: 20 }
            ]
          },
          {
            id: "bust",
            name: "Bust",
            thumbnail: "images/warhammerpfpcomiss.png",
            priceRange: "$10 – $25",
            tiers: [
              { name: "Sketch", price: 10 },
              { name: "Flat Color", price: 15 },
              { name: "Shaded", price: 25 }
            ]
          },
          {
            id: "fullbody",
            name: "Full-Body",
            thumbnail: "images/celestialbody.png",
            priceRange: "$15 – $30",
            tiers: [
              { name: "Sketch", price: 15 },
              { name: "Flat Color", price: 20 },
              { name: "Shaded", price: 30 }
            ]
          }
        ],
        addons: [
          { id: "additionalCharacter", label: "Additional character", type: "percent", value: 75 },
          { id: "itemProp", label: "Item / Prop (each)", type: "flat", value: 7 },
          { id: "detailedChar", label: "Detailed / Complex character", type: "flat", value: 15 },
          { id: "simpleBG", label: "Simple background", type: "flat", value: 10 },
          { id: "complexBG", label: "Complex background", type: "flat", value: 30 }
        ],
        comingSoon: false
      }
    ],
    referenceDiscount: { perFile: 2, maxDiscount: 4 },
    labels: {
      nameField: "Name/Username/Social Handle",
      stepTitles: {
        type: "Pick a commission type",
        subtype: "Step 1 — Pick a subtype", 
        details: "Step 2 — Details & add-ons",
        upload: "Step 3 — Reference upload",
        summary: "Step 4 — Summary",
        tos: "Step 5 — Terms of Service"
      }
    },
    tosUrl: "#" // Default fallback URL
  };
}

/* ---------- State ---------- */
const state = {
  step: 'subtype',
  selectedTypeId: 'commission', // automatically select the single commission type
  selectedSubId: null,
  selectedTierIdx: 0,
  selectedAddons: new Map(), // key => value (for flat count or bool)
  files: [], // {name,size,lastModified,url,file}
  username: '', // user's name for the commission
  tosAccepted: false, // whether user has accepted TOS
  currency: 'USD' // current selected currency
};

// Currency conversion helper
function convertPrice(price, fromCurrency = 'USD', toCurrency = null) {
  if (!toCurrency) toCurrency = state.currency;
  if (fromCurrency === toCurrency) return price;
  
  try {
    const fromRate = currencies[fromCurrency]?.rate || 1;
    const toRate = currencies[toCurrency]?.rate || 1;
    return (price / fromRate) * toRate;
  } catch (error) {
    console.warn('Currency conversion error:', error);
    return price;
  }
}

// Format price with current currency
function formatPrice(price, currencyCode = null) {
  if (!currencyCode) currencyCode = state.currency;
  const currency = currencies[currencyCode];
  if (!currency) return `$${price.toFixed(2)}`;
  return `${currency.symbol}${convertPrice(price, 'USD', currencyCode).toFixed(2)}`;
}

// Format currency for dropdown display
function formatCurrencyDisplay(currencyCode) {
  const currency = currencies[currencyCode];
  if (!currency) return currencyCode;
  return `${currency.symbol} ${currencyCode}`;
}

// Update percentage-based addon displays with actual currency values
function updatePercentageDisplays() {
  const type = findType(state.selectedTypeId);
  if (!type) return;
  const sub = findSub(type, state.selectedSubId);
  if (!sub) return;
  const tier = sub.tiers[state.selectedTierIdx] || sub.tiers[0];
  const basePrice = tier.price || 0;
  
  // Update addon displays
  (type.addons || []).forEach(addon => {
    if (addon.type === 'percent') {
      const addonElement = document.querySelector(`input[data-id="${addon.id}"]`);
      if (addonElement) {
        const priceTag = addonElement.parentElement.querySelector('.price-tag');
        if (priceTag) {
          const percentageValue = basePrice * (addon.value / 100);
          priceTag.textContent = `+${formatPrice(percentageValue)}`;
        }
      }
    }
  });
}

const storageKey = 'strongslime_comm_v2';

/* ---------- Persistence ---------- */
function saveState(){
  const save = {
    step: state.step,
    selectedTypeId: state.selectedTypeId,
    selectedSubId: state.selectedSubId,
    selectedTierIdx: state.selectedTierIdx,

    selectedAddons: Array.from(state.selectedAddons.entries()),
    files: state.files.map(f=>({name:f.name,size:f.size,lastModified:f.lastModified})),
    username: state.username,
    tosAccepted: state.tosAccepted,
    currency: state.currency
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

    if(obj.selectedAddons) state.selectedAddons = new Map(obj.selectedAddons);
    if(obj.files) state.files = obj.files.map(f=>Object.assign({},f));
    state.username = obj.username || state.username;
    state.tosAccepted = obj.tosAccepted || state.tosAccepted;
    state.currency = obj.currency || state.currency;
  }catch(e){ console.warn('loadState',e); }
}

/* ---------- Helpers ---------- */
function findType(id){ return commissionTypes.find(t=>t.id===id); }
function findSub(type, subId){ return type?.subTypes.find(s=>s.id===subId); }

/* ---------- DOM refs ---------- */
const subtypesGrid = document.getElementById('subtypesGrid');
const crumb = document.getElementById('crumb');
const backBtn = document.getElementById('backBtn');
const pdfSpinner = document.getElementById('pdfSpinner');

/* ---------- Renderers ---------- */


function renderSubtypes(){
  subtypesGrid.innerHTML = '';
  const type = findType(state.selectedTypeId);
  
  if(!type) return;
  
  document.getElementById('subtypeTitle').textContent = 'Choose the type of commission you want';
  
  type.subTypes.forEach(sub=>{
    const c = document.createElement('div'); c.className='card';
    const thumbnailHTML = sub.thumbnail 
      ? `<div class="thumb"><img src="${sub.thumbnail}" alt="${sub.name}"></div>`
      : `<div class="thumb">${sub.name}</div>`;
    const priceRange = sub.priceRange || (sub.tiers && sub.tiers.length > 1 ? 
      `${formatPrice(Math.min(...sub.tiers.map(t => t.price)))} – ${formatPrice(Math.max(...sub.tiers.map(t => t.price)))}` :
      sub.tiers && sub.tiers.length ? formatPrice(sub.tiers[0].price) : '');
    c.innerHTML = `${thumbnailHTML}<h3>${sub.name}</h3><div class="muted">${priceRange}</div>`;
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

  // setup currency selector in details section
  setupCurrencySelector();
  
  // Get current tier price for percentage calculations
  const currentTier = sub.tiers[state.selectedTierIdx] || sub.tiers[0];
  const basePrice = currentTier.price || 0;
  
  // tiers
  const tiersArea = document.getElementById('tiersArea'); tiersArea.innerHTML='';
  sub.tiers.forEach((tier, idx)=>{
    const r = document.createElement('label'); r.className='radio-card';
    r.innerHTML = `<input name="tier" type="radio" ${state.selectedTierIdx===idx?'checked':''} data-idx="${idx}"> <div style="font-weight:700">${tier.name}</div><div class="muted">${formatPrice(tier.price)}</div>`;
    r.querySelector('input').addEventListener('change', ()=>{ 
      state.selectedTierIdx = idx; 
      saveState(); 
      calculateAndShow(); 
      updatePercentageDisplays(); // Update addon percentage displays when tier changes
    });
    tiersArea.appendChild(r);
  });



  // addons
  const addonsArea = document.getElementById('addonsArea'); addonsArea.innerHTML='';
  (type.addons||[]).forEach(addon=>{
    const aid = addon.id;
    const a = document.createElement('div'); a.className='addon';
    a.style.cursor = 'pointer'; // Make it clear the card is clickable
    
    // for item/prop allow count input
    if(addon.id === 'itemProp'){
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">${formatPrice(addon.value)} each</div> <input type="number" min="1" value="${state.selectedAddons.get(aid)||1}" data-count="${aid}" style="width:68px;margin-left:10px">`;
      
      const checkbox = a.querySelector('input[type="checkbox"]');
      const countInput = a.querySelector('input[data-count]');
      
      // Handle checkbox changes
      const handleCheckboxChange = (checked) => {
        if(checked) {
          state.selectedAddons.set(aid, Number(countInput.value || 1));
          checkbox.checked = true;
        } else {
          state.selectedAddons.delete(aid);
          checkbox.checked = false;
        }
        saveState(); calculateAndShow();
      };
      
      // Checkbox event listener
      checkbox.addEventListener('change', (e) => {
        handleCheckboxChange(e.target.checked);
      });
      
      // Count input event listener
      countInput.addEventListener('change', (e) => {
        const val = Math.max(1, Math.floor(Number(e.target.value) || 1));
        e.target.value = val;
        if(state.selectedAddons.has(aid)) state.selectedAddons.set(aid, val);
        saveState(); calculateAndShow();
      });
      
      // Make entire card clickable (but prevent event on count input)
      a.addEventListener('click', (e) => {
        if (e.target === countInput) return; // Don't trigger on count input clicks
        handleCheckboxChange(!checkbox.checked);
      });
      
      // Prevent count input from triggering card click
      countInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
    } else {
      // checkbox only
      let priceDisplay = '';
      if (addon.type === 'percent') {
        const percentageValue = basePrice * (addon.value / 100);
        priceDisplay = `+${formatPrice(percentageValue)}`;
      } else {
        priceDisplay = `+${formatPrice(addon.value)}`;
      }
      
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">${priceDisplay}</div>`;
      
      const checkbox = a.querySelector('input');
      
      // Handle checkbox changes
      const handleCheckboxChange = (checked) => {
        if(checked) {
          state.selectedAddons.set(aid, true);
          checkbox.checked = true;
        } else {
          state.selectedAddons.delete(aid);
          checkbox.checked = false;
        }
        saveState(); calculateAndShow();
      };
      
      // Checkbox event listener
      checkbox.addEventListener('change', (e) => {
        handleCheckboxChange(e.target.checked);
      });
      
      // Make entire card clickable
      a.addEventListener('click', (e) => {
        if (e.target === checkbox) return; // Checkbox click is handled by its own event
        handleCheckboxChange(!checkbox.checked);
      });
      
      // Prevent checkbox from triggering card click
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    addonsArea.appendChild(a);
  });

  // next/reset handlers
  document.getElementById('nextToUpload').onclick = ()=>{ state.step='upload'; saveState(); render(); window.scrollTo({top:0,behavior:'smooth'}); };
  document.getElementById('resetSelection').onclick = ()=>{ if(confirm('Reset selections for this subtype?')){ state.selectedTierIdx=0; state.selectedAddons.clear(); saveState(); renderDetails(); calculateAndShow(); }};

  calculateAndShow();
  
  // Update percentage displays immediately after DOM creation
  updatePercentageDisplays(); // Ensure percentage displays are updated initially
}

/* ---------- File upload ---------- */
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const usernameInput = document.getElementById('usernameInput');

document.getElementById('addFilesBtn').addEventListener('click', ()=> fileInput.click());

// Username input handler
usernameInput.addEventListener('input', (e) => {
  state.username = e.target.value;
  saveState();
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

  const uniqueCount = state.files.length;
  const extra = Math.max(0, uniqueCount - 1);
  const refConfig = config?.referenceDiscount || { perFile: 2, maxDiscount: 4 };
  const refDiscount = Math.min(convertPrice(refConfig.perFile) * extra, convertPrice(refConfig.maxDiscount));

  const total = Math.max(0, base + addonsSum - refDiscount);
  return { total, breakdown:{ base, addons:addonsSum, refDiscount } };
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
      yPosition += 15;
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
    
    yPosition = addText(`Tier: ${tier?.name || 'Not selected'} - $${tier?.price || 0}`, margin, yPosition);
    yPosition += 15;

    // Style


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
    `Type: ${type?.name || ''}`,
    `Subtype: ${sub?.name || ''}`,
    `Tier: ${tier?.name || '—'} (${formatPrice(tier?.price ?? 0)})`,

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
  const tosLink = document.getElementById('tosLink');
  
  // Set TOS link from configuration
  const tosUrl = config?.tosUrl || '#';
  if (tosLink) {
    tosLink.href = tosUrl;
    // If no URL is configured, show a message
    if (tosUrl === '#') {
      tosLink.textContent = 'Terms of Service (Link not configured)';
      tosLink.style.opacity = '0.5';
      tosLink.onclick = (e) => {
        e.preventDefault();
        alert('Terms of Service URL not configured. Please contact the administrator.');
      };
    }
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
  
  // Use breadcrumb titles from configuration
  const defaultTitles = { 
    type:'Pick a commission type', 
    subtype:'Pick a subtype', 
    details:'Details & add-ons', 
    upload:'Reference upload', 
    summary:'Summary', 
    tos:'Terms of Service' 
  };
  const configTitles = config?.labels?.stepTitles || {};
  const titles = { ...defaultTitles, ...configTitles };
  
  crumb.textContent = titles[step] || defaultTitles[step];
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
  backBtn.style.display = state.step === 'subtype' ? 'none' : 'inline-block';
  showStep(state.step);
  if(state.step === 'subtype') renderSubtypes();
  if(state.step === 'details') renderDetails();
  if(state.step === 'upload'){ 
    // File input accept attribute - only images and PDFs for all commission types
    fileInput.setAttribute('accept', 'image/*,application/pdf');
    
    // Populate username input
    usernameInput.value = state.username;
    
    renderFileList(); 
    calculateAndShow(); 
  }
  if(state.step === 'summary'){ renderSummary(); }
  if(state.step === 'tos'){ renderTos(); }
}

/* back button */
backBtn.addEventListener('click', ()=>{
  if(state.step === 'subtype') return; // Can't go back from first step
  if(state.step === 'details') state.step='subtype';
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
window.addEventListener('unhandledrejection', ()=> setTimeout(removePdfOverlay, 50));
window.addEventListener('beforeunload', ()=> { state.files.forEach(f=>{ if(f.url) try{ URL.revokeObjectURL(f.url); }catch(e){} }); });

/* ---------- Branding ---------- */
function applyBranding() {
  const branding = config?.branding;
  if (!branding) return;
  
  // Apply background
  if (branding.backgroundImage) {
    document.body.style.backgroundImage = `url(${branding.backgroundImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else if (branding.backgroundColor) {
    document.body.style.backgroundColor = branding.backgroundColor;
  }
  
  // Apply logo
  if (branding.logo) {
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
      const logoImg = document.createElement('img');
      logoImg.src = branding.logo;
      logoImg.alt = 'Logo';
      logoImg.style.cssText = 'max-height: 40px; max-width: 200px; margin-bottom: 10px; display: block;';
      headerTitle.insertBefore(logoImg, headerTitle.firstChild);
    }
  }
}

/* ---------- Currency Selector ---------- */
function setupCurrencySelector() {
  const currencySelect = document.getElementById('currencySelect');
  if (!currencySelect) return;
  
  // Populate currency options
  currencySelect.innerHTML = '';
  Object.entries(currencies).forEach(([code, currency]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = formatCurrencyDisplay(code);
    if (code === state.currency) option.selected = true;
    currencySelect.appendChild(option);
  });
  
  // Handle currency change
  currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    saveState();
    calculateAndShow();
    updatePercentageDisplays(); // Update percentage displays when currency changes
    updateDisplayPrices();
    
    // Re-render subtypes to update price ranges with new currency
    if (state.step === 'subtype') {
      renderSubtypes();
    }
  });
}

function updateDisplayPrices() {
  // Re-render current step to update prices
  if (state.step === 'details') {
    renderDetails();
  }
  if (state.step === 'summary') renderSummary();
}

/* ---------- Init ---------- */
async function initializeApp() {
  try {
    await loadConfiguration();
    
    // Set initial currency from config if not already set
    if (!state.currency && config?.defaultCurrency) {
      state.currency = config.defaultCurrency;
    }
    
    loadState();
    if(!state.step) state.step='subtype';
    
    // Update name field label from configuration
    const nameLabel = document.getElementById('nameFieldLabel');
    if (nameLabel && config?.labels?.nameField) {
      nameLabel.textContent = config.labels.nameField;
    }
    
    setupCurrencySelector();
    applyBranding();
    render();
    calculateAndShow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Continue with fallback configuration
    loadState();
    if(!state.step) state.step='subtype';
    applyBranding();
    render();
    calculateAndShow();
  }
}

// Start the app
initializeApp();
