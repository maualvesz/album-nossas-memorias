// ========== CONFIGURAÇÕES ==========
const API_URL = '/.netlify/functions/photos';
let allPhotos = [];
let currentIndex = 0;
let editIndex = -1;
let newImageSrc = null;
let newMediaType = 'image';
let sortOrder = 'newest';

// ========== PARSING DE DATA ==========
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = 2000 + parseInt(match[3]);
        return new Date(year, month, day);
    }
    const d = new Date(dateStr);
    return isNaN(d) ? new Date(0) : d;
}

function formatDateFromPicker(pickerValue) {
    if (!pickerValue) return '';
    const [year, month, day] = pickerValue.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
}

function formatDateInput(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 6) value = value.slice(0, 6);
    let formatted = '';
    if (value.length > 0) formatted += value.slice(0, 2);
    if (value.length > 2) formatted += '/' + value.slice(2, 4);
    if (value.length > 4) formatted += '/' + value.slice(4, 6);
    input.value = formatted;
}

function syncDateFromPicker() {
    const picker = document.getElementById('datePicker');
    const dateField = document.getElementById('newDate');
    if (picker.value) {
        dateField.value = formatDateFromPicker(picker.value);
    }
}

// ========== CARREGAMENTO ==========
async function loadPhotos() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        allPhotos = data || [];
    } catch (error) {
        console.error('Erro ao carregar:', error);
        alert('Erro ao carregar fotos. Verifique sua conexão.');
        allPhotos = [];
    }
    renderPhotos();
}

// ========== FILTROS E ORDENAÇÃO ==========
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
    const monthFilter = document.getElementById('filterMonth').value;
    let photos = [...allPhotos];

    if (monthFilter) {
        const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
        photos = photos.filter(photo => {
            const d = parseDate(photo.date);
            return d.getFullYear() === filterYear && (d.getMonth() + 1) === filterMonth;
        });
    }

    photos.sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        return sortOrder === 'newest' ? db - da : da - db;
    });

    return photos;
}

