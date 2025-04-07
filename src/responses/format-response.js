import { escapeHTML, _escapeHtml } from "../utils/escape-html.js";
import {
  highlightCSS,
  highlightHTML,
  highlightJavaScript,
  highlightPython,
  detectLanguage,
} from "../utils/syntax-highlight.js";

export function formatBotResponse(text) {
  // First, detect and convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let formattedText = text.replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  });

  // Process markdown-style code blocks
  formattedText = formattedText.replace(
    /```([\s\S]*?)```/g,
    function (match, code) {
      return `<pre><code>${escapeHTML(code)}</code></pre>`;
    }
  );

  // Process inline code
  formattedText = formattedText.replace(/`([^`]+)`/g, function (match, code) {
    return `<code>${escapeHTML(code)}</code>`;
  });

  // Convert line breaks to <br>
  formattedText = formattedText.replace(/\n/g, "<br>");

  return formattedText;
}

export function formatMessageWithCodeBlocks(message) {
  // Regex to match code blocks with optional language specification
  // The issue might be in this regex - it needs to properly capture both the language and code
  const codeBlockRegex = /```([a-zA-Z0-9+\-.]*)\n?([\s\S]*?)\n?```/g;
  const inlineCodeRegex = /`([^`]+)`/g;

  // Process code blocks first
  const messageWithCodeBlocks = message.replace(
    codeBlockRegex,
    (match, language = "", code) => {
      language = language.toLowerCase().trim();

      // If no language is specified, try to detect it
      if (!language) {
        language = detectLanguage(code);
      }
      console.log("Detected language:", language);
      let highlightedCode;

      // Apply syntax highlighting based on language
      switch (language) {
        case "javascript":
        case "js":
          highlightedCode = highlightJavaScript(code);
          language = "javascript";
          break;
        case "python":
        case "py":
          highlightedCode = highlightPython(code);
          language = "python";
          break;
        case "html":
          highlightedCode = highlightHTML(code);
          break;
        case "css":
          highlightedCode = highlightCSS(code);
          break;
        default:
          // For unknown languages, just escape HTML
          highlightedCode = escapeHTML(code);
          break;
      }

      return `<pre><code class="language-${language}">${highlightedCode}</code></pre>`;
    }
  );

  // Then process inline code
  const formattedMessage = messageWithCodeBlocks.replace(
    inlineCodeRegex,
    (match, code) => `<code class="custom inline">${escapeHTML(code)}</code>`
  );

  // Process URLs, but avoid processing URLs inside already processed HTML tags
  const urlRegex = /(https?:\/\/[^\s<>"']+)(?![^<>]*(?:<\/a>|>))/g;
  const messageWithLinks = formattedMessage.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  });

  return messageWithLinks;
}
