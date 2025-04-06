// background.js

// Register the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let contentAwarenessEnabled = false;

// Load initial state
chrome.storage.local.get(["contentAwarenessEnabled"], (result) => {
  contentAwarenessEnabled = !!result.contentAwarenessEnabled; // Ensure boolean
  console.log(
    "Initial contentAwarenessEnabled state:",
    contentAwarenessEnabled
  );
  updateContextMenuToggle(); // Update menu on load
});

// --- Function to be injected into the page ---
function extractPageContentForInjection() {
  // Get the page title
  const title = document.title;

  // Create a new element to hold the content for processing
  const contentHolder = document.createElement("div");

  // Clone the body to avoid modifying the actual page
  if (document.body) {
    // Check if body exists
    contentHolder.appendChild(document.body.cloneNode(true));
  } else {
    return { title: title, content: "[Page has no body content]", error: null };
  }

  // Remove scripts, styles, iframes, and other non-content elements
  const elementsToRemove = contentHolder.querySelectorAll(
    'script, style, iframe, noscript, svg, canvas, video, audio, [aria-hidden="true"], .hidden, [style*="display: none"], nav, footer, header, aside' // Added common layout tags
  );
  elementsToRemove.forEach((el) => el.remove());

  // Get text content, removing excessive whitespace
  let content = contentHolder.textContent || "";
  content = content.replace(/\s+/g, " ").trim();

  // Limit content length (to avoid performance issues)
  const maxLength = 10000; // Keep your desired limit
  if (content.length > maxLength) {
    content =
      content.substring(0, maxLength) +
      "... [content truncated for performance]";
  }

  return { title: title, content: content, error: null }; // Return structured data
}
// --- End of injectable function ---

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Update context menu toggle title based on current state
function updateContextMenuToggle() {
  chrome.contextMenus
    .update("toggleContentAwareness", {
      title: contentAwarenessEnabled
        ? "✓ Page Context: ON"
        : "✗ Page Context: OFF",
    })
    .catch((e) =>
      console.warn("Error updating context menu (might not exist yet):", e)
    );
}

// Create context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askOllama",
    title: "Research '%s'",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "buffetAnalysis",
    title: "Buffet Analysis",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "toggleContentAwareness",
    title: contentAwarenessEnabled
      ? "✓ Page Context: ON"
      : "✗ Page Context: OFF", // Initial title
    contexts: ["action"], // Show on extension icon right-click
  });
});

