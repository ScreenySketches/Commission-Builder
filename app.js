/* app.js
   Uses the commission info from COMMISSION_INFO.txt:
   - tiers and prices for 2D subtypes
   - addons including percent-based (75%, 90%, style percentages)
   - item/prop $7 ea, detailed char $15, simple bg $10, complex bg $30
   - reference discount: -$2 each after first, capped at -$4
   - 3D category disabled "COMING SOON"
   Exports PDF via html2canvas + jsPDF (local vendor files).
*/

/* ---------- Data from COMMISSION_INFO.txt ---------- */
const commissionTypes = [
  {
    id: "2d",
    name: "2D Illustration / Sketch",
    thumbSVG: `
    <svg width="290" height="120" viewBox="0 0 290 120" xmlns="http://www.w3.org/2000/svg">
    <image
      href="images/celestialbody.png"
      x="0" y="0"
      width="290" height="120"
      preserveAspectRatio="xMidYMid slice"
    /></svg>`,
    priceRange: "$5 – $30",
    subTypes: [
      { id:"simplified", name: "Simplified / Chibi", tiers: [{name:"Sketch",price:5},{name:"Flat Color",price:10},{name:"Shaded",price:20}]},
      { id:"headshot", name: "Head Shot", tiers: [{name:"Sketch",price:5},{name:"Flat Color",price:10},{name:"Shaded",price:20}]},
      { id:"bust", name: "Bust", tiers: [{name:"Sketch",price:10},{name:"Flat Color",price:15},{name:"Shaded",price:25}]},
      { id:"fullbody", name: "Full-Body", tiers: [{name:"Sketch",price:15},{name:"Flat Color",price:20},{name:"Shaded",price:30}]}
    ],
    addons: [
      { id:"additionalCharacter", label:"Additional character", type:"percent", value:75 },
      { id:"animated6s", label:"Animate up to 6s @18fps", type:"percent", value:90 },
      { id:"itemProp", label:"Item / Prop (each)", type:"flat", value:7 },
      { id:"detailedChar", label:"Detailed / Complex character", type:"flat", value:15 },
      { id:"simpleBG", label:"Simple background", type:"flat", value:10 },
      { id:"complexBG", label:"Complex background", type:"flat", value:30 }
    ],
    comingSoon: false
  },
  {
    id: "3d",
    name: "3D Blender Render (COMING SOON)",
    thumbSVG: `<svg width="290" height="120" viewBox="0 0 290 120" xmlns="http://www.w3.org/2000/svg">
    <image
      href="images/3droblox.png"
      x="0" y="0"
      width="290" height="120"
      preserveAspectRatio="xMidYMid slice"
    /></svg>`,
    priceRange: "CONTACT ME FOR 3D COMMISSIONS",
    subTypes: [
      { id:"basicModel", name:"Basic Model", tiers:[{name:"Base", price:30}]},
      { id:"detailedModel", name:"Detailed Model", tiers:[{name:"Base", price:60}]},
      { id:"fullScene", name:"Full Scene", tiers:[{name:"Base", price:90}]}
    ],
    addons: [
      { id:"basicMaterial", label:"Basic materials", type:"flat", value:15 },
      { id:"customTextures", label:"Custom textures", type:"flat", value:25 }
    ],
    comingSoon: true
  },
  {
    id: "other",
    name: "Other / Reference Sheets",
    thumbSVG: `<svg width="290" height="120" viewBox="0 0 290 120" xmlns="http://www.w3.org/2000/svg">
    <image
      href="images/wondorref.png"
      x="0" y="-20"
      width="290" height="300"
      preserveAspectRatio="xMidYMid slice"
    /></svg>`,
    priceRange: "$50 – $65",
    subTypes: [
      { id:"ref_basic", name:"Basic OC Sheet", tiers:[{name:"Basic OC Sheet", price:50}]},
      { id:"ref_dnd", name:"D&D Visualization & Stats", tiers:[{name:"D&D Viz + Stats", price:65}]}
    ],
    addons: [],
    comingSoon: false
  }
];

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
  tosAccepted: false // whether user has accepted TOS
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
    tosAccepted: state.tosAccepted
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
  }catch(e){ console.warn('loadState',e); }
}

