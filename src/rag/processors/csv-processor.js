/**
 * Parse CSV content and extract structured data
 * @param {string} csvContent - Raw CSV content as string
 * @returns {Object} - Parsed CSV with headers and rows
 */
export function parseCSV(csvContent) {
  // Split into lines and handle different line endings
  const lines = csvContent.split(/\r\n|\n|\r/);

  // Remove empty lines
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse CSV properly (handling quoted values with commas)
  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        // End of field
        result.push(current);
        current = "";
      } else {
        // Add character to current field
        current += char;
      }
    }

    // Add the last field
    result.push(current);

    // Clean up quotes from fields
    return result.map((field) => {
      field = field.trim();
      // Remove surrounding quotes
      if (field.startsWith('"') && field.endsWith('"')) {
        field = field.substring(1, field.length - 1);
      }
      // Replace double quotes with single quotes (CSV escape for quotes)
      return field.replace(/""/g, '"');
    });
  };

  // Extract headers and rows
  const headers = parseCSVLine(nonEmptyLines[0]);
  const rows = nonEmptyLines.slice(1).map(parseCSVLine);

  return { headers, rows };
}

/**
 * Convert CSV data to a summarized text representation for RAG
 * @param {Object} csvData - Parsed CSV data with headers and rows
 * @param {string} fileName - Name of the CSV file
 * @returns {string} - Text representation for RAG
 */
export function csvToText(csvData, fileName) {
  const { headers, rows } = csvData;

  let textContent = `CSV File: ${fileName}\n\n`;

  // Add headers
  textContent += `Headers: ${headers.join(", ")}\n\n`;

  // Add data summary
  textContent += `Total Rows: ${rows.length}\n`;

  // Calculate some basic statistics if numeric columns exist
  const numericColumns = [];

  // Check first few rows to identify numeric columns
  const sampleRows = rows.slice(0, Math.min(5, rows.length));
  headers.forEach((header, index) => {
    const isNumeric = sampleRows.every((row) => {
      if (index >= row.length) return false;
      const value = row[index].trim();
      return !isNaN(parseFloat(value)) && isFinite(value);
    });

    if (isNumeric) numericColumns.push(index);
  });

  // Add statistics for numeric columns
  if (numericColumns.length > 0) {
    textContent += "\nNumeric Column Statistics:\n";

    numericColumns.forEach((colIndex) => {
      const values = rows
        .map((row) => parseFloat(row[colIndex]))
        .filter((val) => !isNaN(val));

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        textContent += `Column "${headers[colIndex]}": Avg=${avg.toFixed(
          2
        )}, Min=${min}, Max=${max}, Count=${values.length}\n`;
      }
    });

    textContent += "\n";
  }

  // Add sample rows (first 10)
  textContent += "Sample Rows:\n";
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    textContent += `Row ${i + 1}: `;
    textContent += headers
      .map((header, index) => `${header}=${rows[i][index] || ""}`)
      .join(", ");
    textContent += "\n";
  }

  return textContent;
}

/**
 * Process a CSV file completely
 * @param {File} file - The CSV file to process
 * @returns {Promise<string>} - Processed text content for RAG
 */
export async function processCSVFile(file) {
  try {
    const content = await file.text();
    const parsedCSV = parseCSV(content);
    return csvToText(parsedCSV, file.name);
  } catch (error) {
    console.error("Error processing CSV:", error);
    return `Failed to process CSV file: ${file.name}\nError: ${error.message}`;
  }
}
