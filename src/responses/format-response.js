import { escapeHTML, _escapeHtml } from "../utils/escape-html.js";
import {
  highlightCSS,
  highlightHTML,
  highlightJavaScript,
  highlightPython,
  detectLanguage,
} from "../utils/syntax-highlight.js";

export function formatBotResponse(text) {
  console.log(`Text: ${text}`);
  const reasoningMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "";
  const response = text.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  let data = {
    reasoning,
    response,
  };
  // First, detect and convert URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  data["response"] = data["response"].replace(urlRegex, function (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  });

  // Convert line breaks to <br>
  //formattedText = formattedText.replace(/\n/g, "<br>");
  console.log(JSON.stringify(data, null, 2));

  return data;
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
