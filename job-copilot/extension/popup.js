const scanButton = document.getElementById("scanButton");
const fillTextButton = document.getElementById("fillTextButton");
const fillStructuredButton = document.getElementById("fillStructuredButton");
const fillAllButton = document.getElementById("fillAllButton");
const fillMediumButton = document.getElementById("fillMediumButton");
const fillSensitiveButton = document.getElementById("fillSensitiveButton");
const testBackendButton = document.getElementById("testBackendButton");
const askLlmButton = document.getElementById("askLlmButton");
const fillLlmButton = document.getElementById("fillLlmButton");
const uploadDocumentsButton = document.getElementById("uploadDocumentsButton");
const documentUpload = document.getElementById("documentUpload");
const documentTypeSelect = document.getElementById("documentTypeSelect");
const jobDescriptionInput = document.getElementById("jobDescriptionInput");
const askRagButton = document.getElementById("askRagButton");
const settingsButton = document.getElementById("settingsButton");
const statusText = document.getElementById("statusText");
const llmSuggestions = document.getElementById("llmSuggestions");
const ragAnswers = document.getElementById("ragAnswers");

let latestScanResult = null;

const sectionMap = {
  textMatches: document.getElementById("textMatches"),
  selectMatches: document.getElementById("selectMatches"),
  radioMatches: document.getElementById("radioMatches"),
  customDropdownMatches: document.getElementById("customDropdownMatches"),
  manualReview: document.getElementById("manualReview"),
  sensitiveFields: document.getElementById("sensitiveFields")
};

const busyButtons = [
  scanButton,
  fillTextButton,
  fillStructuredButton,
  fillAllButton,
  fillMediumButton,
  fillSensitiveButton,
  testBackendButton,
  askLlmButton,
  uploadDocumentsButton,
  askRagButton
];

function setStatus(message) {
  statusText.textContent = message;
}

function setBusy(isBusy) {
  busyButtons.forEach((button) => {
    button.disabled = isBusy;
  });
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

  return value.length > 44 ? `${value.slice(0, 41)}...` : value;
}

function renderScan(scan) {
  latestScanResult = scan;
  renderSection("textMatches", scan.textMatches, false);
  renderSection("selectMatches", scan.selectMatches, false);
  renderSection("radioMatches", scan.radioMatches, false);
  renderSection("customDropdownMatches", scan.customDropdownMatches, false);
  renderSection("manualReview", scan.manualReview, true);
  renderSection("sensitiveFields", scan.sensitiveFields, true, true);
}

function renderLlmSuggestions(matches) {
  llmSuggestions.textContent = "";

  if (!matches || !matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No LLM suggestions returned.";
    llmSuggestions.appendChild(empty);
    return;
  }

  matches.forEach((match) => {
    const item = document.createElement("article");
    item.className = `result-item ${match.isSensitive ? "sensitive-item" : ""}`;

    const topline = document.createElement("div");
    topline.className = "result-topline";

    const context = document.createElement("p");
    context.className = "field-context";
    context.textContent = `Field ${match.index}`;

    const badge = document.createElement("span");
    badge.className = `badge ${match.confidence}`;
    badge.textContent = match.requiresReview ? "review" : match.confidence.replace("_", " ");

    const detail = document.createElement("p");
    detail.className = "field-detail";
    detail.textContent = `${match.matchedKey || "unknown"}: ${previewValue(match.suggestedValue)}`;

    const option = document.createElement("p");
    option.className = "field-detail";
    option.textContent = match.matchedOption ? `Matched option: ${match.matchedOption}` : "Matched option: none";

    const reason = document.createElement("p");
    reason.className = "field-detail";
    reason.textContent = match.reason || "";

    topline.append(context, badge);
    item.append(topline, detail, option, reason);
    llmSuggestions.appendChild(item);
  });
}

