// ╔══════════════════════════════════════════════════════╗
// ║  script.js — Álbum de Memórias                       ║
// ║  Upload direto via Cloudinary (sem base64)           ║
// ╚══════════════════════════════════════════════════════╝

const API_URL  = '/.netlify/functions/photos';
const SIGN_URL = '/.netlify/functions/cloudinary-sign';

let allPhotos  = [];
let currentIndex = 0;
let editIndex    = -1;
let sortOrder    = 'newest';

// Arquivo selecionado (objeto File) — nunca lemos como base64
let selectedFile = null;
// Se estiver editando sem trocar a mídia, mantemos a URL original
let editSrcUrl   = null;
let editPublicId = null;

// ─────────────────────────────────────────────
//  DATA — Parsing e formatação
// ─────────────────────────────────────────────
function parseDate(str) {
  if (!str) return new Date(0);
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return new Date(2000 + +m[3], +m[2] - 1, +m[1]);
  const d = new Date(str);
  return isNaN(d) ? new Date(0) : d;
}

function formatDateInput(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 6);
  if (v.length > 4) v = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
  else if (v.length > 2) v = v.slice(0,2)+'/'+v.slice(2);
  input.value = v;
}

function syncDateFromPicker() {
  const p = document.getElementById('datePicker');
  if (!p.value) return;
  const [y, mo, d] = p.value.split('-');
  document.getElementById('newDate').value = `${d}/${mo}/${y.slice(-2)}`;
}

// ─────────────────────────────────────────────
//  UPLOAD para o Cloudinary
// ─────────────────────────────────────────────
async function uploadToCloudinary(file) {
  // 1) Pega assinatura segura do nosso backend
  const sigRes = await fetch(SIGN_URL, { method: 'POST' });
  if (!sigRes.ok) throw new Error('Falha ao obter assinatura de upload.');
  const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

  // 2) Monta o FormData para envio direto à API do Cloudinary
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);

  // Resource type: 'video' aceita vídeos; 'image' aceita imagens (e PDFs)
  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: 'POST', body: form }
  );

  if (!uploadRes.ok) {
    const e = await uploadRes.json();
    throw new Error(e.error?.message || 'Falha no upload para o Cloudinary.');
  }

  const data = await uploadRes.json();
  return {
    src:       data.secure_url,
    publicId:  data.public_id,
    type:      resourceType === 'video' ? 'video' : 'image',
  };
}

// ─────────────────────────────────────────────
//  CARREGAR fotos do MongoDB
// ─────────────────────────────────────────────
async function loadPhotos() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPhotos = (await res.json()) || [];
  } catch (e) {
    console.error('Erro ao carregar:', e);
    showToast('Erro ao carregar memórias. Verifique sua conexão.', 'error');
    allPhotos = [];
  }
  renderPhotos();
}

// ─────────────────────────────────────────────
//  FILTROS & ORDENAÇÃO
// ─────────────────────────────────────────────
function setSortOrder(order) {
  sortOrder = order;
  document.getElementById('btnNewest').classList.toggle('active', order === 'newest');
  document.getElementById('btnOldest').classList.toggle('active', order === 'oldest');
  renderPhotos();
}

function applyFilters() { renderPhotos(); }

function clearMonthFilter() {
  document.getElementById('filterMonth').value = '';
  renderPhotos();
}

function getFilteredAndSortedPhotos() {
  const mf = document.getElementById('filterMonth').value; // "YYYY-MM"
  let photos = [...allPhotos];

  if (mf) {
    const [fy, fm] = mf.split('-').map(Number);
    photos = photos.filter(p => {
      const d = parseDate(p.date);
      return d.getFullYear() === fy && d.getMonth() + 1 === fm;
    });
  }

  photos.sort((a, b) => {
    const da = parseDate(a.date), db = parseDate(b.date);
    return sortOrder === 'newest' ? db - da : da - db;
  });

  return photos;
}

