document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Existing
  const messagesContainer = document.getElementById("messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const modelSelect = document.getElementById("model-select");
  const statusIndicator = document.getElementById("status-indicator");
  const connectionSettings = document.getElementById("connection-settings");
  const settingsModal = document.getElementById("settings-modal");
  const closeModal = document.querySelector(".close-modal");
  const saveSettings = document.getElementById("save-settings");
  const testConnection = document.getElementById("test-connection");
  const connectionTestResult = document.getElementById(
    "connection-test-result"
  );
  const ollamaUrlInput = document.getElementById("ollama-url");
  const contextTokensInput = document.getElementById("context-tokens");
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabel = document.querySelector(".theme-label");
  const textSizeSelect = document.getElementById("text-size");
  const memoryToggle = document.getElementById("memory-toggle");
  const memoryLabel = document.querySelector(".memory-label");
  const newChatButton = document.getElementById("new-chat");
  const saveChatButton = document.getElementById("save-chat");
  const chatHistorySelect = document.getElementById("chat-history");
  const saveChatModal = document.getElementById("save-chat-modal");
  const closeSaveModal = document.querySelector(".close-save-modal");
  const chatNameInput = document.getElementById("chat-name");
  const confirmSaveButton = document.getElementById("confirm-save");
  const pageContextToggle = document.getElementById("content-awareness-toggle");
  const pageContextLabel = document.querySelector(".content-awareness-label");
  const searchToggle = document.getElementById("search-toggle");
  const searchLabel = document.querySelector(".search-label");
  const deleteChatButton =
    document.getElementById("delete-chat") || createDeleteChatButton();

  // Create delete chat button if it doesn't exist
  function createDeleteChatButton() {
    const deleteButton = document.createElement("button");
    deleteButton.id = "delete-chat";
    deleteButton.className = "action-button delete-btn";
    deleteButton.innerHTML = "Delete Chat";
    deleteButton.title = "Delete the selected chat";

    // Insert the delete button after the chat history select dropdown
    chatHistorySelect.parentNode.insertBefore(
      deleteButton,
      chatHistorySelect.previousSibling
    );

    return deleteButton;
  }

  // Add to state variables
  let contentAwarenessEnabled = false;
  let searchEnabled = false;

  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["contentAwarenessEnabled"], function (result) {
      contentAwarenessEnabled = result.contentAwarenessEnabled || true; // Default to false.
      pageContextToggle.checked = contentAwarenessEnabled;
      updatePageContextLabel();

      // Also sync with background script state
      if (chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: "getContentAwarenessState" },
          function (response) {
            if (response && response.enabled !== undefined) {
              contentAwarenessEnabled = response.enabled;
              pageContextToggle.checked = contentAwarenessEnabled;
              updatePageContextLabel();
            }
          }
        );
      }
    });
  }

  // Fix in the sendMessage function where getPageContent is called:
  // Inside sendMessage() function, replace the page content retrieval code with:

  if (chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log(`TAG: ${message}`);
      if (message.action === "newContextMenuQuery" && message.query) {
        // Set the query in the input field
        userInput.value = message.query;

        // Focus the input field
        userInput.focus();

        // Automatically send the message
        setTimeout(sendMessage, 500);
      }
    });
  }

  // State variables
  let ollamaUrl = localStorage.getItem("ollamaUrl") || "http://localhost:11434";
  let contextTokens = parseInt(localStorage.getItem("contextTokens") || "2048");
  let memoryEnabled = localStorage.getItem("memoryEnabled") !== "false"; // Default to true
  let currentChatId =
    localStorage.getItem("currentChatId") || `chat-${Date.now()}`;
  let messageHistory = []; // To store conversation context when memory is enabled

  // Initialize UI states
  ollamaUrlInput.value = ollamaUrl;
  contextTokensInput.value = contextTokens;
  memoryToggle.checked = memoryEnabled;
  memoryLabel.textContent = "Memory";

  // Load text size preference
  const textSize = localStorage.getItem("textSize") || "medium";
  textSizeSelect.value = textSize;
  document.body.classList.add(`text-size-${textSize}`);

  // Load theme preference
  const darkThemeEnabled = localStorage.getItem("darkTheme") === "true";
  if (darkThemeEnabled) {
    document.body.classList.add("dark-theme");
    themeToggle.checked = true;
    themeLabel.textContent = "🌙";
  }

  // Load saved chats into dropdown
  loadSavedChats();

  // Load current chat if any
  loadCurrentChat();

  // Check for pending query from context menu
  checkForPendingQuery();

  themeToggle.addEventListener("change", toggleTheme);
  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", handleEnterKey);
  connectionSettings.addEventListener("click", openSettingsModal);
  closeModal.addEventListener("click", closeSettingsModal);
  saveSettings.addEventListener("click", saveAndCloseSettings);
  testConnection.addEventListener("click", testConnectionHandler);
  memoryToggle.addEventListener("change", toggleMemory);
  newChatButton.addEventListener("click", startNewChat);
  saveChatButton.addEventListener("click", openSaveChatModal);
  closeSaveModal.addEventListener("click", closeSaveChatModal);
  confirmSaveButton.addEventListener("click", saveCurrentChat);
  chatHistorySelect.addEventListener("change", loadSelectedChat);
  pageContextToggle.addEventListener("change", toggleContentAwareness);
  searchToggle.addEventListener("change", (e) => {
    searchEnabled = e.target.checked;
    searchLabel.textContent = `Search`;
  });

  // New Event Listener for Delete Chat Button
  deleteChatButton.addEventListener("click", deleteSelectedChat);

  // Click outside modal to close
  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
    if (e.target === saveChatModal) {
      closeSaveChatModal();
    }
  });

  // Check connection on load
  checkOllamaConnection();

  // Function to delete the selected chat
  function deleteSelectedChat() {
    const selectedChatId = chatHistorySelect.value;

    // Check if a chat is selected
    if (!selectedChatId) {
      addMessageToChat("system", "Please select a chat to delete");
      return;
    }

    // Get confirmation before deleting
    if (confirm("Are you sure you want to delete this chat?")) {
      // Get existing chats
      const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");

      // Delete the selected chat
      if (savedChats[selectedChatId]) {
        delete savedChats[selectedChatId];
        localStorage.setItem("savedChats", JSON.stringify(savedChats));

        // If we're deleting the current chat, start a new chat without auto-saving
        if (currentChatId === selectedChatId) {
          // Create new chat ID
          currentChatId = `chat-${Date.now()}`;
          localStorage.setItem("currentChatId", currentChatId);

          // Clear message container except for the welcome message
          messagesContainer.innerHTML = `<div class="message system">
                <div class="message-content">
                  How can I help you today?
                </div>
              </div>`;

          // Reset message history if memory is enabled
          messageHistory = [];

          // Reset chat history dropdown
          chatHistorySelect.value = "";
        }

        // Reload the saved chats dropdown
        loadSavedChats();

        // Show success message
        addMessageToChat("system", "Chat deleted successfully");
      }
    }
  }
  // New function to check for pending query from context menu
  function checkForPendingQuery() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["pendingQuery"], function (result) {
        if (result.pendingQuery) {
          // Set the query in the input field
          userInput.value = result.pendingQuery;

          // Clear the pending query
          chrome.storage.local.remove("pendingQuery");

          // Focus the input field
          userInput.focus();

          // Uncomment the next line to auto-send
          setTimeout(sendMessage, 500);
        }
      });
    }
  }

  // Functions - Chat Management
  function toggleMemory() {
    memoryEnabled = memoryToggle.checked;
    memoryLabel.textContent = memoryEnabled ? "Memory: On" : "Memory: Off";
    localStorage.setItem("memoryEnabled", memoryEnabled);

    // Reset message history when turning memory off
    if (!memoryEnabled) {
      messageHistory = [];
    } else {
      // If enabling memory, populate history with current messages
      messageHistory = getAllMessagesForHistory();
    }
  }

  function startNewChat() {
    // Save current chat before starting a new one
    if (getAllMessagesFromDOM().length > 1) {
      // More than just the welcome message
      // Get existing saved chats
      const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");

      // Check if this chat already has a name
      let chatName;
      if (savedChats[currentChatId] && savedChats[currentChatId].name) {
        // Use the existing name
        chatName = savedChats[currentChatId].name;
      } else {
        // Use default name for new chats
        chatName = `Unnamed Chat ${new Date().toLocaleString()}`;
      }

      saveChat(currentChatId, chatName, getAllMessagesFromDOM());
    }

    // Create new chat
    currentChatId = `chat-${Date.now()}`;
    localStorage.setItem("currentChatId", currentChatId);

    // Clear message container except for the welcome message
    messagesContainer.innerHTML = `<div class="message system">
          <div class="message-content">
            How can I help you today?
          </div>
        </div>`;

    // Reset message history if memory is enabled
    messageHistory = [];

    // Reset chat history dropdown
    chatHistorySelect.value = "";

    // Check for pending query after starting new chat
    checkForPendingQuery();
  }

  /**
   * @description Toggles the content awareness feature on or off.
   */
  function toggleContentAwareness() {
    contentAwarenessEnabled = pageContextToggle.checked;
    updatePageContextLabel();

    // Save to storage
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ contentAwarenessEnabled });
    }

    // Sync with background script - ADD ERROR HANDLING
    if (chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          action: "contentAwarenessStateChanged",
          enabled: contentAwarenessEnabled,
        },
        // Add this callback function to handle errors
        function (response) {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.log(
              "Error syncing content awareness state:",
              lastError.message
            );
            // Optionally handle the error scenario
          }
        }
      );
    }

    // Show status message
    addMessageToChat(
      "system",
      contentAwarenessEnabled
        ? "Page context is now ON. The AI can access the current page content."
        : "Page context is now OFF. The AI will not use the current page content."
    );
  }

  function updatePageContextLabel() {
    if (contentAwarenessEnabled) {
      pageContextLabel.textContent = "Page Context";
    } else {
      pageContextLabel.textContent = "Page Context";
    }
  }

  function openSaveChatModal() {
    chatNameInput.value = "";
    saveChatModal.style.display = "block";
  }

  function closeSaveChatModal() {
    saveChatModal.style.display = "none";
  }

  function saveCurrentChat() {
    const chatName =
      chatNameInput.value.trim() || `Chat ${new Date().toLocaleString()}`;
    const messages = getAllMessagesFromDOM();

    saveChat(currentChatId, chatName, messages);
    loadSavedChats();
    closeSaveChatModal();
  }

  function saveChat(chatId, chatName, messages) {
    // Get existing chats or initialize new object
    const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");

    // Save this chat
    savedChats[chatId] = {
      name: chatName,
      timestamp: Date.now(),
      messages: messages,
    };

    // Store back to localStorage
    localStorage.setItem("savedChats", JSON.stringify(savedChats));
  }

  function loadSavedChats() {
    const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");

    // Clear dropdown except the first option
    while (chatHistorySelect.options.length > 1) {
      chatHistorySelect.remove(1);
    }

    // Sort chats by most recent first
    const sortedChats = Object.entries(savedChats).sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    });

    // Add chats to dropdown
    sortedChats.forEach(([chatId, chat]) => {
      const option = document.createElement("option");
      option.value = chatId;
      option.textContent = chat.name;
      chatHistorySelect.appendChild(option);
    });

    // Update the delete button state
    updateDeleteButtonState();
  }

  // New function to update delete button state
  function updateDeleteButtonState() {
    const selectedChatId = chatHistorySelect.value;
    deleteChatButton.disabled = !selectedChatId;
  }

  function loadSelectedChat() {
    const selectedChatId = chatHistorySelect.value;
    if (!selectedChatId) return;

    // Load the selected chat
    const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");
    const selectedChat = savedChats[selectedChatId];

    if (selectedChat) {
      // Update current chat id
      currentChatId = selectedChatId;
      localStorage.setItem("currentChatId", currentChatId);

      // Clear and load messages
      messagesContainer.innerHTML = "";
      selectedChat.messages.forEach((msg) => {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${msg.type}`;
        messageDiv.innerHTML = `<div class="message-content">${msg.content}</div>`;
        messagesContainer.appendChild(messageDiv);
      });

      // Update memory history if enabled
      if (memoryEnabled) {
        messageHistory = selectedChat.messages.map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content,
        }));
      }

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Update delete button state
      updateDeleteButtonState();
    }
  }

  function loadCurrentChat() {
    const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");
    if (savedChats[currentChatId]) {
      chatHistorySelect.value = currentChatId;
      loadSelectedChat();
    }

    // Update delete button state
    updateDeleteButtonState();
  }

  function getAllMessagesFromDOM() {
    const messages = [];
    const messageDivs = messagesContainer.querySelectorAll(".message");

    messageDivs.forEach((div) => {
      const type = div.classList.contains("user")
        ? "user"
        : div.classList.contains("bot")
        ? "bot"
        : "system";
      const content = div.querySelector(".message-content").innerHTML;
      messages.push({ type, content });
    });

    return messages;
  }

  function getAllMessagesForHistory() {
    return getAllMessagesFromDOM()
      .filter((msg) => msg.type !== "system") // Exclude system messages
      .map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content:
          msg.type === "user"
            ? // Strip HTML from user messages (since they're escaped)
              msg.content.replace(/<[^>]*>/g, "")
            : // Keep HTML in bot messages
              msg.content,
      }));
  }

  // Functions - Existing (modified for memory support)
  async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    addMessageToChat("user", userMessage);
    userInput.value = "";

    if (!(await checkOllamaConnection())) {
      addMessageToChat(
        "system",
        "Unable to connect to Ollama. Please check your connection settings."
      );
      return;
    }

    const thinkingId = addMessageToChat("bot", "Thinking...");
    const selectedModel = modelSelect.value;

    let contextEnhancedPrompt = userMessage;
    let pageContent = null;
    let searchResults = null;

    try {
      // --- Get Page Content ---
      if (contentAwarenessEnabled && chrome.runtime) {
        try {
          const pageData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              { action: "getPageContent" },
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              }
            );
          });

          if (pageData?.content) {
            pageContent = pageData.content;
            const snippet = pageData.content.substring(0, 3000);
            contextEnhancedPrompt = `
  Based on the following context from the current webpage:
  Title: ${pageData.title}
  URL: ${pageData.url}
  Content:
  ---
  ${snippet}${snippet.length === 3000 ? "... (truncated)" : ""}
  ---
  User's query: ${userMessage}
  `.trim();
          } else if (pageData?.error) {
            addMessageToChat("system", `Page context error: ${pageData.error}`);
          }
        } catch (err) {
          console.warn("Failed to get page content:", err.message);
        }
      }

      // --- Get Search Results ---
      if (searchEnabled && chrome.runtime) {
        try {
          let results = await performSearch(userMessage);
          //results = await fetchFullContent(results);
          console.log(`Results1: ${results}`);
          results = parseSearchResults(results);
          results = results
            .map(
              (result) =>
                `Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`
            )
            .join("\n\n");

          //console.log(`Results: ${formattedResults}`);
          if (results) {
            contextEnhancedPrompt += `
  
  Additional information from search results:
  ---
  ${results}
  ---`;
          }
        } catch (err) {
          console.warn("Search failed:", err.message);
        }
      }

      // --- Generate Response ---
      let response;
      if (memoryEnabled && messageHistory.length > 0) {
        messageHistory.push({ role: "user", content: contextEnhancedPrompt });
        response = await generateOllamaResponseWithMemory(
          messageHistory,
          selectedModel
        );
        messageHistory.push({ role: "assistant", content: response });
      } else {
        response = await generateOllamaResponse(
          contextEnhancedPrompt,
          selectedModel
        );
        if (memoryEnabled) {
          messageHistory = [
            { role: "user", content: contextEnhancedPrompt },
            { role: "assistant", content: response },
          ];
        }
      }

      updateMessage(thinkingId, "bot", formatBotResponse(response));
    } catch (error) {
      updateMessage(
        thinkingId,
        "system",
        `Error: ${error.message || "Failed to respond."}`
      );
    }
  }

  async function generateOllamaResponse(prompt, model) {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        num_ctx: contextTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async function generateOllamaResponseWithMemory(messages, model) {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        num_ctx: contextTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.message.content;
  }

  async function fetchSearchContext(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "performGoogleSearch", query },
        (response) => {
          resolve(response?.snippets || "");
        }
      );
    });
  }

  async function performSearch(query) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(
      query
    )}`;

    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const html = await response.text();
      return html;
    } catch (error) {
      console.error("Error fetching search results:", error);
      return null;
    }
  }

  function parseSearchResults(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const results = [];
    const resultElements = doc.querySelectorAll(".b_algo");

    resultElements.forEach((element) => {
      const titleElement = element.querySelector("h2 a");
      const snippetElement = element.querySelector(".b_caption p");
      const urlElement = element.querySelector("cite");
      const dateElement = element.querySelector(".news_dt");
      // Look for other metadata Bing might provide
      const metadataElements = element.querySelectorAll(".b_factrow");

      let metadata = {};
      metadataElements.forEach((meta) => {
        metadata[meta.querySelector("strong")?.textContent || "info"] =
          meta.querySelector(":not(strong)")?.textContent || "";
      });

      results.push({
        title: titleElement?.textContent || "",
        url: titleElement?.href || "",
        displayUrl: urlElement?.textContent || "",
        snippet: snippetElement?.textContent || "",
        date: dateElement?.textContent || "",
        metadata: metadata,
      });
    });

    return results;
  }

  async function fetchFullContent(searchResults, maxPages = 5) {
    const enrichedResults = [];

    // Only process a limited number of results to avoid excessive requests
    for (let i = 0; i < Math.min(searchResults.length, maxPages); i++) {
      const result = searchResults[i];

      try {
        const response = await fetch(result.url);
        if (!response.ok) continue;

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Extract main content (this is a simplified approach)
        // For better results, consider using a content extraction library
        const contentElements = doc.querySelectorAll(
          "p, h1, h2, h3, h4, h5, h6"
        );
        let fullContent = "";

        contentElements.forEach((el) => {
          const text = el.textContent.trim();
          if (text.length > 20) {
            // Simple filter to avoid menu items, etc.
            fullContent += text + "\n\n";
          }
        });

        enrichedResults.push({
          ...result,
          fullContent: fullContent.substring(0, 5000), // Limit content length
        });
      } catch (error) {
        console.error(`Error fetching content from ${result.url}:`, error);
        enrichedResults.push(result); // Keep the original result without full content
      }

      // Add a delay to avoid triggering rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return enrichedResults;
  }

  async function fetchGoogleSearchContext(query) {
    const response = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(
        query
      )}&api_key=YOUR_API_KEY`
    );
    const data = await response.json();
    return data.organic_results?.map((r) => r.snippet).join("\n") || "";
  }

  function toggleTheme() {
    if (themeToggle.checked) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("darkTheme", "true");
      themeLabel.textContent = "🌙";
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("darkTheme", "false");
      themeLabel.textContent = "☀️";
    }
  }

  function handleEnterKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function openSettingsModal() {
    settingsModal.style.display = "block";
  }

  function closeSettingsModal() {
    settingsModal.style.display = "none";
  }

  function saveAndCloseSettings() {
    // Save API URL
    ollamaUrl = ollamaUrlInput.value.trim();
    localStorage.setItem("ollamaUrl", ollamaUrl);

    // Save context tokens
    contextTokens = parseInt(contextTokensInput.value) || 2048;
    localStorage.setItem("contextTokens", contextTokens);

    // Save text size
    const selectedTextSize = textSizeSelect.value;
    localStorage.setItem("textSize", selectedTextSize);

    // Remove existing text size classes
    document.body.classList.remove(
      "text-size-small",
      "text-size-medium",
      "text-size-large"
    );

    // Add the selected text size class
    document.body.classList.add(`text-size-${selectedTextSize}`);

    // Check connection and close modal
    checkOllamaConnection();
    settingsModal.style.display = "none";
  }

  async function testConnectionHandler() {
    const testUrl = ollamaUrlInput.value.trim();
    const result = await testOllamaConnection(testUrl);

    connectionTestResult.style.display = "block";
    if (result.success) {
      connectionTestResult.className = "success";
      connectionTestResult.textContent = `Connection successful! Available models: ${result.models.join(
        ", "
      )}`;
    } else {
      connectionTestResult.className = "error";
      connectionTestResult.textContent = `Connection failed: ${result.error}`;
    }
  }

  async function testOllamaConnection(url) {
    try {
      // Try to get list of models to verify connection
      const response = await fetch(`${url}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        return { success: false, error: `HTTP Error: ${response.status}` };
      }

      const data = await response.json();
      const models = data.models ? data.models.map((model) => model.name) : [];

      return {
        success: true,
        models: models.length ? models : ["No models found"],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Connection failed",
      };
    }
  }

  async function checkOllamaConnection() {
    const result = await testOllamaConnection(ollamaUrl);

    if (result.success) {
      statusIndicator.textContent = "Connected";
      statusIndicator.className = "connected";

      // Update model select options if we got models
      if (
        result.models &&
        result.models.length &&
        result.models[0] !== "No models found"
      ) {
        updateModelOptions(result.models);
      }

      return true;
    } else {
      statusIndicator.textContent = "Disconnected";
      statusIndicator.className = "";
      return false;
    }
  }

  function updateModelOptions(models) {
    // Save current selection
    const currentSelection = modelSelect.value;

    // Clear options
    modelSelect.innerHTML = "";

    // Add new options
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    // Try to restore previous selection
    if (models.includes(currentSelection)) {
      modelSelect.value = currentSelection;
    }
  }

  function addMessageToChat(type, content) {
    const messageId = "msg-" + Date.now();
    const messageDiv = document.createElement("div");
    messageDiv.id = messageId;
    messageDiv.className = `message ${type}`;

    // Format the content to handle code blocks
    const formattedContent = formatMessageWithCodeBlocks(content);

    messageDiv.innerHTML = `<div class="message-content">${formattedContent}</div>`;

    messagesContainer.appendChild(messageDiv);

    // Auto scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageId;
  }

  function _escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMessageWithCodeBlocks(message) {
    // Regular expression to find multi-line code blocks (with optional language)
    const codeBlockRegex = /```([a-zA-Z0-9+\-.]+)?\n([\s\S]*?)\n```/g;

    // Regular expression to find inline code
    const inlineCodeRegex = /`([^`]+)`/g;

    // Process multi-line code blocks first
    const messageWithCodeBlocks = message.replace(
      codeBlockRegex,
      (match, language, code) => {
        const languageClass = language ? `language-${language}` : "";
        return `<pre><code class="${languageClass}">${_escapeHtml(
          code
        )}</code></pre>`;
      }
    );

    // Process inline code
    const formattedMessage = messageWithCodeBlocks.replace(
      inlineCodeRegex,
      (match, code) => {
        return `<code>${_escapeHtml(code)}</code>`;
      }
    );

    return formattedMessage;
  }

  function updateMessage(messageId, type, content) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      messageDiv.className = `message ${type}`;
      messageDiv.querySelector(".message-content").innerHTML = content;

      // Auto scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function formatBotResponse(text) {
    // Process markdown-style code blocks
    let formattedText = text.replace(
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

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