function renderRagAnswers(answers) {
  ragAnswers.textContent = "";

  if (!answers || !answers.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No RAG answers returned.";
    ragAnswers.appendChild(empty);
    return;
  }

  answers.forEach((answer) => {
    const item = document.createElement("article");
    item.className = "result-item";

    const topline = document.createElement("div");
    topline.className = "result-topline";

    const context = document.createElement("p");
    context.className = "field-context";
    context.textContent = `Field ${answer.index}`;

    const badge = document.createElement("span");
    badge.className = `badge ${answer.confidence}`;
    badge.textContent = answer.requiresReview ? "review" : answer.confidence;

    const answerText = document.createElement("p");
    answerText.className = "field-detail";
    answerText.textContent = answer.suggestedAnswer || "(no answer suggested)";

    const sources = document.createElement("p");
    sources.className = "field-detail";
    sources.textContent = answer.sources && answer.sources.length
      ? `Sources: ${answer.sources.map((source) => source.source).join(", ")}`
      : "Sources: none";

    const reason = document.createElement("p");
    reason.className = "field-detail";
    reason.textContent = answer.reason || "";

    topline.append(context, badge);
    item.append(topline, answerText, sources, reason);
    ragAnswers.appendChild(item);
  });
}

async function getBackendSettings() {
  const stored = await chrome.storage.local.get(["backendSettings"]);
  return {
    backendEnabled: false,
    backendUrl: "http://127.0.0.1:8000",
    ...(stored.backendSettings || {})
  };
}

async function getProfileAndAnswers() {
  const stored = await chrome.storage.local.get(["profile", "savedAnswers"]);
  return {
    profile: stored.profile || {},
    savedAnswers: stored.savedAnswers || {}
  };
}

function scanToLlmFields(scan) {
  return [
    ...(scan.textMatches || []),
    ...(scan.selectMatches || []),
    ...(scan.radioMatches || []),
    ...(scan.customDropdownMatches || []),
    ...(scan.manualReview || []),
    ...(scan.sensitiveFields || [])
  ]
    .filter((match, index, all) => all.findIndex((item) => item.index === match.index) === index)
    .map((match) => ({
      index: match.index,
      context: match.context,
      fieldType: match.fieldType,
      availableOptions: match.availableOptions || []
    }));
}

function renderSection(sectionName, matches, showCheckboxes, isSensitive) {
  const container = sectionMap[sectionName];
  container.textContent = "";

  if (!matches || !matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No matches.";
    container.appendChild(empty);
    return;
  }

  matches.forEach((match) => {
    container.appendChild(createMatchCard(match, showCheckboxes, isSensitive));
  });
}

function createMatchCard(match, showCheckbox, isSensitive) {
  const item = document.createElement("article");
  item.className = `result-item ${isSensitive ? "sensitive-item" : ""}`;

  const topline = document.createElement("div");
  topline.className = "result-topline";

  const context = document.createElement("p");
  context.className = "field-context";
  context.textContent = match.context || `${match.fieldType} field`;

  const badge = document.createElement("span");
  badge.className = `badge ${match.confidence}`;
  badge.textContent = match.confidence.replace("_", " ");

  topline.append(context, badge);

  if (showCheckbox && (isSensitive || match.confidence === "medium")) {
    const label = document.createElement("label");
    label.className = "approval-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.index = String(match.index);
    checkbox.dataset.sensitive = isSensitive ? "true" : "false";

    label.append(checkbox, document.createTextNode("Approve"));
    item.appendChild(label);
  }

  const detail = document.createElement("p");
  detail.className = "field-detail";
  detail.textContent = match.matchedKey
    ? `${match.fieldType} -> ${match.matchedKey}: ${previewValue(match.suggestedValue)}`
    : `${match.fieldType}: No confident match`;

  const option = document.createElement("p");
  option.className = "field-detail";
  option.textContent = match.matchedOption ? `Matched option: ${match.matchedOption}` : "Matched option: none";

  const reason = document.createElement("p");
  reason.className = "field-detail";
  reason.textContent = match.reason || "";

  item.append(topline, detail, option, reason);
  return item;
}

function getSelectedIndexes(isSensitive) {
  return Array.from(document.querySelectorAll(`input[data-sensitive="${isSensitive ? "true" : "false"}"]:checked`)).map(
    (input) => Number(input.dataset.index)
  );
}

async function runAction(action, successPrefix, extra = {}) {
  setBusy(true);
  setStatus(`${successPrefix}...`);

  try {
    const response = await sendMessageToActiveTab({ action, ...extra });

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Action failed.");
    }

    const result = response.result;
    setStatus(`Filled ${result.filledCount}. Skipped ${result.skippedCount}.`);
  } catch (error) {
    setStatus(`${error.message} Try refreshing the page and scanning again.`);
  } finally {
    setBusy(false);
  }
}

scanButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Scanning structured fields on this page...");

  try {
    const response = await sendMessageToActiveTab({ action: "SCAN_FIELDS" });

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "Scan failed.");
    }

    renderScan(response.result);
    const backendNote = response.result.backendWarning ? ` Backend warning: ${response.result.backendWarning}` : "";
    setStatus(`Scan complete. Detected ${response.result.detectedCount} supported fields.${backendNote}`);
  } catch (error) {
    setStatus(`${error.message} Try refreshing the page and scanning again.`);
  } finally {
    setBusy(false);
  }
});

fillTextButton.addEventListener("click", () => {
  runAction("FILL_HIGH_TEXT", "Filling high-confidence text fields");
});

fillStructuredButton.addEventListener("click", () => {
  runAction("FILL_HIGH_STRUCTURED", "Filling high-confidence dropdowns and radios");
});

fillAllButton.addEventListener("click", () => {
  runAction("FILL_ALL_HIGH_CONFIDENCE", "Filling all high-confidence fields");
});

fillMediumButton.addEventListener("click", () => {
  runAction("FILL_SELECTED_MEDIUM", "Filling selected medium-confidence fields", {
    selectedIndexes: getSelectedIndexes(false)
  });
});

fillSensitiveButton.addEventListener("click", () => {
  runAction("FILL_SELECTED_SENSITIVE", "Filling selected sensitive fields", {
    selectedIndexes: getSelectedIndexes(true)
  });
});

testBackendButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Testing local backend...");

  try {
    const settings = await getBackendSettings();
    const response = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/health`);

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}.`);
    }

    const health = await response.json();
    setStatus(`Backend connected: ${health.service} is ${health.status}.`);
  } catch (error) {
    setStatus(`Backend test failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

askLlmButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Asking backend LLM for suggestions...");

  try {
    const settings = await getBackendSettings();
    if (!settings.backendEnabled) {
      throw new Error("Enable backend support in settings before asking the LLM.");
    }

    if (!latestScanResult) {
      const scanResponse = await sendMessageToActiveTab({ action: "SCAN_FIELDS" });
      if (!scanResponse || !scanResponse.ok) {
        throw new Error("Scan failed before LLM request.");
      }
      renderScan(scanResponse.result);
    }

    const { profile, savedAnswers } = await getProfileAndAnswers();
    const response = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/llm/match-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: scanToLlmFields(latestScanResult),
        profile,
        savedAnswers
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    renderLlmSuggestions(result.matches);
    setStatus(`LLM returned ${result.matches.length} suggestions. Review only; no LLM autofill yet.`);
  } catch (error) {
    setStatus(`LLM failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

uploadDocumentsButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Uploading and indexing documents...");

  try {
    const settings = await getBackendSettings();
    if (!settings.backendEnabled) {
      throw new Error("Enable backend support in settings before uploading documents.");
    }

    if (!documentUpload.files.length) {
      throw new Error("Choose at least one PDF, TXT, or MD file.");
    }

    const formData = new FormData();
    Array.from(documentUpload.files).forEach((file) => {
      formData.append("files", file);
    });
    formData.append("documentType", documentTypeSelect.value);

    const response = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/documents/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    setStatus(`Uploaded ${result.uploadedDocuments.length} documents. Indexed ${result.totalChunks} chunks.`);
  } catch (error) {
    setStatus(`Document upload failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

askRagButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Asking Resume RAG for grounded answers...");

  try {
    const settings = await getBackendSettings();
    if (!settings.backendEnabled) {
      throw new Error("Enable backend support in settings before asking RAG.");
    }

    if (!latestScanResult) {
      const scanResponse = await sendMessageToActiveTab({ action: "SCAN_FIELDS" });
      if (!scanResponse || !scanResponse.ok) {
        throw new Error("Scan failed before RAG request.");
      }
      renderScan(scanResponse.result);
    }

    const { profile, savedAnswers } = await getProfileAndAnswers();
    const response = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/rag/answer-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: scanToLlmFields(latestScanResult),
        profile,
        savedAnswers,
        jobDescription: jobDescriptionInput.value.trim()
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    renderRagAnswers(result.answers);
    setStatus(`RAG returned ${result.answers.length} grounded suggestions. Review only; no RAG autofill yet.`);
  } catch (error) {
    setStatus(`RAG failed: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