// ─────────────────────────────────────────────
//  RENDERIZAR GRID
// ─────────────────────────────────────────────
function renderPhotos() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';
  const photos = getFilteredAndSortedPhotos();

  if (photos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>✨ Nenhuma memória encontrada para este período.</p>';
    grid.appendChild(empty);
  }

  photos.forEach((photo, idx) => {
    const realIdx = allPhotos.indexOf(photo);
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.style.animationDelay = (idx * 0.06) + 's';

    const isVideo = photo.type === 'video';

    // Thumbnail: vídeos mostram elemento <video> mudo para preview
    const thumbHtml = isVideo
      ? `<div class="media-frame video-thumb" onclick="openViewModal(${realIdx})">
           <video src="${photo.src}" muted preload="metadata" playsinline></video>
           <div class="play-overlay">▶</div>
         </div>`
      : `<div class="media-frame" onclick="openViewModal(${realIdx})">
           <img src="${photo.src}" alt="${escHtml(photo.caption)}" loading="lazy">
         </div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div class="photo-info">
        <p class="date-badge">${escHtml(photo.date)}</p>
        <p class="caption-text">${escHtml(photo.caption)}</p>
        <div class="card-actions">
          <button class="btn-card" onclick="openEditModal(${realIdx})">✏️ Editar</button>
          <button class="btn-card btn-delete" onclick="deletePhoto('${photo.id}')">🗑️ Excluir</button>
        </div>
      </div>`;

    grid.appendChild(card);
  });

  // Botão de adicionar sempre ao final
  const addCard = document.createElement('div');
  addCard.className = 'add-photo-card';
  addCard.onclick = openAddModal;
  addCard.innerHTML = `
    <div class="add-icon">📷</div>
    <h3>Adicionar</h3>
    <p>Fotos e vídeos especiais</p>`;
  grid.appendChild(addCard);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
