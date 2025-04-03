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

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let query;
  if (info.menuItemId === "askOllama") {
    const selectedText = info.selectionText;
    query = `What does ${selectedText} company do? What does ${selectedText} sell? Where does ${selectedText} do business?`;
    // Store the selected text and prompt template in storage
    chrome.storage.local.set({
      pendingQuery: query,
    });
  } else if (info.menuItemId === "summarize") {
    const selectedText = info.selectionText;
    query = `Summarize this piece of text: ${selectedText}. Keep it short, concise, and within one paragraph. Include key points and any relevant information.`;
    // Store the selected text and prompt template in storage
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
