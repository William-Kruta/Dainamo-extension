// Ollama response
import {
  generateOllamaResponse,
  generateOllamaResponseWithMemory,
  testOllamaConnection,
  optimizeSearchQuery,
} from "./src/responses/ollama-response.js";
// Response Formatting
import {
  formatBotResponse,
  formatMessageWithCodeBlocks,
} from "./src/responses/format-response.js";

// Encryption
import { decryptApiKey, encryptAndStoreApiKey } from "./src/utils/encrypt.js";

// Prompts
import { getPersonalityPrompt } from "./src/prompts/personalities.js";

import {
  performSearch,
  parseSearchResults,
} from "./src/functions/web-search.js";

// RAG
//import { initializeFileManager, isRAGEnabled } from "./src/rag/file-manager.js";
//import { processQueryWithRAG } from "./src/rag/rag-processor.js";

// Utils
import { createDeleteChatButton } from "./src/utils/create-buttons.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Existing
  const messagesContainer = document.getElementById("messages");
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
  const temperatureInput = document.getElementById("temperature");
  // Theme elements
  const themeToggle = document.getElementById("theme-toggle");
  const themeLabel = document.querySelector(".theme-label");
  // Text Size
  const textSizeSelect = document.getElementById("text-size");
  // Personality & Global Memory Elements
  const modelPersonalitySelect = document.getElementById("model-personality");
  const globalMemorySaved = document.getElementById("global-memory");
  // Model Providers
  const providerSelect = document.getElementById("provider-select");
  const apiKeyGroup = document.getElementById("api-key-group");
  const apiKeyInput = document.getElementById("api-key-input");
  const modelGroup = document.getElementById("model-group");

  // Memory Elements
  const memoryToggle = document.getElementById("memory-toggle");
  const memoryLabel = document.querySelector(".memory-label");
  // New Chat & Save
  const newChatButton = document.getElementById("new-chat");
  const saveChatButton = document.getElementById("save-chat");
  const chatHistorySelect = document.getElementById("chat-history");
  const saveChatModal = document.getElementById("save-chat-modal");
  const closeSaveModal = document.querySelector(".close-save-modal");
  // Chat Name & Save Elements
  const chatNameInput = document.getElementById("chat-name");
  const confirmSaveButton = document.getElementById("confirm-save");
  // Page Context Elements
  const pageContextToggle = document.getElementById("content-awareness-toggle");
  const pageContextLabel = document.querySelector(".content-awareness-label");
  // Web Search Elements
  const searchToggle = document.getElementById("search-toggle");
  const searchLabel = document.querySelector(".search-label");
  const deleteChatButton =
    document.getElementById("delete-chat") ||
    createDeleteChatButton(document, chatHistorySelect);

  // Plus Buttons
  const plusButton = document.getElementById("plus-button");
  const plusMenu = document.getElementById("plus-menu");
  const uploadFileOption = document.getElementById("upload-file-option");
  const insertTemplateOption = document.getElementById(
    "insert-template-option"
  );
  const addCodeOption = document.getElementById("add-code-option");
  const fileUploadInput = document.getElementById("file-upload");
  const userInput = document.getElementById("user-input");

  // Toggle the plus menu
  plusButton.addEventListener("click", function (event) {
    event.stopPropagation();
    plusMenu.classList.toggle("active");
  });

  // Close the plus menu when clicking elsewhere
  document.addEventListener("click", function (event) {
    if (!plusMenu.contains(event.target) && event.target !== plusButton) {
      plusMenu.classList.remove("active");
    }
  });

  // Upload file option - triggers the hidden file input
  uploadFileOption.addEventListener("click", function () {
    fileUploadInput.click();
    plusMenu.classList.remove("active");
  });

  // Insert template option
  insertTemplateOption.addEventListener("click", function () {
    // Insert a template at cursor position
    const template =
      "Hello, I need help with [topic]. Can you provide information about [specific question]?";
    insertTextAtCursor(userInput, template);
    plusMenu.classList.remove("active");
  });

  // Add code block option
  addCodeOption.addEventListener("click", function () {
    // Insert code block template at cursor position
    const codeBlock = "```\n// Your code here\n```";
    insertTextAtCursor(userInput, codeBlock);
    plusMenu.classList.remove("active");
  });

  // Initialize File Manager
  //initializeFileManager();

  // Add to state variables
  let contentAwarenessEnabled = false;
  let searchEnabled = false;
  let initialized = false;

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

  // Add a listener for adding selection to RAG from context menu
  if (chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "addSelectionToRAG") {
        // Create a file from the selection
        const fileContent = `
Source: ${message.source}
Title: ${message.title}
Date: ${new Date().toISOString()}
---
${message.selection}
        `.trim();

        // Create a Blob and File object
        const blob = new Blob([fileContent], { type: "text/plain" });
        const file = new File([blob], message.filename, { type: "text/plain" });

        // Process the file through the RAG system
        processFile(file).then((result) => {
          if (result.success) {
            addMessageToChat(
              "system",
              `Added selected text to knowledge base as '${message.filename}'`
            );
          } else {
            addMessageToChat(
              "system",
              `Failed to add selection: ${result.error}`
            );
          }
        });
      }
    });
  }

  // State variables
  let ollamaUrl = localStorage.getItem("ollamaUrl") || "http://localhost:11434";
  let contextTokens = parseInt(localStorage.getItem("contextTokens") || "2048");
  let temperature = parseFloat(localStorage.getItem("temperature") || "0.5");
  let memoryEnabled = localStorage.getItem("memoryEnabled") !== "false"; // Default to true
  let currentChatId =
    localStorage.getItem("currentChatId") || `chat-${Date.now()}`;
  let messageHistory = []; // To store conversation context when memory is enabled
  const savedModel = localStorage.getItem("selectedModel");
  console.log(`Saved model12222: ${savedModel}`);
  let preferredModel;
  if (savedModel) {
    // We'll set this after loading available models
    preferredModel = savedModel;
  }
  console.log(`Preferred: 222: ${preferredModel}`);

  // Initialize UI states
  ollamaUrlInput.value = ollamaUrl;
  contextTokensInput.value = contextTokens;
  temperatureInput.value = temperature;
  memoryToggle.checked = memoryEnabled;
  memoryLabel.textContent = "Memory";

  // Load text size preference
  const textSize = localStorage.getItem("textSize") || "medium";
  textSizeSelect.value = textSize;
  document.body.classList.add(`text-size-${textSize}`);

  // Load model personality preference
  const modelPersonality = localStorage.getItem("modelPersonality") || "Normal";
  modelPersonalitySelect.value = modelPersonality;

  // Load global memory.
  const globalMemory = localStorage.getItem("globalMemory") || "";
  globalMemorySaved.value = globalMemory;

  // on load, restore saved provider
  const savedProvider = localStorage.getItem("provider") || "ollama";
  providerSelect.value = savedProvider;
  toggleApiKeyField(savedProvider);
  populateModelSelect(savedProvider);
  if (savedModel) modelSelect.value = savedModel;

  providerSelect.addEventListener("change", async (e) => {
    const p = e.target.value;
    localStorage.setItem("provider", p);

    toggleApiKeyField(p);
    await populateModelSelect(p);
  });

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
  modelSelect.addEventListener("change", saveSelectedModel);

  providerSelect.addEventListener("change", (e) => {
    const p = e.target.value;
    localStorage.setItem("provider", p);
    toggleApiKeyField(p);
  });

  saveSettings.addEventListener("click", async (e) => {
    e.preventDefault();

    const provider = providerSelect.value;
    // encrypt & store key if needed…
    if (provider !== "ollama") {
      const rawKey = apiKeyInput.value.trim();
      if (rawKey) await encryptAndStoreApiKey(provider, rawKey);
    }

    // store chosen model
    localStorage.setItem("model", modelSelect.value);

    // call your original save & close
    saveAndCloseSettings();
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

  // Helper function to insert text at cursor position in textarea
  function insertTextAtCursor(textarea, text) {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;

    const beforeText = textarea.value.substring(0, startPos);
    const afterText = textarea.value.substring(endPos);

    textarea.value = beforeText + text + afterText;

    // Move cursor position after the inserted text
    textarea.selectionStart = startPos + text.length;
    textarea.selectionEnd = startPos + text.length;

    // Restore scroll position
    textarea.scrollTop = scrollTop;

    // Focus on the textarea
    textarea.focus();
  }

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

  function displayUploadedFile(file) {
    const inputContainer = document.getElementById("text-area-overlay");

    const fileBadge = document.createElement("div");
    fileBadge.className = "file-badge";
    fileBadge.textContent = file.name;

    // Create the "X" icon
    const deleteIcon = document.createElement("span");
    deleteIcon.className = "delete-icon";
    deleteIcon.textContent = "✖";

    // Attach click event to delete the file badge
    deleteIcon.addEventListener("click", function () {
      inputContainer.removeChild(fileBadge);
    });

    // Append the "X" icon to the file badge
    fileBadge.appendChild(deleteIcon);

    inputContainer.appendChild(fileBadge);
  }

  // Functions - Chat Management
  function toggleMemory() {
    memoryEnabled = memoryToggle.checked;
    memoryLabel.textContent = "Memory";
    localStorage.setItem("memoryEnabled", memoryEnabled);

    // Reset message history when turning memory off
    if (!memoryEnabled) {
      messageHistory = [];
    } else {
      // If enabling memory, populate history with current messages
      messageHistory = getAllMessagesForHistory();
    }
  }

  async function toggleApiKeyField(provider) {
    if (provider === "ollama") {
      apiKeyGroup.style.display = "none";
      return;
    }

    apiKeyGroup.style.display = "block";
    const stored = localStorage.getItem(`${provider}ApiKey`);
    if (!stored) {
      // first time for this provider: ask user
      const rawKey = prompt(`Enter API key for ${provider}:`);
      if (rawKey) {
        await encryptAndStoreApiKey(provider, rawKey);
        apiKeyInput.value = rawKey;
      }
    } else {
      // decrypt & populate
      apiKeyInput.value = await decryptApiKey(provider);
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

  function saveSelectedModel() {
    const selectedModel = modelSelect.value;
    console.log(`Selected model: ${selectedModel}`);
    localStorage.setItem("selectedModel", selectedModel);
  }

  function updatePreferredModel(modelName) {
    localStorage.setItem("selectedModel", modelName);
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
    // Start the timer
    const startTime = performance.now();
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

    let personalityPrompt = getPersonalityPrompt(modelPersonalitySelect.value);
    let globalMemory = globalMemorySaved.value.trim();
    if (globalMemory && globalMemory.trim() !== "") {
      personalityPrompt += `Here is your global memory: ${globalMemory.trim()}`;
    }

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
          const snippetMax = 5000;
          if (pageData?.content) {
            pageContent = pageData.content;
            const snippet = pageData.content.substring(0, snippetMax);
            contextEnhancedPrompt = `
  Based on the following context from the current webpage:
  Title: ${pageData.title}
  URL: ${pageData.url}
  Content:
  ---
  ${snippet}${snippet.length >= snippetMax ? "... (truncated)" : ""}
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
          // const optimizedQuery = await optimizeSearchQuery(
          //   userMessage,
          //   selectedModel
          // );
          let results = await optimizeSearchQuery(
            userMessage,
            selectedModel,
            ollamaUrl,
            contextTokens
          );
          results = await performSearch(results);
          //results = await fetchFullContent(results);
          results = parseSearchResults(results);
          results = results
            .map(
              (result) =>
                `Title: ${result.title}\nDate: ${result.date}\nURL: ${result.url}\nSnippet: ${result.snippet}`
            )
            .join("\n\n");

          //console.log(`Results: ${formattedResults}`);
          if (results) {
            const currentDate = new Date();
            contextEnhancedPrompt += `
  
  The current date is ${currentDate.toLocaleDateString()}. Use this to answer questions about current events. Be short, concise.
  Additional information from search results:
  ---
  ${results}
  ---`;
          }
        } catch (err) {
          console.warn("Search failed:", err.message);
        }
      }
      contextEnhancedPrompt += `${personalityPrompt}`;
      console.log(`Context Enhanced Prompt: ${contextEnhancedPrompt}`);
      // --- Generate Response ---
      let response;
      if (memoryEnabled && messageHistory.length > 0) {
        messageHistory.push({ role: "user", content: contextEnhancedPrompt });
        response = await generateOllamaResponseWithMemory(
          messageHistory,
          selectedModel,
          contextTokens,
          temperature,
          ollamaUrl
        );
        messageHistory.push({
          role: "assistant",
          content: response.content,
        });
      } else {
        response = await generateOllamaResponse(
          contextEnhancedPrompt,
          selectedModel,
          contextTokens,
          temperature,
          ollamaUrl
        );

        if (memoryEnabled) {
          messageHistory = [
            { role: "user", content: contextEnhancedPrompt },
            { role: "assistant", content: response.content },
          ];
        }
      }
      // End the timer
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const botResponse = formatBotResponse(response.content);

      if (botResponse.reasoning != "") {
        const combinedContent = `
      <div class="response-text">
        ${botResponse.response}
      </div>
      <details class="reasoning-details">
        <summary>Show reasoning</summary>
        <div class="reasoning-text">
          ${botResponse.reasoning}
        </div>
      </details>
    `;

        updateMessage(thinkingId, "bot", combinedContent);
      } else {
        updateMessage(thinkingId, "bot", botResponse.response);
      }

      addTimerToMessage(thinkingId, responseTime);
      addTokensToMessage(thinkingId, response.tokens);
    } catch (error) {
      updateMessage(
        thinkingId,
        "system",
        `Error: ${error.message || "Failed to respond."}`
      );
    }
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

    // Model Temperature
    temperature = parseFloat(temperatureInput.value) || 0.5;
    localStorage.setItem("temperature", temperature);

    // Save text size
    const selectedTextSize = textSizeSelect.value;
    localStorage.setItem("textSize", selectedTextSize);

    // Save model personality
    const selectedModelPersonality = modelPersonalitySelect.value;
    localStorage.setItem("modelPersonality", selectedModelPersonality);

    // Global memory save
    const currentMemory = globalMemorySaved.value.trim();
    localStorage.setItem("globalMemory", currentMemory);

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

  async function populateModelSelect(provider) {
    modelSelect.innerHTML = ""; // clear old options
    modelGroup.style.display = "block"; // make it visible

    let models = [];
    switch (provider) {
      case "ollama":
        models = await fetchLocalModels();
        break;
      case "google":
        models = ["Gemini 2.5", "Gemini Ultra", "Gemini Pro"];
        break;
      case "anthropic":
        models = ["Claude-2", "Claude-3", "Claude Instant"];
        break;
      case "openai":
        models = ["gpt-4", "gpt-3.5-turbo"];
        break;
    }

    models.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });

    // if no models found, you might hide the group
    if (models.length === 0) {
      modelGroup.style.display = "none";
    }
  }

  function updateModelOptions(models) {
    // Save current selection

    let currentSelection;
    console.log(modelSelect.value);
    if (!initialized) {
      currentSelection = preferredModel;
      initialized = true;
    } else {
      currentSelection = modelSelect.value;
      updatePreferredModel(currentSelection);
    }

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

  function addTimerToMessage(messageId, timeInMs) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      // Create timer element
      const timerElement = document.createElement("div");
      timerElement.className = "response-timer";
      timerElement.textContent = `${(timeInMs / 1000).toFixed(2)}s`;

      // Append to message div
      messageDiv.appendChild(timerElement);
    }
  }

  function addTokensToMessage(messageId, tokenCount) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;

    // Create tokens element
    const tokenElement = document.createElement("div");
    tokenElement.className = "response-tokens";
    tokenElement.textContent = `${tokenCount} token/s`;

    // Append it under the message
    messageDiv.appendChild(tokenElement);
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

  function updateMessage(messageId, type, content) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
      messageDiv.className = `message ${type}`;
      messageDiv.querySelector(".message-content").innerHTML = content;

      // Auto scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
});
