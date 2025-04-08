// src/functions/file-handler.js
import { createFileStore } from "./file-store.js";

// Initialize file store
const fileStore = createFileStore();

/**
 * Process uploaded files for RAG functionality
 * @param {File} file - The file to process
 * @returns {Promise<{success: boolean, fileId: string, error: string}>}
 */
export async function processFile(file) {
  try {
    const fileType = file.type;
    const fileName = file.name;
    const fileId = `file-${Date.now()}-${fileName.replace(/[^a-z0-9]/gi, "-")}`;

    // Extract content based on file type
    let extractedContent = "";
    let metadata = {
      fileName,
      fileType,
      uploadDate: new Date().toISOString(),
      size: file.size,
    };

    // Process different file types
    if (fileType.includes("csv") || fileName.endsWith(".csv")) {
      extractedContent = await extractTextFromCSV(file);
    } else if (fileType.includes("image")) {
      extractedContent = await extractTextFromImage(file);
    } else if (fileType.includes("pdf")) {
      extractedContent = await extractTextFromPDF(file);
    } else if (fileType.includes("text") || fileName.endsWith(".txt")) {
      extractedContent = await file.text();
    } else {
      // Default - try to extract as text
      try {
        extractedContent = await file.text();
        metadata.extractionMethod = "default-text";
      } catch (e) {
        metadata.extractionMethod = "failed";
        return {
          success: false,
          error: `Unsupported file type: ${fileType}`,
        };
      }
    }

    // Store the extracted content
    await fileStore.addFile(fileId, extractedContent, metadata);

    return {
      success: true,
      fileId,
      fileType,
      fileName,
    };
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      success: false,
      error: error.message || "Failed to process file",
    };
  }
}

/**
 * Extract text content from CSV files
 */
async function extractTextFromCSV(file) {
  const text = await file.text();
  // Basic CSV parsing - could be improved with a proper CSV parser
  const rows = text.split("\n").map((row) => row.split(","));

  // Convert CSV to a readable text format
  let formattedContent = `CSV Content from ${file.name}:\n\n`;

  // Add headers if present
  if (rows.length > 0) {
    formattedContent += `Headers: ${rows[0].join(", ")}\n\n`;
  }

  // Add data summary
  formattedContent += `Data Rows: ${rows.length - 1}\n\n`;

  // Add sample of content (first 10 rows)
  formattedContent += "Sample Content:\n";
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    formattedContent += `Row ${i}: ${rows[i].join(", ")}\n`;
  }

  return formattedContent;
}

/**
 * Extract text from images using OCR
 * Requires browser extension API access or a service
 */
async function extractTextFromImage(file) {
  // For images, you'll need OCR capabilities
  // This is a placeholder - you'll need to implement actual OCR
  // Options:
  // 1. Use a cloud OCR service with API (Google Vision, Azure, etc.)
  // 2. Use a JS-based OCR like Tesseract.js

  // Create a placeholder for now
  const imageUrl = URL.createObjectURL(file);
  return `Image file: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\nContent requires OCR processing.\nReference URL: ${imageUrl}`;
}

/**
 * Extract text from PDF files
 */
async function extractTextFromPDF(file) {
  // PDF extraction would require a library like pdf.js
  // This is a placeholder
  return `PDF file: ${file.name}\nSize: ${file.size} bytes\nContent requires PDF extraction.`;
}

/**
 * Retrieve file content for RAG
 * @param {string} fileId - The ID of the file to retrieve
 * @returns {Promise<{content: string, metadata: object}>}
 */
export async function getFileContent(fileId) {
  return await fileStore.getFile(fileId);
}

/**
 * List all files stored for RAG
 * @returns {Promise<Array<{fileId: string, metadata: object}>>}
 */
export async function listFiles() {
  return await fileStore.listFiles();
}

/**
 * Delete a file from the RAG store
 * @param {string} fileId - The ID of the file to delete
 * @returns {Promise<boolean>}
 */
export async function deleteFile(fileId) {
  return await fileStore.deleteFile(fileId);
}
