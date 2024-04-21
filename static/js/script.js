// 从 localStorage 获取已保存的 API Token 和过期时间
const savedToken = localStorage.getItem('apiToken');
const expirationTime = localStorage.getItem('apiTokenExpiration');

// 检查 API Token 是否过期
const currentTime = new Date().getTime();
if (expirationTime && !isNaN(expirationTime) && currentTime > parseInt(expirationTime)) {
    // 如果过期,清除已保存的 API Token
    localStorage.removeItem('apiToken');
    localStorage.removeItem('apiTokenExpiration');
    savedToken = null;
}

// 如果有已保存且未过期的 API Token,则设置为默认值
if (savedToken) {
    document.getElementById('token-input').value = savedToken;
    window.apiToken = savedToken;
}

// 保存 API Token 到 localStorage,并设置过期时间为 1 天后
document.getElementById('save-token-btn').addEventListener('click', () => {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();
    if (token) {
        const now = new Date();
        const expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const expirationTime = expirationDate.getTime();
        localStorage.setItem('apiToken', token);
        localStorage.setItem('apiTokenExpiration', expirationTime);
        window.apiToken = token;
        showToast('API Token 已保存,将在 1 天后过期', 'success');
    } else {
        showToast('请输入有效的 API Token', 'error');
    }
});

document.getElementById('synthesize-btn').addEventListener('click', synthesizeSpeech);
document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteAudio));

function synthesizeSpeech() {
    const textInput = document.getElementById('text-input');
    const text = textInput.value.trim();

    if (!text) {
        textInput.classList.add('is-invalid');
        return;
    }

    textInput.classList.remove('is-invalid');

    const voice = document.getElementById('voice-select').value;
    const responseFormat = document.getElementById('format-select').value;
    const speed = document.getElementById('speed-input').value;
    const model = document.getElementById('model-select').value;
    const token = window.apiToken || document.getElementById('token-input').value;

    // 显示进度条模态框
    const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    progressModal.show();

    fetch('/synthesize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            voice: voice,
            response_format: responseFormat,
            speed: speed,
            model: model,
            token: token
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            refreshAudioList(); // 刷新音频列表
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('合成音频时发生错误,请稍后重试', 'error');
    })
    .finally(() => {
        progressModal.hide();
    });
}

function deleteAudio(event) {
    const filename = event.target.dataset.filename;
    fetch('/delete/' + filename, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            event.target.closest('.audio-item').remove();
            refreshAudioList(); // 先刷新列表
            showToast(data.data.message, 'success'); // 再显示提示
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('删除音频文件时发生错误,请稍后重试', 'error');
    });
}

function refreshAudioList() {
    fetch('/audio-list')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const audioList = document.getElementById('audio-list');
                audioList.innerHTML = '';
                data.data.forEach(filename => {
                    const listItem = `
                        <li class="audio-item">
                            <div class="audio-item-info">
                                <i class="bi bi-music-note-beamed me-3"></i>
                                <span class="audio-name">${filename}</span>
                            </div>
                            <div class="audio-item-controls">
                                <audio src="/static/audio/${filename}" controls></audio>
                                <div class="audio-item-actions">
                                    <a href="/download/${filename}" class="btn btn-primary btn-sm me-2">
                                        <i class="bi bi-download me-1"></i>下载
                                    </a>
                                    <button class="btn btn-danger btn-sm delete-btn" data-filename="${filename}">
                                        <i class="bi bi-trash me-1"></i>删除
                                    </button>
                                </div>
                            </div>
                        </li>
                    `;
                    audioList.insertAdjacentHTML('beforeend', listItem);
                });
                document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteAudio));
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('获取音频列表时发生错误,请稍后重试', 'error');
        });
}

function showToast(message, status) {
    const toastElement = document.createElement('div');
    toastElement.classList.add('toast', 'align-items-center', 'border-0');

    if (status === 'success') {
        toastElement.classList.add('text-white', 'bg-success');
    } else {
        toastElement.classList.add('text-white', 'bg-danger');
    }

    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toastElement);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}