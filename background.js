// Register the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the side panel when the extension icon is clicked
  chrome.sidePanel.open({ tabId: tab.id });
});

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askOllama",
    title: "Research '%s'",
    contexts: ["selection"],
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize",
    contexts: ["selection"],
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "buffetAnalysis",
    title: "Buffet Analysis",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let query;
  if (info.menuItemId === "askOllama") {
    const selectedText = info.selectionText;
    query = `Answer the following questions for ${selectedText}. 1. Business overview: What does ${selectedText} do?\n2. Economic Moat and Industry Landscape: How durable is ${selectedText}?\n3. Financial Health: What is the financial state of ${selectedText}?\n4. Management and Governance: What is the management experience of ${selectedText}?\n5. Capital Expenditures: Does ${selectedText} have high capital expenditures?\n6. What is the sector cyclicality and any structural tailwinds for ${selectedText}?\nKeep your answers short, concise and relevant. Use bullet points to condense information.`;
    // Store the selected text and prompt template in storage
    chrome.storage.local.set({
      pendingQuery: query,
    });
  } else if (info.menuItemId === "summarize") {
    const selectedText = info.selectionText;
    query = `Summarize this piece of text: ${selectedText}. Keep it short, concise, and create bullet points. Include key points and any relevant information.`;
    // Store the selected text and prompt template in storage
    chrome.storage.local.set({
      pendingQuery: query,
    });
  } else if (info.menuItemId === "buffetAnalysis") {
    const selectedText = info.selectionText;
    query = ```Answer the following questions about ${selectedText}.\nFundamentals:\n1. What is the companies core business model?\n2. Does the company have a sustainable competitive advantage(moat)?\n3. What are key risks to the business model?\n4. Does the management have a strong track record of delivering long-term value?\n5. How does management allocate capital—does it reinvest wisely or waste money on bad acquisitions?\n Respond short, concise, and with bullet points.```;
    chrome.storage.local.set({
      pendingQuery: query,
    });
  }
  // Check if side panel is already open
  chrome.sidePanel.getOptions({ tabId: tab.id }, (options) => {
    // Open the side panel if it's not already open
    chrome.sidePanel.open({ tabId: tab.id });

    // Notify the side panel that there's a new query (even if already open)
    chrome.runtime.sendMessage({
      action: "newContextMenuQuery",
      query: query,
    });
  });
});
