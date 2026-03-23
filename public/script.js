// ========== CONFIGURAÇÕES ==========
const API_URL = '/.netlify/functions/photos';
let allPhotos = [];
let currentIndex = 0;
let editIndex = -1;
let newImageSrc = null;
let useLocalStorage = false;

// ========== CARREGAMENTO DE DADOS ==========
async function loadPhotos() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            allPhotos = await response.json();
            useLocalStorage = false;
        } else {
            console.warn('API não disponível, usando localStorage');
            loadPhotosFromLocalStorage();
            useLocalStorage = true;
        }
    } catch (error) {
        console.warn('API não disponível, usando localStorage:', error);
        loadPhotosFromLocalStorage();
        useLocalStorage = true;
    }
    renderPhotos();
}

function loadPhotosFromLocalStorage() {
    const savedPhotos = localStorage.getItem('album_photos');
    if (savedPhotos) {
        allPhotos = JSON.parse(savedPhotos);
    } else {
        allPhotos = [];
    }
}

function savePhotosToLocalStorage() {
    localStorage.setItem('album_photos', JSON.stringify(allPhotos));
}

// ========== RENDERIZAÇÃO ==========
function renderPhotos() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';

    allPhotos.forEach((photo, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.style.animationDelay = (index * 0.08) + 's';
        card.innerHTML = `
            <div class="photo-frame" onclick="openViewModal(${index})">
                <img src="${photo.src}" alt="${photo.caption}" loading="lazy">
            </div>
            <div class="photo-info">
                <p class="date-badge">${photo.date}</p>
                <p class="caption-text">${photo.caption}</p>
                <div class="card-actions">
                    <button class="btn-card" onclick="openEditModal(${index})">Editar</button>
                    <button class="btn-card" onclick="deletePhoto('${photo.id}')">Excluir</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Re-adiciona o botão de adicionar ao final
    const addCard = document.createElement('div');
    addCard.className = 'add-photo-card';
    addCard.onclick = openAddModal;
    addCard.innerHTML = `
        <div class="add-icon">📷</div>
        <h3>Adicionar Foto</h3>
        <p>Novas memórias nos esperam</p>
    `;
    grid.appendChild(addCard);
}

// ========== MODAIS (VISUALIZAR) ==========
function openViewModal(index) {
    currentIndex = index;
    updateViewModal();
    document.getElementById('viewModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function updateViewModal() {
    const photo = allPhotos[currentIndex];
    document.getElementById('modal-img').src = photo.src;
    document.getElementById('modal-date').textContent = photo.date;
    document.getElementById('modal-caption').textContent = photo.caption;
}

function prevPhoto() {
    currentIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    updateViewModal();
}

function nextPhoto() {
    currentIndex = (currentIndex + 1) % allPhotos.length;
    updateViewModal();
}

// ========== MODAIS (ADICIONAR/EDITAR) ==========
function openAddModal() {
    editIndex = -1;
    newImageSrc = null;
    document.getElementById('formTitle').innerHTML = 'Nova <em>Memória</em>';
    document.getElementById('formSubtitle').textContent = 'Adicione uma foto especial ao nosso álbum';
    document.getElementById('btnSave').textContent = '💕 Adicionar ao Álbum';
    
    // Limpar campos
    document.getElementById('fileInput').value = '';
    document.getElementById('newDate').value = '';
    document.getElementById('newCaption').value = '';
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('upload-text').style.display = 'block';

    document.getElementById('formModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function openEditModal(index) {
    editIndex = index;
    const photo = allPhotos[index];
    newImageSrc = photo.src;

    document.getElementById('formTitle').innerHTML = 'Editar <em>Memória</em>';
    document.getElementById('formSubtitle').textContent = 'Atualize os detalhes deste momento';
    document.getElementById('btnSave').textContent = '💕 Salvar Alterações';

    document.getElementById('newDate').value = photo.date;
    document.getElementById('newCaption').value = photo.caption;
    
    document.getElementById('preview-img').src = photo.src;
    document.getElementById('preview-container').style.display = 'block';
    document.getElementById('upload-text').style.display = 'none';

    document.getElementById('formModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
    document.body.style.overflow = '';
}

// ========== AÇÕES (SALVAR/EXCLUIR) ==========
function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        newImageSrc = e.target.result;
        document.getElementById('preview-img').src = newImageSrc;
        document.getElementById('preview-container').style.display = 'block';
        document.getElementById('upload-text').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function savePhoto() {
    const date = document.getElementById('newDate').value || 'Data especial';
    const caption = document.getElementById('newCaption').value || 'Mais um momento lindo 💕';
    
    if (!newImageSrc) {
        alert('Por favor, escolha uma foto primeiro! 📷');
        return;
    }

    const btnSave = document.getElementById('btnSave');
    const originalText = btnSave.textContent;
    btnSave.textContent = '⏳ Salvando...';
    btnSave.disabled = true;

    try {
        if (useLocalStorage) {
            // Usar localStorage
            const { v4: uuidv4 } = { v4: () => 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
            
            if (editIndex === -1) {
                // Adicionar nova
                allPhotos.unshift({ 
                    id: uuidv4(), 
                    src: newImageSrc, 
                    date, 
                    caption,
                    createdAt: new Date().toISOString()
                });
            } else {
                // Editar existente
                allPhotos[editIndex] = { 
                    ...allPhotos[editIndex],
                    src: newImageSrc, 
                    date, 
                    caption,
                    updatedAt: new Date().toISOString()
                };
            }
            
            savePhotosToLocalStorage();
            await loadPhotos();
            closeModal('formModal');
        } else {
            // Usar API
            let response;
            if (editIndex === -1) {
                // Adicionar nova
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ src: newImageSrc, date, caption })
                });
            } else {
                // Editar existente
                const photoId = allPhotos[editIndex].id;
                response = await fetch(`${API_URL}?id=${photoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ src: newImageSrc, date, caption })
                });
            }

            if (response.ok) {
                await loadPhotos();
                closeModal('formModal');
            } else {
                const error = await response.json();
                alert('Erro ao salvar foto: ' + (error.error || 'Tente novamente'));
            }
        }
    } catch (error) {
        console.error('Erro ao salvar foto:', error);
        alert('Erro ao salvar foto. Tente novamente.');
    } finally {
        btnSave.textContent = originalText;
        btnSave.disabled = false;
    }
}

async function deletePhoto(photoId) {
    if (confirm('Tem certeza que deseja excluir esta memória? 🌹')) {
        try {
            if (useLocalStorage) {
                // Usar localStorage
                allPhotos = allPhotos.filter(p => p.id !== photoId);
                savePhotosToLocalStorage();
                await loadPhotos();
            } else {
                // Usar API
                const response = await fetch(`${API_URL}?id=${photoId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await loadPhotos();
                } else {
                    const error = await response.json();
                    alert('Erro ao excluir foto: ' + (error.error || 'Tente novamente'));
                }
            }
        } catch (error) {
            console.error('Erro ao excluir foto:', error);
            alert('Erro ao excluir foto. Tente novamente.');
        }
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

// Fechar modais ao clicar fora
window.onclick = function(event) {
    const viewModal = document.getElementById('viewModal');
    const formModal = document.getElementById('formModal');
    if (event.target == viewModal) closeModal('viewModal');
    if (event.target == formModal) closeModal('formModal');
}

// Atalhos de teclado
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

// ========== LOGOUT ==========
function logout() {
    if (confirm('É você que quer sair? 🌹')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('login_time');
        window.location.href = 'login.html';
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    createPetals();
    loadPhotos();
});
