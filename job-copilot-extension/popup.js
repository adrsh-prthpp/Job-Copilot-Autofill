const scanButton = document.getElementById("scanButton");
const fillButton = document.getElementById("fillButton");
const settingsButton = document.getElementById("settingsButton");
const confidenceSelect = document.getElementById("confidenceSelect");
const statusText = document.getElementById("statusText");
const resultsList = document.getElementById("resultsList");

const CONFIDENCE_LABELS = {
  high: "high-confidence",
  medium: "high and medium-confidence",
  low: "high, medium, and low-confidence"
};

function setStatus(message) {
  statusText.textContent = message;
}

function setBusy(isBusy) {
  scanButton.disabled = isBusy;
  fillButton.disabled = isBusy;
  confidenceSelect.disabled = isBusy;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendMessageToActiveTab(message) {
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id) {
    throw new Error("Could not find an active tab.");
  }

  return chrome.tabs.sendMessage(activeTab.id, message);
}

function previewValue(value) {
  if (!value) {
    return "(empty)";
  }

  return value.length > 36 ? `${value.slice(0, 33)}...` : value;
}

function renderResults(results) {
  resultsList.textContent = "";

  if (!results || !results.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No empty supported fields were found.";
    resultsList.appendChild(empty);
    return;
  }

  results.forEach((result) => {
    const item = document.createElement("article");
    item.className = "result-item";

    const topline = document.createElement("div");
    topline.className = "result-topline";

    const context = document.createElement("p");
    context.className = "field-context";
    context.textContent = result.context || `${result.tagName} field`;

    const badge = document.createElement("span");
    badge.className = `badge ${result.confidence}`;
    badge.textContent = result.confidence;

    const detail = document.createElement("p");
    detail.className = "field-detail";
    detail.textContent = result.matchedKey
      ? `${result.matchedKey}: ${previewValue(result.valuePreview)}`
      : "No confident match found.";

    const reason = document.createElement("p");
    reason.className = "field-detail";
    reason.textContent = result.reason || "";

    topline.append(context, badge);
    item.append(topline, detail, reason);
    resultsList.appendChild(item);
  });
}

scanButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Scanning empty fields on this page...");

  try {
    const response = await sendMessageToActiveTab({ action: "SCAN_FIELDS" });

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Scan failed.");
    }

    renderResults(response.results);
    setStatus(`Scan complete. Found ${response.results.length} fillable empty fields.`);
  } catch (error) {
    setStatus(`${error.message} Try refreshing the page and scanning again.`);
  } finally {
    setBusy(false);
  }
});

fillButton.addEventListener("click", async () => {
  const minimumConfidence = confidenceSelect.value;

  setBusy(true);
  setStatus(`Filling ${CONFIDENCE_LABELS[minimumConfidence]} fields...`);

  try {
    const response = await sendMessageToActiveTab({
      action: "FILL_BY_CONFIDENCE",
      minimumConfidence
    });

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Autofill failed.");
    }

    renderResults(response.result.filled);
    setStatus(
      `Detected ${response.result.detectedCount}. Filled ${response.result.filledCount}. Skipped ${response.result.skippedCount}.`
    );
  } catch (error) {
    setStatus(`${error.message} Try refreshing the page and scanning again.`);
  } finally {
    setBusy(false);
  }
});

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
