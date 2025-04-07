import { _escapeHtml, escapeHTML } from "./escape-html.js";

export function highlightCSS(code) {
  // Basic CSS highlighting with improved regex
  let escaped = escapeHTML(code);

  // Selectors - improved to handle more complex selectors
  escaped = escaped.replace(
    /([a-zA-Z0-9\-_.:*#[\]=^~>+,\s]+)(\s*\{)/g,
    '<span class="token selector">$1</span>$2'
  );

  // Properties - improved to handle more whitespace variations
  escaped = escaped.replace(
    /(\{|\;)(\s*)([a-zA-Z\-]+)(\s*:)/g,
    '$1$2<span class="token property">$3</span>$4'
  );

  // Values - improved to capture various value formats
  escaped = escaped.replace(
    /(:)(\s*)([^;{}]+)(\s*)([\;}])/g,
    '$1$2<span class="token value">$3</span>$4$5'
  );

  return escaped;
}

export function highlightHTML(code) {
  // Basic HTML highlighting with improved regex
  let escaped = escapeHTML(code);

  // Tags - improved to handle more complex tag structures
  escaped = escaped.replace(
    /(&lt;[\/]?[a-zA-Z0-9\-]+(?:\s+[a-zA-Z0-9\-]+(?:=(?:".*?"|'.*?'|[^'">\s]+))?)*\s*[\/]?&gt;)/g,
    '<span class="token tag">$1</span>'
  );

  // Attributes - improved to capture attribute names and values correctly
  escaped = escaped.replace(
    /(\s+)([a-zA-Z0-9\-]+)(=)(?:"(.*?)"|'(.*?)'|([^'">\s]+))/g,
    '$1<span class="token attr-name">$2</span>$3<span class="token attr-value">"$4$5$6"</span>'
  );

  return escaped;
}

export function highlightJavaScript(code) {
  // First escape HTML to prevent XSS
  let escaped = escapeHTML(code);

  // Define patterns for syntax elements with improved regex
  const patterns = [
    // Comments - fixed to handle both inline and multi-line comments
    {
      pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      className: "comment",
    },
    // Strings - improved to handle all types of quotes
    {
      pattern: /(['"`])(?:(?!\1)[^\\]|\\[\s\S])*\1/g,
      className: "string",
    },
    // Numbers - improved to handle more number formats
    {
      pattern:
        /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
      className: "number",
    },
    // Keywords - comprehensive list of JavaScript keywords
    {
      pattern:
        /\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await|of|let)\b/g,
      className: "keyword",
    },
    // Function names - improved to handle various function declaration patterns
    {
      pattern: /\b([a-zA-Z_$][\w$]*)\s*\(/g,
      replacer: (match, name) => {
        return `<span class="token function">${name}</span>(`;
      },
    },
    // Class names - captures Pascal case identifiers
    {
      pattern: /\b([A-Z][\w$]*)\b/g,
      className: "class-name",
    },
    // Operators - comprehensive list of JavaScript operators
    {
      pattern: /[=!<>]=?|[+\-*/%&|^~?:]=?|\.{3}|\.\.\.|\.(?=\w)|=>|\+\+|--/g,
      className: "operator",
    },
  ];

  // Apply all patterns
  patterns.forEach(({ pattern, className, replacer }) => {
    if (replacer) {
      escaped = escaped.replace(pattern, replacer);
    } else {
      escaped = escaped.replace(
        pattern,
        `<span class="token ${className}">$&</span>`
      );
    }
  });

  return escaped;
}

export function highlightPython(code) {
  // First escape HTML to prevent XSS
  let escaped = escapeHTML(code);

  // Define patterns for syntax elements with improved regex
  const patterns = [
    // Comments - fixed to handle Python comments correctly
    {
      pattern: /(#.*$)/gm,
      className: "comment",
    },
    // Triple-quoted strings (docstrings) - improved to handle both quote types
    {
      pattern: /('''[\s\S]*?'''|"""[\s\S]*?""")/g,
      className: "string",
    },
    // Regular strings - improved to handle both quote types and escapes
    {
      pattern: /(['"])(?:(?!\1)[^\\]|\\[\s\S])*\1/g,
      className: "string",
    },
    // Numbers - improved to handle more number formats
    {
      pattern:
        /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
      className: "number",
    },
    // Keywords - comprehensive list of Python keywords
    {
      pattern:
        /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|False|None|True)\b/g,
      className: "keyword",
    },
    // Function definitions - improved to capture function names correctly
    {
      pattern: /\b(def)\s+([a-zA-Z_]\w*)/g,
      replacer: (match, keyword, name) => {
        return `<span class="token keyword">${keyword}</span> <span class="token function">${name}</span>`;
      },
    },
    // Class definitions - improved to capture class names correctly
    {
      pattern: /\b(class)\s+([a-zA-Z_]\w*)/g,
      replacer: (match, keyword, name) => {
        return `<span class="token keyword">${keyword}</span> <span class="token class-name">${name}</span>`;
      },
    },
    // Function calls - improved to handle function calls correctly
    {
      pattern: /\b([a-zA-Z_]\w*)\s*\(/g,
      replacer: (match, name) => {
        return `<span class="token function">${name}</span>(`;
      },
    },
    // Built-in functions - comprehensive list of Python built-in functions
    {
      pattern:
        /\b(?:abs|all|any|ascii|bin|bool|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip)\b(?=\s*\()/g,
      className: "function",
    },
  ];

  // Apply all patterns
  patterns.forEach(({ pattern, className, replacer }) => {
    if (replacer) {
      escaped = escaped.replace(pattern, replacer);
    } else {
      escaped = escaped.replace(
        pattern,
        `<span class="token ${className}">$&</span>`
      );
    }
  });

  return escaped;
}

// export function detectLanguage(codeBlock) {
//   // Improve language detection by checking first few lines
//   const lines = codeBlock.split("\n");
//   const firstLine = lines[0].trim().toLowerCase();

//   // Check for language indicators in first line
//   if (
//     firstLine.includes("javascript") ||
//     firstLine.includes("js") ||
//     /function\s+\w+\s*\(/.test(codeBlock) ||
//     (/const|let|var/.test(codeBlock) && /[{}]/.test(codeBlock))
//   ) {
//     return "javascript";
//   } else if (
//     firstLine.includes("python") ||
//     firstLine.includes("py") ||
//     /def\s+\w+\s*\(/.test(codeBlock) ||
//     (/import\s+\w+/.test(codeBlock) && /:/.test(codeBlock))
//   ) {
//     return "python";
//   } else if (
//     firstLine.includes("html") ||
//     /<html|<body|<div|<p>/.test(codeBlock)
//   ) {
//     return "html";
//   } else if (
//     firstLine.includes("css") ||
//     /{[\s\S]*?:[\s\S]*?;[\s\S]*?}/.test(codeBlock)
//   ) {
//     return "css";
//   }

//   // Improved fallback detection based on code patterns
//   if (
//     /{[\s\S]*?}/.test(codeBlock) &&
//     /[\w-]+\s*:\s*[\w-]+\s*;/.test(codeBlock)
//   ) {
//     return "css";
//   } else if (/<[^>]+>/.test(codeBlock)) {
//     return "html";
//   } else if (/function|var|let|const|=>/.test(codeBlock)) {
//     return "javascript";
//   } else if (/def |class |import |from .*? import/.test(codeBlock)) {
//     return "python";
//   }

//   // Default to plain text if language can't be determined
//   return "";
// }

export function detectLanguage(codeBlock) {
  if (
    /javascript/i.test(codeBlock) ||
    /function\s+\w+\s*\(/.test(codeBlock) ||
    (/(const|let|var)/.test(codeBlock) && /[{}]/.test(codeBlock))
  ) {
    return "javascript";
  } else if (
    /python/i.test(codeBlock) ||
    /def\s+\w+\s*\(/.test(codeBlock) ||
    (/import\s+\w+/.test(codeBlock) && /:/.test(codeBlock))
  ) {
    return "python";
  } else if (
    /html/i.test(codeBlock) ||
    /<\s*(html|body|div|p)[^>]*>/.test(codeBlock)
  ) {
    return "html";
  } else if (
    /css/i.test(codeBlock) ||
    /{[\s\S]*?:[\s\S]*?;[\s\S]*?}/.test(codeBlock) ||
    /[\w-]+\s*:\s*[\w-]+\s*;/.test(codeBlock)
  ) {
    return "css";
  }
  return "";
}
