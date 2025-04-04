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

  // DOM Elements - New
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

  // Add to state variables
  let contentAwarenessEnabled = false;

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
  memoryLabel.textContent = memoryEnabled ? "Memory: On" : "Memory: Off";

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

  // Event Listeners - Existing
  themeToggle.addEventListener("change", toggleTheme);
  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", handleEnterKey);
  connectionSettings.addEventListener("click", openSettingsModal);
  closeModal.addEventListener("click", closeSettingsModal);
  saveSettings.addEventListener("click", saveAndCloseSettings);
  testConnection.addEventListener("click", testConnectionHandler);

  // Event Listeners - New
  memoryToggle.addEventListener("change", toggleMemory);
  newChatButton.addEventListener("click", startNewChat);
  saveChatButton.addEventListener("click", openSaveChatModal);
  closeSaveModal.addEventListener("click", closeSaveChatModal);
  confirmSaveButton.addEventListener("click", saveCurrentChat);
  chatHistorySelect.addEventListener("change", loadSelectedChat);
  pageContextToggle.addEventListener("change", toggleContentAwareness);

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
      const autoSaveName = `Unnamed Chat ${new Date().toLocaleString()}`;
      saveChat(currentChatId, autoSaveName, getAllMessagesFromDOM());
    }

    // Create new chat
    currentChatId = `chat-${Date.now()}`;
    localStorage.setItem("currentChatId", currentChatId);

    // Clear message container except for the welcome message
    messagesContainer.innerHTML = `<div class="message system">
          <div class="message-content">
            Hello! I'm your AI assistant powered by Ollama. How can I help you today?
          </div>
        </div>`;

    // Reset message history if memory is enabled
    messageHistory = [];

    // Reset chat history dropdown
    chatHistorySelect.value = "";

    // Check for pending query after starting new chat
    checkForPendingQuery();
  }
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
      pageContextLabel.textContent = "Page Context: On";
    } else {
      pageContextLabel.textContent = "Page Context: Off";
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
    }
  }

  function loadCurrentChat() {
    const savedChats = JSON.parse(localStorage.getItem("savedChats") || "{}");
    if (savedChats[currentChatId]) {
      chatHistorySelect.value = currentChatId;
      loadSelectedChat();
    }
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

    try {
      const selectedModel = modelSelect.value;
      let response;
      let contextEnhancedPrompt = userMessage;
      let pageContent = null; // Reset pageContent for this message

      if (contentAwarenessEnabled && chrome.runtime) {
        console.log("Sidepanel: Requesting page content...");
        try {
          const pageData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              { action: "getPageContent" },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Sidepanel: Error receiving page content:",
                    chrome.runtime.lastError.message
                  );
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.error) {
                  // Handle errors reported by background script (e.g., restricted page, script failure)
                  console.warn(
                    "Sidepanel: Page context retrieval warning:",
                    response.error
                  );
                  // Resolve with the error info, content will be null
                  resolve({
                    content: null,
                    title: response.title,
                    url: response.url,
                    error: response.error,
                  });
                } else if (response) {
                  console.log("Sidepanel: Received page content successfully.");
                  resolve(response); // Contains { content, title, url, error: null }
                } else {
                  // This case might indicate an issue in the background script's response logic
                  console.error(
                    "Sidepanel: Received empty/invalid response for getPageContent."
                  );
                  reject(
                    new Error("Received empty response from background script")
                  );
                }
              }
            );
          });

          // Check if content was successfully retrieved AND is not null/empty
          if (pageData && pageData.content) {
            pageContent = pageData.content; // Store for the badge later
            const pageInfo = `
  Current page title: ${pageData.title || "N/A"}
  Current page URL: ${pageData.url || "N/A"}
  Page content snippet:
  ---
  ${pageData.content.substring(0, 3000)}${
              // Keep truncation logic
              pageData.content.length > 3000 ? "... (content truncated)" : ""
            }
  ---
            `.trim();

            // Prepend context to the user's actual message
            contextEnhancedPrompt = `Based on the following context from the current webpage:
  ${pageInfo}
  
  Please answer the user's query: ${userMessage}. Keep your answer short, concise, and use bullet points.`; // Clearer structure
            console.log("Sidepanel: Using page context.");
          } else if (pageData && pageData.error) {
            // Inform user that context couldn't be retrieved, use original prompt
            addMessageToChat(
              "system",
              `Note: Could not use page context. Reason: ${pageData.error}`
            );
            console.warn(
              "Sidepanel: Proceeding without page context due to error:",
              pageData.error
            );
            contextEnhancedPrompt = userMessage; // Fallback to original message
          } else {
            // Content was null/empty even without an explicit error
            addMessageToChat(
              "system",
              `Note: Page context could not be retrieved or was empty.`
            );
            console.warn(
              "Sidepanel: Proceeding without page context (content was null/empty)."
            );
            contextEnhancedPrompt = userMessage; // Fallback to original message
          }
        } catch (error) {
          console.error("Sidepanel: Failed to get page content:", error);
          addMessageToChat(
            "system",
            `Error retrieving page context: ${error.message}. Using original query.`
          );
          contextEnhancedPrompt = userMessage; // Fallback to original message
        }
      } else {
        // Content awareness is off, use original message
        contextEnhancedPrompt = userMessage;
        console.log("Sidepanel: Content awareness is OFF.");
      }

      // --- Now make the API call using `contextEnhancedPrompt` ---
      console.log(
        "Sidepanel: Sending prompt to Ollama:",
        contextEnhancedPrompt
      );

      // Use memory if enabled
      if (memoryEnabled && messageHistory.length > 0) {
        // Add the potentially context-enhanced user message to history
        messageHistory.push({
          role: "user",
          content: contextEnhancedPrompt, // Use the potentially modified prompt
        });
        response = await generateOllamaResponseWithMemory(
          messageHistory,
          selectedModel
        );
        messageHistory.push({
          role: "assistant",
          content: response,
        });
      } else {
        // Generate response without memory (or first message with memory on)
        response = await generateOllamaResponse(
          contextEnhancedPrompt, // Use the potentially modified prompt
          selectedModel
        );
        if (memoryEnabled) {
          messageHistory = [
            { role: "user", content: contextEnhancedPrompt },
            { role: "assistant", content: response },
          ];
        }
      }

      // Replace "Thinking..." with the actual response
      updateMessage(thinkingId, "bot", formatBotResponse(response));

      // Add badge *only* if pageContent was successfully retrieved in *this* turn
      if (contentAwarenessEnabled && pageContent) {
        const messageDiv = document.getElementById(thinkingId);
        if (messageDiv) {
          // Check if message still exists
          const pageContextBadge = document.createElement("div");
          pageContextBadge.className = "page-context-badge";
          pageContextBadge.textContent = "Used page context";
          // Append badge inside the message content for better layout
          messageDiv
            .querySelector(".message-content")
            ?.appendChild(pageContextBadge);
        }
      }
    } catch (error) {
      updateMessage(
        thinkingId,
        "system",
        `Error: ${error.message || "Failed to get response"}`
      );
      console.error("Ollama API error:", error);
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
