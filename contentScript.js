// function extractPageContent() {
//   // Get the page title
//   const title = document.title;

//   // Create a new element to hold the content for processing
//   const contentHolder = document.createElement("div");

//   // Clone the body to avoid modifying the actual page
//   contentHolder.appendChild(document.body.cloneNode(true));

//   // Remove scripts, styles, iframes, and other non-content elements
//   const elementsToRemove = contentHolder.querySelectorAll(
//     'script, style, iframe, noscript, svg, canvas, video, audio, [aria-hidden="true"], .hidden, [style*="display: none"]'
//   );
//   elementsToRemove.forEach((el) => el.remove());

//   // Get text content, removing excessive whitespace
//   let content = contentHolder.textContent || "";
//   content = content.replace(/\s+/g, " ").trim();

//   // Limit content length (to avoid performance issues)
//   const maxLength = 10000;
//   if (content.length > maxLength) {
//     content =
//       content.substring(0, maxLength) +
//       "... [content truncated for performance]";
//   }

//   return { title, content };
// }

// // Listen for messages from the extension
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "extractPageContent") {
//     const { title, content } = extractPageContent();
//     sendResponse({ content, title });
//   }
//   return true;
// });

console.log("Dainamo content extraction script loaded");