// Message Listener (Combined for clarity)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.action);

  // --- Get page content (Refactored) ---
  if (message.action === "getPageContent" && contentAwarenessEnabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) {
        console.error("getPageContent: No active tab found.");
        sendResponse({
          content: null,
          title: null,
          url: null,
          error: "No active tab found",
        });
        return true;
      }
      const activeTab = tabs[0];
      console.log(tabs);
      console.log(`Active Tab: ${activeTab.url}`);

      // Prevent injection into restricted URLs
      if (
        !activeTab.url ||
        activeTab.url.startsWith("chrome://") ||
        activeTab.url.startsWith("file://") /* Add others like about: */
      ) {
        console.warn(
          `getPageContent: Cannot inject script into restricted URL: ${activeTab.url}`
        );
        sendResponse({
          content: null,
          title: activeTab.title,
          url: activeTab.url,
          error: "Cannot access content from this page type.",
        });
        return true;
      }

      console.log(`getPageContent: Executing script on tab ${activeTab.id}`);
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: extractPageContentForInjection, // Inject the function
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            console.error(
              `getPageContent: Script injection failed for tab ${activeTab.id}:`,
              chrome.runtime.lastError.message
            );
            sendResponse({
              content: null,
              title: activeTab.title,
              url: activeTab.url,
              error: `Failed to execute script: ${chrome.runtime.lastError.message}`,
            });
            return;
          }

          if (
            injectionResults &&
            injectionResults.length > 0 &&
            injectionResults[0].result
          ) {
            const pageData = injectionResults[0].result;
            console.log(`getPageContent: Success from tab ${activeTab.id}`);
            sendResponse({
              content: pageData.content,
              title: pageData.title,
              url: activeTab.url,
              error: pageData.error, // Include error if function returned one
            });
          } else {
            console.warn(
              `getPageContent: Script execution returned no result for tab ${activeTab.id}.`
            );
            sendResponse({
              content: null,
              title: activeTab.title,
              url: activeTab.url,
              error: "Failed to retrieve content from page.",
            });
          }
        }
      );
    });
    return true; // Indicate async response
  } else if (message.action === "performGoogleSearch") {
    const query = encodeURIComponent(message.query);

    chrome.search;
    const searchUrl = `https://www.bing.com/search?q=${query}`;
    console.log(`Search Url: ${searchUrl}`);
    // Using DuckDuckGo's Instant Answer API
    fetch(searchUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search API returned ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Extract abstract and related topics
        console.log(`Data222: ${JSON.stringify(data, null, 2)}`);
        let searchResults = [];

        // Default to answer if available, otherwise use abstract text
        if (data.Answer) {
          searchResults.push(`Answer: ${data.Answer}`);
        } else {
          if (data.AbstractText) {
            searchResults.push(`Abstract: ${data.AbstractText}`);
          }
        }

        // Add related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
          const topics = data.RelatedTopics.filter((topic) => topic.Text) // Only topics with text
            .slice(0, 4) // Limit to 4 topics
            .map((topic) => topic.Text);

          searchResults = [...searchResults, ...topics];
        }

        // Send response back to caller
        sendResponse({
          snippets:
            searchResults.length > 0
              ? searchResults.join("\n\n")
              : "No relevant search results found",
        });
      })
      .catch((err) => {
        console.error("Search error:", err);
        sendResponse({
          snippets: `Failed to perform search: ${err.message}`,
          error: err.message,
        });
      });

    return true; // Required for async response
  }

  // --- Get current awareness state ---
  else if (message.action === "getContentAwarenessState") {
    sendResponse({ enabled: contentAwarenessEnabled });
    // No return true needed as sendResponse is immediate
  }

  // --- Handle state changes (from sidepanel toggle) ---
  else if (message.action === "contentAwarenessStateChanged") {
    const newState = !!message.enabled;
    if (contentAwarenessEnabled !== newState) {
      contentAwarenessEnabled = newState;
      chrome.storage.local.set({ contentAwarenessEnabled });
      updateContextMenuToggle(); // Update context menu title
      console.log(
        "Background: contentAwarenessEnabled state updated to",
        contentAwarenessEnabled
      );
    }
    // Optional: send acknowledgement
    sendResponse({ status: "ok" });
  }

  // --- Handle new query from context menu click ---
  else if (message.action === "newContextMenuQuery" && message.query) {
    // This message is listened for by sidepanel.js, background doesn't need to respond
    console.log("Background: Notifying side panel of new query.");
  }
  // Return false or nothing if no async response is needed for this message type
  // return false;
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let query = null; // Initialize query

  // --- Toggle Content Awareness ---
  if (info.menuItemId === "toggleContentAwareness") {
    contentAwarenessEnabled = !contentAwarenessEnabled;
    chrome.storage.local.set({ contentAwarenessEnabled });
    updateContextMenuToggle();
    console.log(
      "Context Menu: Toggled contentAwarenessEnabled to",
      contentAwarenessEnabled
    );

    // Notify side panel if it's open
    chrome.runtime
      .sendMessage({
        action: "contentAwarenessStateChanged",
        enabled: contentAwarenessEnabled,
      })
      .catch((err) => {
        /* Ignore if side panel isn't open */
      });
    return; // Don't proceed to open side panel for this item
  }

  // --- Set up Query for other menu items ---
  else if (info.menuItemId === "askOllama" && info.selectionText) {
    const selectedText = info.selectionText;
    query = `Answer the following questions for ${selectedText}. 1. Business overview: What does ${selectedText} do?\n2. Economic Moat and Industry Landscape: How durable is ${selectedText}?\n3. Financial Health: What is the financial state of ${selectedText}?\n4. Management and Governance: What is the management experience of ${selectedText}?\n5. Capital Expenditures: Does ${selectedText} have high capital expenditures?\n6. What is the sector cyclicality and any structural tailwinds for ${selectedText}?\nKeep your answers short, concise and relevant. Use bullet points to condense information.`;
  } else if (info.menuItemId === "summarize" && info.selectionText) {
    const selectedText = info.selectionText;
    query = `Summarize this piece of text: ${selectedText}. Keep it short, concise, and create bullet points. Include key points and any relevant information.`;
  } else if (info.menuItemId === "buffetAnalysis" && info.selectionText) {
    const selectedText = info.selectionText;
    query = `Answer the following questions about ${selectedText}.\nFundamentals:\n1. What is the companies core business model?\n2. Does the company have a sustainable competitive advantage(moat)?\n3. What are key risks to the business model?\n4. Does the management have a strong track record of delivering long-term value?\n5. How does management allocate capital—does it reinvest wisely or waste money on bad acquisitions?\n Respond short, concise, and with bullet points.`;
  }

  // --- Open Side Panel and Send Query (if query exists) ---
  if (query && tab?.id) {
    console.log(`Context Menu: Sending query for ${info.menuItemId}`);
    // Open the side panel first
    chrome.sidePanel.open({ tabId: tab.id }, () => {
      // Use a small delay AFTER opening to ensure the side panel's listener is ready
      setTimeout(() => {
        chrome.runtime
          .sendMessage({
            action: "newContextMenuQuery",
            query: query,
          })
          .catch((err) =>
            console.error("Error sending context menu query to runtime:", err)
          );
      }, 200); // Adjust delay if needed, 200ms is usually sufficient
    });
  } else if (!tab?.id) {
    console.error("Context menu clicked but no valid tab ID found.");
  }
});

// Note: The original content script injection logic (`injectContentScript`) and
// the `setTimeout` + `tabs.sendMessage` within the `getPageContent` handler are removed.