/* ---------- Helpers ---------- */
function findType(id){ return commissionTypes.find(t=>t.id===id); }
function findSub(type, subId){ return type?.subTypes.find(s=>s.id===subId); }

/* ---------- DOM refs ---------- */
const typesGrid = document.getElementById('typesGrid');
const subtypesGrid = document.getElementById('subtypesGrid');
const crumb = document.getElementById('crumb');
const backBtn = document.getElementById('backBtn');
const pdfSpinner = document.getElementById('pdfSpinner');

/* ---------- Renderers ---------- */
function renderTypes(){
  typesGrid.innerHTML = '';
  commissionTypes.forEach(type=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `<div class="thumb">${type.thumbSVG}</div><h3>${type.name}</h3><div class="muted">${type.priceRange}</div>`;
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
    const c = document.createElement('div'); c.className='card';
    const rep = sub.tiers && sub.tiers.length ? ('$' + sub.tiers[0].price + ' starting') : '';
    c.innerHTML = `<div class="thumb">${sub.name}</div><h3>${sub.name}</h3><div class="muted">${rep}</div>`;
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
    r.innerHTML = `<input name="tier" type="radio" ${state.selectedTierIdx===idx?'checked':''} data-idx="${idx}"> <div style="font-weight:700">${tier.name}</div><div class="muted">$${tier.price}</div>`;
    r.querySelector('input').addEventListener('change', ()=>{ state.selectedTierIdx = idx; saveState(); calculateAndShow(); });
    tiersArea.appendChild(r);
  });

  // art styles (basic = no fee)
  const styleArea = document.getElementById('styleArea'); styleArea.innerHTML='';
  const styleOpts = [
    { id:'style_basic', label:'Basic (no fee)', type:'none', value:0 },
    { id:'style_lineless', label:'Lineless (20% base)', type:'percent', value:20 },
    { id:'style_scene', label:'Scene/Sharp (10% base)', type:'percent', value:10 },
    { id:'style_pixel', label:'Pixelated (20% base)', type:'percent', value:20 }
  ];
  styleOpts.forEach(opt=>{
    const r = document.createElement('label'); r.className='radio-card';
    r.innerHTML = `<input type="radio" name="style" ${state.selectedStyleId===opt.id?'checked':''} data-id="${opt.id}"> <div style="font-weight:700">${opt.label}</div>`;
    r.querySelector('input').addEventListener('change', ()=>{ state.selectedStyleId = opt.id; saveState(); calculateAndShow(); });
    styleArea.appendChild(r);
  });

  // addons
  const addonsArea = document.getElementById('addonsArea'); addonsArea.innerHTML='';
  (type.addons||[]).forEach(addon=>{
    const aid = addon.id;
    const a = document.createElement('div'); a.className='addon';
    // for item/prop allow count input
    if(addon.id === 'itemProp'){
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">$${addon.value} each</div> <input type="number" min="1" value="${state.selectedAddons.get(aid)||1}" data-count="${aid}" style="width:68px;margin-left:10px">`;
      a.querySelector('input[type="checkbox"]').addEventListener('change', (e)=>{
        if(e.target.checked) state.selectedAddons.set(aid, Number(a.querySelector('input[data-count]').value || 1));
        else state.selectedAddons.delete(aid);
        saveState(); calculateAndShow();
      });
      a.querySelector('input[data-count]').addEventListener('change', (e)=>{
        const val = Math.max(1, Math.floor(Number(e.target.value) || 1));
        e.target.value = val;
        if(state.selectedAddons.has(aid)) state.selectedAddons.set(aid, val);
        saveState(); calculateAndShow();
      });
    } else {
      // checkbox only
      a.innerHTML = `<input type="checkbox" data-id="${aid}" ${state.selectedAddons.has(aid)?'checked':''}> <div style="flex:1">${addon.label}</div> <div class="price-tag">${addon.type==='percent'?addon.value+'%':'+$'+addon.value}</div>`;
      a.querySelector('input').addEventListener('change', (e)=>{
        if(e.target.checked) state.selectedAddons.set(aid, true);
        else state.selectedAddons.delete(aid);
        saveState(); calculateAndShow();
      });
    }
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

  // style
  let styleAdd = 0;
  if(state.selectedStyleId && state.selectedStyleId !== 'style_basic'){
    const styleMap = { style_lineless:20, style_scene:10, style_pixel:20 };
    const pct = styleMap[state.selectedStyleId] || 0;
    styleAdd = base * (pct/100);
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

  const uniqueCount = state.files.length;
  const extra = Math.max(0, uniqueCount - 1);
  const refDiscount = Math.min(2 * extra, 4);

  const total = Math.max(0, base + styleAdd + addonsSum - refDiscount);
  return { total, breakdown:{ base, styleAdd, addons:addonsSum, refDiscount } };
}

function calculateAndShow(){
  const calc = calculateTotalNumbers();
  document.getElementById('liveSubtotal').textContent = `$${calc.total.toFixed(2)}`;
  document.getElementById('refDiscount').textContent = `-$${calc.breakdown.refDiscount.toFixed(2)}`;
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
    const styleMap = { 
      style_lineless:'Lineless (+20%)', 
      style_scene:'Scene/Sharp (+10%)', 
      style_pixel:'Pixelated (+20%)', 
      style_basic:'Basic (no extra cost)' 
    };
    const styleName = styleMap[state.selectedStyleId] || 'Basic (no extra cost)';
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

    yPosition = addText(`Base Price: $${calc.breakdown.base.toFixed(2)}`, margin, yPosition);
    yPosition += 5;
    
    if (calc.breakdown.addons > 0) {
      yPosition = addText(`Add-ons: +$${calc.breakdown.addons.toFixed(2)}`, margin, yPosition);
      yPosition += 5;
    }
    
    if (calc.breakdown.refDiscount > 0) {
      yPosition = addText(`Reference Discount: -$${calc.breakdown.refDiscount.toFixed(2)}`, margin, yPosition);
      yPosition += 5;
    }
    
    yPosition += 10;
    yPosition = addText(`TOTAL ESTIMATED PRICE: $${calc.total.toFixed(2)}`, margin, yPosition, {
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
    `Tier: ${tier?.name || '—'} ($${tier?.price ?? 0})`,
    `Style: ${state.selectedStyleId}`,
    `Add-ons: ${Array.from(state.selectedAddons.keys()).map(id=>{
      const a = (type.addons||[]).find(x=>x.id===id);
      return a ? a.label : id;
    }).join('; ') || 'None'}`,
    `Reference sheets uploaded: ${state.files.length} (${state.files.map(f=>f.name).join(', ') || '—'})`,
    `Reference discount applied: -$${calc.breakdown.refDiscount.toFixed(2)}`,
    `Estimated total: $${calc.total.toFixed(2)}`
  ];

  document.getElementById('summaryText').innerHTML = '<div class="strong">Quick Summary</div><div class="muted" style="margin-top:8px">' + pieces.join('<br>') + '</div>';
  document.getElementById('finalTotal').textContent = `$${calc.total.toFixed(2)}`;
  document.getElementById('summaryCopy').value = pieces.join('\n');

  document.getElementById('copySummary').onclick = ()=>{ document.getElementById('summaryCopy').select(); document.execCommand('copy'); alert('Summary copied to clipboard.'); };
}

/* ---------- Terms of Service ---------- */
function renderTos(){
  const tosCheckbox = document.getElementById('tosCheckbox');
  const exportBtn = document.getElementById('exportPdfBtn');
  
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
  if(state.step === 'type') renderTypes();
  if(state.step === 'subtype') renderSubtypes();
  if(state.step === 'details') renderDetails();
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
window.addEventListener('unhandledrejection', ()=> setTimeout(removePdfOverlay, 50));
window.addEventListener('beforeunload', ()=> { state.files.forEach(f=>{ if(f.url) try{ URL.revokeObjectURL(f.url); }catch(e){} }); });

/* ---------- Init ---------- */
loadState();
if(!state.step) state.step='type';
render();
calculateAndShow();