// ========== RENDERIZAÇÃO ==========
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

    photos.forEach((photo, index) => {
        const realIndex = allPhotos.indexOf(photo);
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.style.animationDelay = (index * 0.08) + 's';

        const isVideo = photo.type === 'video';
        const mediaThumbnail = isVideo
            ? `<div class="video-thumb" onclick="openViewModal(${realIndex})">
                 <video src="${photo.src}" muted preload="metadata"></video>
                 <div class="play-overlay">▶</div>
               </div>`
            : `<div class="photo-frame" onclick="openViewModal(${realIndex})">
                 <img src="${photo.src}" alt="${photo.caption}" loading="lazy">
               </div>`;

        card.innerHTML = `
            ${mediaThumbnail}
            <div class="photo-info">
                <p class="date-badge">${photo.date}</p>
                <p class="caption-text">${photo.caption}</p>
                <div class="card-actions">
                    <button class="btn-card" onclick="openEditModal(${realIndex})">Editar</button>
                    <button class="btn-card" onclick="deletePhoto('${photo.id}')">Excluir</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'add-photo-card';
    addCard.onclick = openAddModal;
    addCard.innerHTML = `
        <div class="add-icon">📷</div>
        <h3>Adicionar</h3>
        <p>Fotos e vídeos especiais</p>
    `;
    grid.appendChild(addCard);
}

// ========== MODAL VISUALIZAR ==========
function openViewModal(index) {
    currentIndex = index;
    updateViewModal();
    document.getElementById('viewModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function updateViewModal() {
    const photo = allPhotos[currentIndex];
    const img = document.getElementById('modal-img');
    const video = document.getElementById('modal-video');

    if (photo.type === 'video') {
        img.style.display = 'none';
        video.style.display = 'block';
        video.src = photo.src;
    } else {
        video.pause();
        video.style.display = 'none';
        img.style.display = 'block';
        img.src = photo.src;
    }

    document.getElementById('modal-date').textContent = photo.date;
    document.getElementById('modal-caption').textContent = photo.caption;
}

function prevPhoto() {
    const filtered = getFilteredAndSortedPhotos();
    const cur = filtered.indexOf(allPhotos[currentIndex]);
    currentIndex = allPhotos.indexOf(filtered[(cur - 1 + filtered.length) % filtered.length]);
    updateViewModal();
}

function nextPhoto() {
    const filtered = getFilteredAndSortedPhotos();
    const cur = filtered.indexOf(allPhotos[currentIndex]);
    currentIndex = allPhotos.indexOf(filtered[(cur + 1) % filtered.length]);
    updateViewModal();
}

function downloadMedia() {
    const photo = allPhotos[currentIndex];
    const link = document.createElement('a');
    link.href = photo.src;
    const ext = photo.type === 'video' ? 'mp4' : 'jpg';
    link.download = `memoria_${photo.date.replace(/\//g, '-')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ========== MODAL ADICIONAR/EDITAR ==========
function openAddModal() {
    editIndex = -1;
    newImageSrc = null;
    newMediaType = 'image';
    document.getElementById('formTitle').innerHTML = 'Nova <em>Memória</em>';
    document.getElementById('formSubtitle').textContent = 'Adicione uma foto ou vídeo especial ao nosso álbum';
    document.getElementById('btnSave').textContent = '💕 Adicionar ao Álbum';
    document.getElementById('fileInput').value = '';
    document.getElementById('newDate').value = '';
    document.getElementById('datePicker').value = '';
    document.getElementById('newCaption').value = '';
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('preview-video').style.display = 'none';
    document.getElementById('upload-text').style.display = 'block';
    document.getElementById('formModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function openEditModal(index) {
    editIndex = index;
    const photo = allPhotos[index];
    newImageSrc = photo.src;
    newMediaType = photo.type || 'image';
    document.getElementById('formTitle').innerHTML = 'Editar <em>Memória</em>';
    document.getElementById('formSubtitle').textContent = 'Atualize os detalhes deste momento';
    document.getElementById('btnSave').textContent = '💕 Salvar Alterações';
    document.getElementById('newDate').value = photo.date;
    document.getElementById('datePicker').value = '';
    document.getElementById('newCaption').value = photo.caption;

    const previewImg = document.getElementById('preview-img');
    const previewVideo = document.getElementById('preview-video');
    if (newMediaType === 'video') {
        previewVideo.src = photo.src;
        previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
    } else {
        previewImg.src = photo.src;
        previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
    }
    document.getElementById('preview-container').style.display = 'block';
    document.getElementById('upload-text').style.display = 'none';
    document.getElementById('formModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
    document.body.style.overflow = '';
    if (modalId === 'viewModal') {
        const v = document.getElementById('modal-video');
        v.pause();
        v.src = '';
    }
}

// ========== HANDLE FILE ==========
function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    newMediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = (e) => {
        newImageSrc = e.target.result;
        const previewImg = document.getElementById('preview-img');
        const previewVideo = document.getElementById('preview-video');
        if (newMediaType === 'video') {
            previewVideo.src = newImageSrc;
            previewVideo.style.display = 'block';
            previewImg.style.display = 'none';
        } else {
            previewImg.src = newImageSrc;
            previewImg.style.display = 'block';
            previewVideo.style.display = 'none';
        }
        document.getElementById('preview-container').style.display = 'block';
        document.getElementById('upload-text').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ========== SALVAR ==========
async function savePhoto() {
    const date = document.getElementById('newDate').value || 'Data especial';
    const caption = document.getElementById('newCaption').value || 'Mais um momento lindo 💕';
    if (!newImageSrc) { alert('Por favor, escolha uma foto ou vídeo primeiro!'); return; }

    const btnSave = document.getElementById('btnSave');
    const originalText = btnSave.textContent;
    btnSave.textContent = '⏳ Salvando...';
    btnSave.disabled = true;

    try {
        let response;
        if (editIndex === -1) {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ src: newImageSrc, date, caption, type: newMediaType })
            });
        } else {
            const photoId = allPhotos[editIndex].id;
            response = await fetch(`${API_URL}?id=${photoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ src: newImageSrc, date, caption, type: newMediaType })
            });
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }
        await loadPhotos();
        closeModal('formModal');
        alert('✅ Memória salva com sucesso!');
    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    } finally {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
    }
}

// ========== EXCLUIR ==========
async function deletePhoto(photoId) {
    if (!confirm('Tem certeza que deseja excluir esta memória? 🌹')) return;
    try {
        const response = await fetch(`${API_URL}?id=${photoId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }
        await loadPhotos();
        alert('✅ Memória excluída!');
    } catch (error) {
        alert(`Erro ao excluir: ${error.message}`);
    }
}

// ========== UTILITÁRIOS ==========
function createPetals() {
    const container = document.getElementById('petals');
    const symbols = ['🌸', '🌹', '✨', '💖', '🍂'];
    for (let i = 0; i < 15; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        petal.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        petal.style.left = Math.random() * 100 + 'vw';
        petal.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
        petal.style.animationDuration = (8 + Math.random() * 12) + 's';
        petal.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(petal);
    }
}

window.onclick = function(event) {
    if (event.target == document.getElementById('viewModal')) closeModal('viewModal');
    if (event.target == document.getElementById('formModal')) closeModal('formModal');
}

document.addEventListener('keydown', (e) => {
    if (document.getElementById('viewModal').classList.contains('open')) {
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
        if (e.key === 'Escape') closeModal('viewModal');
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

document.addEventListener('DOMContentLoaded', () => {
    createPetals();
    loadPhotos();
});