//  MODAL DE VISUALIZAÇÃO
// ─────────────────────────────────────────────
function openViewModal(index) {
  currentIndex = index;
  updateViewModal();
  document.getElementById('viewModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function updateViewModal() {
  const photo = allPhotos[currentIndex];
  const img   = document.getElementById('modal-img');
  const video = document.getElementById('modal-video');

  if (photo.type === 'video') {
    img.style.display   = 'none';
    video.style.display = 'block';
    video.src           = photo.src;
  } else {
    if (video.src) { video.pause(); video.removeAttribute('src'); }
    video.style.display = 'none';
    img.style.display   = 'block';
    img.src             = photo.src;
  }

  document.getElementById('modal-date').textContent    = photo.date;
  document.getElementById('modal-caption').textContent = photo.caption;
}

function prevPhoto() {
  const list = getFilteredAndSortedPhotos();
  const cur  = list.indexOf(allPhotos[currentIndex]);
  currentIndex = allPhotos.indexOf(list[(cur - 1 + list.length) % list.length]);
  updateViewModal();
}

function nextPhoto() {
  const list = getFilteredAndSortedPhotos();
  const cur  = list.indexOf(allPhotos[currentIndex]);
  currentIndex = allPhotos.indexOf(list[(cur + 1) % list.length]);
  updateViewModal();
}

function downloadMedia() {
  const photo = allPhotos[currentIndex];
  // Para URLs do Cloudinary, abrimos em nova aba (download direto pode ser bloqueado por CORS)
  window.open(photo.src, '_blank');
}

// ─────────────────────────────────────────────
//  MODAL ADICIONAR / EDITAR
// ─────────────────────────────────────────────
function openAddModal() {
  editIndex   = -1;
  selectedFile = null;
  editSrcUrl   = null;
  editPublicId = null;

  document.getElementById('formTitle').innerHTML    = 'Nova <em>Memória</em>';
  document.getElementById('formSubtitle').textContent = 'Adicione uma foto ou vídeo especial ao nosso álbum';
  document.getElementById('btnSave').textContent    = '💕 Adicionar ao Álbum';
  document.getElementById('fileInput').value        = '';
  document.getElementById('newDate').value          = '';
  document.getElementById('datePicker').value       = '';
  document.getElementById('newCaption').value       = '';

  resetPreview();
  document.getElementById('formModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openEditModal(index) {
  editIndex    = index;
  const photo  = allPhotos[index];
  selectedFile = null;
  editSrcUrl   = photo.src;
  editPublicId = photo.publicId || null;

  document.getElementById('formTitle').innerHTML    = 'Editar <em>Memória</em>';
  document.getElementById('formSubtitle').textContent = 'Atualize os detalhes deste momento';
  document.getElementById('btnSave').textContent    = '💕 Salvar Alterações';
  document.getElementById('newDate').value          = photo.date;
  document.getElementById('datePicker').value       = '';
  document.getElementById('newCaption').value       = photo.caption;

  // Mostrar preview da mídia atual
  showPreview(photo.src, photo.type);

  document.getElementById('formModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
  document.body.style.overflow = '';
  if (modalId === 'viewModal') {
    const v = document.getElementById('modal-video');
    v.pause();
    v.removeAttribute('src');
  }
}

// ─────────────────────────────────────────────
//  SELEÇÃO DE ARQUIVO
// ─────────────────────────────────────────────
function handleFile(input) {
  const file = input.files[0];
  if (!file) return;
  selectedFile = file;

  // Preview local usando URL de objeto (sem base64!)
  const objectURL = URL.createObjectURL(file);
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  showPreview(objectURL, type);
}

function showPreview(src, type) {
  const container   = document.getElementById('preview-container');
  const previewImg  = document.getElementById('preview-img');
  const previewVid  = document.getElementById('preview-video');
  const uploadText  = document.getElementById('upload-text');

  if (type === 'video') {
    previewVid.src          = src;
    previewVid.style.display = 'block';
    previewImg.style.display = 'none';
  } else {
    previewImg.src           = src;
    previewImg.style.display = 'block';
    previewVid.style.display = 'none';
  }

  container.style.display = 'block';
  uploadText.style.display = 'none';
}

function resetPreview() {
  document.getElementById('preview-container').style.display = 'none';
  document.getElementById('preview-img').style.display       = 'none';
  document.getElementById('preview-video').style.display     = 'none';
  document.getElementById('upload-text').style.display       = 'block';
}

// ─────────────────────────────────────────────
//  SALVAR (upload + gravar no MongoDB)
// ─────────────────────────────────────────────
async function savePhoto() {
  const date    = document.getElementById('newDate').value.trim() || 'Data especial';
  const caption = document.getElementById('newCaption').value.trim() || 'Mais um momento lindo 💕';

  // Validação: precisa ter mídia (nova ou existente ao editar)
  if (!selectedFile && !editSrcUrl) {
    showToast('Por favor, escolha uma foto ou vídeo!', 'error');
    return;
  }

  const btn = document.getElementById('btnSave');
  const orig = btn.textContent;
  btn.textContent = '⏳ Enviando...';
  btn.disabled    = true;

  try {
    let src, publicId, type;

    if (selectedFile) {
      // ── Novo arquivo: faz upload para Cloudinary ──
      btn.textContent = '☁️ Enviando para a nuvem...';
      const result = await uploadToCloudinary(selectedFile);
      src      = result.src;
      publicId = result.publicId;
      type     = result.type;
    } else {
      // ── Edição sem trocar mídia: mantém URL existente ──
      src      = editSrcUrl;
      publicId = editPublicId;
      type     = allPhotos[editIndex]?.type || 'image';
    }

    btn.textContent = '💾 Salvando...';

    let res;
    if (editIndex === -1) {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, publicId, date, caption, type }),
      });
    } else {
      const photoId = allPhotos[editIndex].id;
      res = await fetch(`${API_URL}?id=${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, publicId, date, caption, type }),
      });
    }

    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || `HTTP ${res.status}`);
    }

    await loadPhotos();
    closeModal('formModal');
    showToast('✅ Memória salva com sucesso!', 'success');
  } catch (e) {
    console.error('Erro ao salvar:', e);
    showToast(`Erro: ${e.message}`, 'error');
  } finally {
    btn.textContent = orig;
    btn.disabled    = false;
  }
}

// ─────────────────────────────────────────────
//  EXCLUIR
// ─────────────────────────────────────────────
async function deletePhoto(photoId) {
  if (!confirm('Tem certeza que deseja excluir esta memória? 🌹')) return;
  try {
    const res = await fetch(`${API_URL}?id=${photoId}`, { method: 'DELETE' });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    await loadPhotos();
    showToast('Memória excluída.', 'success');
  } catch (e) {
    showToast(`Erro ao excluir: ${e.message}`, 'error');
  }
}

// ─────────────────────────────────────────────
//  TOAST DE FEEDBACK
// ─────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─────────────────────────────────────────────
//  PÉTALAS
// ─────────────────────────────────────────────
function createPetals() {
  const container = document.getElementById('petals');
  const symbols   = ['🌸', '🌹', '✨', '💖', '🍂'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className          = 'petal';
    p.textContent        = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left         = Math.random() * 100 + 'vw';
    p.style.fontSize     = (0.8 + Math.random() * 1.2) + 'rem';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay    = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
}

// ─────────────────────────────────────────────
//  EVENTOS GLOBAIS
// ─────────────────────────────────────────────
window.onclick = (event) => {
  if (event.target === document.getElementById('viewModal')) closeModal('viewModal');
  if (event.target === document.getElementById('formModal')) closeModal('formModal');
};

document.addEventListener('keydown', (e) => {
  if (document.getElementById('viewModal').classList.contains('open')) {
    if (e.key === 'ArrowLeft')  prevPhoto();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'Escape')     closeModal('viewModal');
  }
  if (e.key === 'Escape' && document.getElementById('formModal').classList.contains('open')) {
    closeModal('formModal');
  }
});

function logout() {
  if (confirm('É você que quer sair? 🌹')) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('login_time');
    window.location.href = 'login.html';
  }
}

// ─────────────────────────────────────────────
//  INICIALIZAÇÃO
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createPetals();
  loadPhotos();
});
