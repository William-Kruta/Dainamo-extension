import { processFile, listFiles, deleteFile } from "./file-handler.js";

/**
 * Initialize the file manager UI
 */
export function initializeFileManager() {
  const fileUploadInput = document.getElementById("file-upload");
  const fileUploadStatus = document.getElementById("file-upload-status");
  const filesList = document.getElementById("files-list");
  const clearAllFilesButton = document.getElementById("clear-all-files");
  const ragToggle = document.getElementById("rag-toggle");
  const ragStatusIndicator = document.getElementById("rag-status-indicator");
  const ragStatusText = document.getElementById("rag-status-text");

  // Event listeners
  fileUploadInput.addEventListener("change", handleFileUpload);
  clearAllFilesButton.addEventListener("click", clearAllFiles);
  ragToggle.addEventListener("change", toggleRAG);

  // Initial setup
  loadFilesList();
  initializeRAGStatus();

  /**
   * Handle file uploads
   */
  async function handleFileUpload(event) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    fileUploadStatus.textContent = `Processing ${files.length} file(s)...`;

    const results = [];
    for (const file of files) {
      const result = await processFile(file);
      results.push({
        fileName: file.name,
        success: result.success,
        error: result.error,
      });
    }

    // Show status
    const successCount = results.filter((r) => r.success).length;
    fileUploadStatus.textContent = `Processed ${successCount}/${files.length} files successfully.`;

    // Clear input
    fileUploadInput.value = "";

    // Refresh files list
    loadFilesList();
  }

  /**
   * Load and display file list
   */
  async function loadFilesList() {
    const files = await listFiles();

    if (files.length === 0) {
      filesList.innerHTML =
        '<div class="empty-files-message">No files uploaded yet</div>';
      return;
    }

    // Sort files by newest first
    files.sort((a, b) => b.created - a.created);

    filesList.innerHTML = "";
    files.forEach((file) => {
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";

      const fileTypeIcon = getFileTypeIcon(file.metadata.fileType);

      fileItem.innerHTML = `
        <div class="file-info">
          <span class="file-icon">${fileTypeIcon}</span>
          <span class="file-name">${file.metadata.fileName}</span>
          <span class="file-type">${formatFileSize(file.metadata.size)}</span>
        </div>
        <div class="file-actions">
          <button class="file-action-button delete-file" data-file-id="${
            file.fileId
          }" title="Delete file">
            <span class="icon">❌</span>
          </button>
        </div>
      `;

      filesList.appendChild(fileItem);

      // Add delete event listener
      fileItem
        .querySelector(".delete-file")
        .addEventListener("click", async () => {
          await deleteFile(file.fileId);
          loadFilesList();
        });
    });
  }

  /**
   * Clear all files
   */
  async function clearAllFiles() {
    if (!confirm("Are you sure you want to remove all files?")) {
      return;
    }

    const files = await listFiles();
    for (const file of files) {
      await deleteFile(file.fileId);
    }

    loadFilesList();
    fileUploadStatus.textContent = "All files removed.";
  }

  /**
   * Toggle RAG functionality
   */
  function toggleRAG() {
    const enabled = ragToggle.checked;

    // Update UI
    if (enabled) {
      ragStatusIndicator.className = "status-dot enabled";
      ragStatusText.textContent = "RAG Enabled";
    } else {
      ragStatusIndicator.className = "status-dot disabled";
      ragStatusText.textContent = "RAG Disabled";
    }

    // Save setting
    chrome.storage.local.set({ ragEnabled: enabled });
  }

  /**
   * Initialize RAG status from saved settings
   */
  function initializeRAGStatus() {
    chrome.storage.local.get(["ragEnabled"], (result) => {
      const enabled = result.ragEnabled !== false; // Default to true
      ragToggle.checked = enabled;

      if (enabled) {
        ragStatusIndicator.className = "status-dot enabled";
        ragStatusText.textContent = "RAG Enabled";
      } else {
        ragStatusIndicator.className = "status-dot disabled";
        ragStatusText.textContent = "RAG Disabled";
      }
    });
  }

  /**
   * Get appropriate icon for file type
   */
  function getFileTypeIcon(fileType) {
    if (fileType.includes("csv")) return "📊";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("text")) return "📝";
    return "📁";
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Check if RAG is enabled
 * @returns {Promise<boolean>}
 */
export async function isRAGEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ragEnabled"], (result) => {
      resolve(result.ragEnabled !== false); // Default to true
    });
  });
}

/**
 * Get count of available RAG files
 * @returns {Promise<number>}
 */
export async function getRAGFilesCount() {
  const files = await listFiles();
  return files.length;
}

/**
 * Get a summary of available RAG files
 * @returns {Promise<string>}
 */
export async function getRAGFilesSummary() {
  const files = await listFiles();

  if (files.length === 0) {
    return "No knowledge files available.";
  }

  const fileTypes = {};
  files.forEach((file) => {
    const type = getSimpleFileType(file.metadata.fileType);
    fileTypes[type] = (fileTypes[type] || 0) + 1;
  });

  const summary = Object.entries(fileTypes)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  return `Available knowledge: ${files.length} file${
    files.length > 1 ? "s" : ""
  } (${summary})`;
}

/**
 * Get a simplified file type category
 */
function getSimpleFileType(fileType) {
  if (fileType.includes("csv")) return "CSV";
  if (fileType.includes("image")) return "image";
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("text")) return "text";
  return "document";
}
