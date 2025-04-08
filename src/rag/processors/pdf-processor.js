/**
 * Process a PDF file and extract its text content
 * @param {File} file - The PDF file
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromPDF(file) {
  // This function relies on PDF.js, which needs to be included in your extension
  // You can include it via CDN or bundle it with your extension

  // For this example, we'll load PDF.js from CDN
  if (!window.pdfjsLib) {
    await loadPDFJS();
  }

  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);

    // Load the PDF document
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
      .promise;

    // Extract text from each page
    let fullText = `PDF: ${file.name}\nPages: ${pdf.numPages}\n\n`;

    // Process up to first 20 pages to avoid excessive processing
    const pagesToProcess = Math.min(pdf.numPages, 20);
    fullText += `Processing ${pagesToProcess} of ${pdf.numPages} pages.\n\n`;

    // Extract text from pages
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
  } catch (error) {
    console.error("Error processing PDF:", error);
    return `Failed to process PDF: ${file.name}\nError: ${error.message}`;
  }
}

/**
 * Read a file as ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load PDF.js library dynamically
 */
async function loadPDFJS() {
  // Define PDF.js version
  const PDFJS_VERSION = "2.16.105";

  return new Promise((resolve, reject) => {
    // Create script elements for PDF.js
    const script = document.createElement("script");
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    script.onload = () => {
      // Set worker source
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));

    // Append to document
    document.head.appendChild(script);
  });
}
