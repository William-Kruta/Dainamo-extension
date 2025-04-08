import { listFiles, getFileContent } from "./file-handler.js";

/**
 * Process a user query using RAG
 * @param {string} query - The user's query
 * @returns {Promise<{enhancedPrompt: string, usedFiles: Array}>}
 */
export async function processQueryWithRAG(query) {
  // Get list of all files
  const files = await listFiles();

  if (files.length === 0) {
    return {
      enhancedPrompt: query,
      usedFiles: [],
    };
  }

  // Simple keyword matching for relevant files
  // In a real implementation, you'd use embeddings and vector search
  const relevantFiles = files.filter((file) => {
    // Simple relevance check - can be replaced with more sophisticated methods
    const keywords = query.toLowerCase().split(" ");
    const fileName = file.metadata.fileName.toLowerCase();
    return keywords.some(
      (keyword) => keyword.length > 3 && fileName.includes(keyword)
    );
  });

  // If no relevant files found, use the most recent files
  const filesToUse =
    relevantFiles.length > 0
      ? relevantFiles.slice(0, 3) // Use top 3 relevant files
      : files.sort((a, b) => b.created - a.created).slice(0, 2); // Use 2 most recent

  // Fetch content of selected files
  const usedFiles = [];
  let contextContent = "";

  for (const file of filesToUse) {
    const fileData = await getFileContent(file.fileId);
    if (fileData && fileData.content) {
      // Add file content to context
      contextContent += `\n--- File: ${file.metadata.fileName} ---\n`;

      // Limit content length per file to avoid token limits
      const contentPreview =
        fileData.content.slice(0, 2000) +
        (fileData.content.length > 2000 ? "... (truncated)" : "");

      contextContent += contentPreview + "\n";

      usedFiles.push({
        fileId: file.fileId,
        fileName: file.metadata.fileName,
        fileType: file.metadata.fileType,
      });
    }
  }

  // Create enhanced prompt with file context
  const enhancedPrompt = `
Based on the following files:
${contextContent}

User's query: ${query}
  `.trim();

  return {
    enhancedPrompt,
    usedFiles,
  };
}
