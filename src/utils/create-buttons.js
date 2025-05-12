export function createDeleteChatButton(document, chatHistorySelect) {
  const deleteButton = document.createElement("button");
  deleteButton.id = "delete-chat";
  deleteButton.className = "button delete-btn";
  deleteButton.innerHTML = "Delete Chat";
  deleteButton.title = "Delete the selected chat";

  chatHistorySelect.parentNode.insertBefore(
    deleteButton,
    chatHistorySelect.previousSibling
  );

  return deleteButton;
}
