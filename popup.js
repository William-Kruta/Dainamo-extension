document.getElementById("openSidePanel").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.sidePanel.open({ tabId: tabs[0].id });
      window.close(); // Close the popup
    }
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const openSidePanel = document.getElementById("open-sidepanel");

  openSidePanel.addEventListener("click", function () {
    chrome.sidePanel.open();
    window.close(); // Close the popup
  });
});
