async function refreshFiles() {
  const response = await fetch('/api/files');
  const files = await response.json();
  const list = document.getElementById('fileList');
  list.innerHTML = '';

  if (!files.length) {
    list.innerHTML = '<div class="file-item">No files yet. Upload one from this page or from your phone.</div>';
    return;
  }

  files.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <strong>${file.displayName}</strong><br />
      <span>${(file.size / 1024 / 1024).toFixed(2)} MB</span><br />
      <a href="${file.downloadUrl}" target="_blank" rel="noreferrer">Download</a>
    `;
    list.appendChild(item);
  });
}

function showAddress() {
  const addressText = document.getElementById('addressText');
  const origin = window.location.origin;
  addressText.textContent = origin;
}

window.addEventListener('DOMContentLoaded', async () => {
  showAddress();
  await refreshFiles();

  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');
  const statusMessage = document.getElementById('statusMessage');

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const selectedFile = fileInput.files[0];
    if (!selectedFile) {
      statusMessage.textContent = 'Please choose an image or video first.';
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      statusMessage.textContent = 'Uploading...';
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Upload failed');
      }

      statusMessage.textContent = `${payload.file.displayName} uploaded successfully.`;
      fileInput.value = '';
      await refreshFiles();
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });

  setInterval(refreshFiles, 3000);
});
