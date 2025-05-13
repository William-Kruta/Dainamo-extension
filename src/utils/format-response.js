import { escapeHTML, _escapeHtml } from "./escape-html.js";
import {
  highlightCSS,
  highlightHTML,
  highlightJavaScript,
  highlightPython,
  detectLanguage,
} from "./syntax-highlight.js";

export function formatBotResponse(text) {
  console.log(`Text: ${text}`);
  const reasoning = formatReasoningText(text);
  const response = formatResponseText(text);
  let data = {
    reasoning,
    response,
  };

  //data["response"] = formatTextDynamically(data["response"]);
  // First, detect and convert URLs to clickable links
  //data["response"] = formatTextWithLinks(data["response"], "message-link");

  // Format any bold text.
  data["response"] = formatBoldText(data["response"]);

  // const urlRegex = /(https?:\/\/[^\s]+)/g;
  // data["response"] = data["response"].replace(urlRegex, function (url) {
  //   return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  // });

  // Convert line breaks to <br>
  //formattedText = formattedText.replace(/\n/g, "<br>");
  console.log(JSON.stringify(data, null, 2));

  return data;
}

function formatResponseText(text) {
  const response = text.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  const htmlFriendlyText = response.replace(/\n/g, "<br>");
  return htmlFriendlyText;
}

function formatReasoningText(text) {
  const reasoningMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "";
  return reasoning;
}

function formatBoldText(text) {
  const regex = /\*\*([^\*]+)\*\*/g;
  const htmlText = text.replace(regex, "<b>$1</b>");
  return htmlText;
}

function formatTextWithLinks(text, className) {
  const classAttribute = className ? ` class="${className}"` : "";
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  const urlRegex =
    /\b(?:https?|ftp):\/\/[\w-]+(?:\.[\w-]+)*(?:[\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/g;
  const htmlText1 = text.replace(
    linkRegex,
    `<a href="$2"${classAttribute}>$1</a>`
  );
  const htmlText2 = htmlText1.replace(
    urlRegex,
    `<a href="$&"${classAttribute}>$&</a>`
  );

  return htmlText2;
}

function formatTextDynamically(rawText) {
  let formattedText = rawText;

  const listItemInlineRegex = /([^\n])([ \t]*)([-*+]|\d+\.)([ \t])/g;
  formattedText = formattedText.replace(listItemInlineRegex, "$1\n$2$3$4");

  const firstListItemLineRegex = /^[ \t]*([-*+]|\d+\.)[ \t]/m;
  const match = formattedText.match(firstListItemLineRegex);

  if (match) {
    const firstMatchIndex = match.index;
    // Get the text *before* the first identified list item line.
    const textBefore = formattedText.substring(0, firstMatchIndex);

    // If the text before exists and doesn't end with two or more newlines,
    // or if the text before is just whitespace but not \n\n,
    // prepend a blank line before the list item.
    if (
      textBefore.length > 0 &&
      !/\n\n[\s\S]*$/.test(textBefore) &&
      !/^\s*$/.test(textBefore)
    ) {
      // Remove potential single newline added by Step 1 at the join point if needed
      let cleanedTextBefore = textBefore.endsWith("\n")
        ? textBefore.slice(0, -1)
        : textBefore;
      formattedText =
        cleanedTextBefore + "\n\n" + formattedText.substring(firstMatchIndex);
    } else if (/^\s*$/.test(textBefore) && !textBefore.startsWith("\n\n")) {
      // If the text before is only whitespace but doesn't start with \n\n
      formattedText = "\n\n" + formattedText.trimStart(); // Just prepend and trim original leading whitespace
    }
    // If text before already ends with \n\n, or is empty, do nothing (already formatted).
  }
  formattedText = formattedText.replace(/^\n\n\n+/, "\n\n");

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
