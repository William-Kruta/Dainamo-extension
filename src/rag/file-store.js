/**
 * Creates a store for managing files for RAG
 */
export function createFileStore() {
  const STORAGE_KEY = "rag_files";

  /**
   * Add a file to storage
   */
  async function addFile(fileId, content, metadata) {
    const files = await getStoredFiles();
    files[fileId] = {
      content,
      metadata,
      created: Date.now(),
    };
    await saveFiles(files);
    return true;
  }

  /**
   * Get a file from storage
   */
  async function getFile(fileId) {
    const files = await getStoredFiles();
    return files[fileId] || null;
  }

  /**
   * List all files in storage
   */
  async function listFiles() {
    const files = await getStoredFiles();
    return Object.entries(files).map(([fileId, data]) => ({
      fileId,
      metadata: data.metadata,
      created: data.created,
    }));
  }

  /**
   * Delete a file from storage
   */
  async function deleteFile(fileId) {
    const files = await getStoredFiles();
    if (files[fileId]) {
      delete files[fileId];
      await saveFiles(files);
      return true;
    }
    return false;
  }

  /**
   * Retrieve all stored files
   */
  async function getStoredFiles() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || {});
      });
    });
  }

  /**
   * Save files to storage
   */
  async function saveFiles(files) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: files }, resolve);
    });
  }

  return {
    addFile,
    getFile,
    listFiles,
    deleteFile,
  };
}
