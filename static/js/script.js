// 从 localStorage 获取已保存的 API Token 和过期时间
const savedToken = localStorage.getItem('apiToken');
const expirationTime = localStorage.getItem('apiTokenExpiration');

// 检查 API Token 是否过期
const currentTime = new Date().getTime();
if (expirationTime && currentTime > expirationTime) {
    // 如果过期，清除已保存的 API Token
    localStorage.removeItem('apiToken');
    localStorage.removeItem('apiTokenExpiration');
    savedToken = null;
}

// 如果有已保存且未过期的 API Token，则设置为默认值
if (savedToken) {
    document.getElementById('token-input').value = savedToken;
    window.apiToken = savedToken;
}

// 保存 API Token 到 localStorage，并设置过期时间为 1 天后
document.getElementById('save-token-btn').addEventListener('click', () => {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();
    if (token) {
        const expirationTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 1 天后的时间戳
        localStorage.setItem('apiToken', token);
        localStorage.setItem('apiTokenExpiration', expirationTime);
        window.apiToken = token;
        alert('API Token 已保存，将在 1 天后过期');
    } else {
        alert('请输入有效的 API Token');
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
        const filename = data.filename;
        const listItem = `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <i class="bi bi-music-note-beamed me-3"></i>
                    <span>${filename}</span>
                </div>
                <div class="d-flex align-items-center">
                    <audio src="/static/audio/${filename}" controls></audio>
                    <a href="/download/${filename}" class="btn btn-sm btn-outline-primary ms-2">下载</a>
                    <button class="btn btn-sm btn-outline-danger ms-2 delete-btn" data-filename="${filename}">删除</button>
                </div>
            </li>
        `;
        document.getElementById('audio-list').insertAdjacentHTML('beforeend', listItem);
        document.querySelector(`button[data-filename="${filename}"]`).addEventListener('click', deleteAudio);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('合成音频时发生错误，请稍后重试');
    })
    .finally(() => {
        // 隐藏进度条模态框
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
        alert(data.message);
        event.target.closest('.list-group-item').remove();
    });
}