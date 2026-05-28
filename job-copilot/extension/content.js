const DEFAULT_PROFILE = {
  firstName: "Adharsh",
  lastName: "Prathap",
  fullName: "Adharsh Prathap",
  email: "pm.adharsh@gmail.com",
  phone: "9493946259",
  linkedin: "https://www.linkedin.com/in/adharsh-prathap-cs",
  website: "https://www.adharsh.dev",
  addressLine1: "7 Deerwood W",
  city: "Irvine",
  state: "California",
  postalCode: "92604",
  country: "United States",
  school: "University of California, Riverside",
  collegeAttended: "University of California, Riverside",
  degree: "Bachelor's",
  highestEducation: "Bachelor's",
  major: "Computer Science",
  graduationDate: "December 15, 2025",
  graduated: "Yes"
};

const DEFAULT_SAVED_ANSWERS = {
  workAuthorization: "Yes",
  basedInUS: "Yes",
  requireSponsorship: "No",
  futureSponsorship: "No",
  willingToRelocate: "",
  salaryExpectations: "",
  startDate: "",
  veteranStatus: "",
  disabilityStatus: "",
  gender: "",
  raceEthnicity: "",
  sexualOrientation: "",
  pronouns: ""
};

const DEFAULT_BACKEND_SETTINGS = {
  backendEnabled: false,
  backendUrl: "http://127.0.0.1:8000"
};

const SENSITIVE_KEYS = [
  "veteranStatus",
  "disabilityStatus",
  "gender",
  "raceEthnicity",
  "sexualOrientation",
  "pronouns"
];

const TEXT_FIELD_TYPES = new Set(["text", "email", "tel", "url", "search", "number", "date", "month"]);

const FIELD_PATTERNS = {
  firstName: { high: ["first name", "given name", "legal first name"], medium: ["first"] },
  lastName: { high: ["last name", "family name", "surname", "legal last name"], medium: ["last"] },
  fullName: { high: ["full name"], medium: ["name", "legal name", "preferred name"] },
  email: { high: ["email", "email address", "e mail"], medium: [] },
  phone: { high: ["phone", "phone number", "mobile phone", "telephone"], medium: ["mobile", "cell"] },
  linkedin: { high: ["linkedin", "linkedin url", "linkedin profile"], medium: ["linked in"] },
  website: { high: ["website", "portfolio website", "personal website"], medium: ["portfolio", "profile url", "web site"] },
  addressLine1: {
    high: ["address line 1", "street address", "mailing address", "home address"],
    medium: ["address"]
  },
  city: { high: ["city"], medium: ["preferred location"] },
  state: { high: ["state", "province"], medium: ["region"] },
  postalCode: { high: ["postal code", "zip code", "zipcode", "zip"], medium: ["postal"] },
  country: { high: ["country"], medium: ["location"] },
  school: { high: ["school", "university", "institution"], medium: ["college"] },
  collegeAttended: {
    high: ["college attended", "school attended", "university attended"],
    medium: ["college", "school", "university", "institution"]
  },
  highestEducation: {
    high: ["highest level of education", "highest education", "education level"],
    medium: ["education"]
  },
  degree: { high: ["degree", "degree type"], medium: ["qualification"] },
  major: { high: ["major", "field of study"], medium: ["area of study", "discipline"] },
  graduationDate: {
    high: ["graduation date", "expected graduation", "graduation month", "graduation year"],
    medium: ["grad date", "graduated", "completion date"]
  },
  graduated: { high: ["have you graduated", "graduated"], medium: ["completed"] },
  workAuthorization: {
    high: [
      "authorized to work",
      "legally authorized",
      "work authorization",
      "eligible to work",
      "authorized to work in the united states"
    ],
    medium: ["authorized"]
  },
  basedInUS: {
    high: ["based in the united states", "are you based in the us", "are you located in the us"],
    medium: ["based in us", "located in us"]
  },
  requireSponsorship: {
    high: ["will you require sponsorship", "require sponsorship", "visa sponsorship", "immigration sponsorship"],
    medium: ["sponsorship"]
  },
  futureSponsorship: {
    high: ["future sponsorship", "now or in the future require sponsorship"],
    medium: ["sponsorship"]
  },
  willingToRelocate: { high: ["willing to relocate"], medium: ["relocate", "relocation"] },
  salaryExpectations: { high: ["salary expectations", "desired salary"], medium: ["salary", "compensation"] },
  startDate: { high: ["start date", "available start date"], medium: ["availability", "available"] },
  veteranStatus: { high: [], medium: ["veteran status", "protected veteran", "veteran"] },
  disabilityStatus: { high: [], medium: ["disability status", "disability"] },
  gender: { high: [], medium: ["gender", "sex"] },
  raceEthnicity: { high: [], medium: ["race ethnicity", "race", "ethnicity", "hispanic", "latino"] },
  sexualOrientation: { high: [], medium: ["sexual orientation"] },
  pronouns: { high: [], medium: ["pronouns"] }
};

const YES_WORDS = ["yes", "y", "i am authorized", "i am legally authorized", "yes i am authorized", "graduated", "completed"];
const NO_WORDS = ["no", "n", "i do not", "no i do not", "no sponsorship required", "i do not require sponsorship"];
const OPTION_SYNONYMS = {
  country: ["united states", "united states of america", "usa", "u s", "us"],
  state: ["california", "ca"],
  degree: ["bachelor s", "bachelors", "bachelor s degree", "bachelor degree", "undergraduate degree", "4 year degree"],
  highestEducation: ["bachelor s", "bachelors", "bachelor s degree", "bachelor degree", "undergraduate degree", "4 year degree"],
  major: ["computer science", "cs", "computer and information sciences"],
  school: ["university of california riverside", "uc riverside", "ucr"],
  collegeAttended: ["university of california riverside", "uc riverside", "ucr"]
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return false;
  }

  if (message.action === "SCAN_FIELDS") {
    scanFields()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "FILL_HIGH_TEXT") {
    fillMatches({ mode: "highText" }).then(sendOk(sendResponse)).catch(sendFail(sendResponse));
    return true;
  }

  if (message.action === "FILL_HIGH_STRUCTURED") {
    fillMatches({ mode: "highStructured" }).then(sendOk(sendResponse)).catch(sendFail(sendResponse));
    return true;
  }

  if (message.action === "FILL_ALL_HIGH_CONFIDENCE") {
    fillMatches({ mode: "allHigh" }).then(sendOk(sendResponse)).catch(sendFail(sendResponse));
    return true;
  }

  if (message.action === "FILL_SELECTED_MEDIUM") {
    fillMatches({ mode: "selected", selectedIndexes: message.selectedIndexes || [] })
      .then(sendOk(sendResponse))
      .catch(sendFail(sendResponse));
    return true;
  }

  if (message.action === "FILL_SELECTED_SENSITIVE") {
    fillMatches({ mode: "sensitive", selectedIndexes: message.selectedIndexes || [] })
      .then(sendOk(sendResponse))
      .catch(sendFail(sendResponse));
    return true;
  }

  return false;
});

function sendOk(sendResponse) {
  return (result) => sendResponse({ ok: true, result });
}

function sendFail(sendResponse) {
  return (error) => sendResponse({ ok: false, error: error.message });
}

async function loadProfileAndAnswers() {
  const stored = await chrome.storage.local.get(["profile", "savedAnswers", "backendSettings"]);

  return {
    profile: { ...DEFAULT_PROFILE, ...(stored.profile || {}) },
    savedAnswers: { ...DEFAULT_SAVED_ANSWERS, ...(stored.savedAnswers || {}) },
    backendSettings: { ...DEFAULT_BACKEND_SETTINGS, ...(stored.backendSettings || {}) }
  };
}

async function scanFields() {
  const { profile, savedAnswers, backendSettings } = await loadProfileAndAnswers();
  const candidates = buildFieldCandidates();
  let matches = candidates.map((candidate, index) => makeMatch(candidate, index, profile, savedAnswers));
  let backendWarning = "";

  if (backendSettings.backendEnabled) {
    try {
      matches = await enhanceMatchesWithBackend(matches, backendSettings.backendUrl, profile, savedAnswers);
    } catch (error) {
      backendWarning = error.message;
    }
  }

  return groupScanResults(matches, backendWarning);
}

function buildFieldCandidates() {
  const candidates = [];
  const seen = new Set();

  document.querySelectorAll("input, textarea, select").forEach((element) => {
    if (seen.has(element) || !isUsableElement(element)) {
      return;
    }

    const tagName = element.tagName.toLowerCase();
    const type = (element.type || "").toLowerCase();

    if (tagName === "select") {
      candidates.push({ fieldType: "select", element, options: getOptionsForField(element) });
      seen.add(element);
      return;
    }

    if (type === "radio") {
      const group = getRadioGroup(element);
      group.elements.forEach((radio) => seen.add(radio));
      if (!group.elements.some((radio) => radio.checked)) {
        candidates.push({ fieldType: "radio", element: group.elements[0], group, options: group.options });
      }
      return;
    }

    if (type === "checkbox") {
      seen.add(element);
      if (!element.checked && !looksLikeConsent(element)) {
        candidates.push({ fieldType: "checkbox", element, options: getCheckboxOptions(element) });
      }
      return;
    }

    if (tagName === "textarea" || TEXT_FIELD_TYPES.has(type || "text")) {
      seen.add(element);
      if (isEmptyField(element)) {
        candidates.push({ fieldType: "text", element, options: [] });
      }
    }
  });

  document.querySelectorAll('button, [role="button"], [role="radio"], [role="option"]').forEach((element) => {
    if (!isUsableElement(element) || seen.has(element) || looksLikeSubmitButton(element)) {
      return;
    }

    const context = getFieldContext(element);
    if (hasKnownQuestionText(context.normalizedText)) {
      candidates.push({ fieldType: "buttonChoice", element, options: getButtonGroupOptions(element) });
      seen.add(element);
    }
  });

  document
    .querySelectorAll('[role="combobox"], [role="listbox"], [aria-haspopup="listbox"], [data-automation-id*="select"]')
    .forEach((element) => {
      if (!isUsableElement(element) || seen.has(element)) {
        return;
      }

      const context = getFieldContext(element);
      if (hasKnownQuestionText(context.normalizedText) || element.getAttribute("aria-expanded") !== null) {
        candidates.push({ fieldType: "customDropdown", element, options: getOptionsForField(element) });
        seen.add(element);
      }
    });

  return candidates;
}

function isUsableElement(element) {
  if (!element || element.disabled || element.readOnly || element.getAttribute("aria-disabled") === "true") {
    return false;
  }

  if (isHiddenElement(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const type = (element.type || "").toLowerCase();
  const blockedTypes = ["button", "color", "file", "hidden", "image", "password", "range", "reset", "submit"];

  return tagName !== "input" || !blockedTypes.includes(type);
}

function isHiddenElement(element) {
  const type = (element.type || "").toLowerCase();
  if (type === "hidden" || element.hidden) {
    return true;
  }

  const style = window.getComputedStyle(element);
  return style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
}

function isEmptyField(element) {
  if (element.tagName.toLowerCase() === "select") {
    return !element.value;
  }

  return !element.value || !String(element.value).trim();
}

function getRadioGroup(radio) {
  const name = radio.name;
  const form = radio.form;
  const radios = name
    ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)).filter(
        (item) => item.form === form
      )
    : [radio];

  return {
    elements: radios,
    options: radios.map((item) => ({
      text: getOptionLabel(item),
      value: item.value || getOptionLabel(item),
      element: item
    }))
  };
}

function getCheckboxOptions(checkbox) {
  return [{ text: getOptionLabel(checkbox) || "Yes", value: checkbox.value || "Yes", element: checkbox }];
}

function getButtonGroupOptions(element) {
  const container = element.closest('[role="radiogroup"], fieldset, div, section, li') || element.parentElement;
  const options = container
    ? Array.from(container.querySelectorAll('button, [role="button"], [role="radio"], [role="option"]'))
    : [element];

  return options.filter(isUsableElement).map((option) => ({
    text: compactText(option.innerText || option.textContent || option.getAttribute("aria-label") || "", 90),
    value: option.getAttribute("data-value") || option.getAttribute("aria-label") || option.textContent || "",
    element: option
  }));
}

function getOptionsForField(element) {
  if (element.tagName.toLowerCase() === "select") {
    return Array.from(element.options).map((option) => ({
      text: compactText(option.textContent || "", 90),
      value: option.value || option.textContent || "",
      element: option
    }));
  }

  const ownedId = element.getAttribute("aria-controls") || element.getAttribute("aria-owns");
  const owned = ownedId ? document.getElementById(ownedId) : null;
  const searchRoot = owned || element.closest("div, section, fieldset") || document;
  return Array.from(searchRoot.querySelectorAll('[role="option"], li, [data-automation-id*="promptOption"]'))
    .filter(isVisibleOption)
    .slice(0, 80)
    .map((option) => ({
      text: compactText(option.innerText || option.textContent || option.getAttribute("aria-label") || "", 90),
      value: option.getAttribute("data-value") || option.textContent || "",
      element: option
    }));
}

function isVisibleOption(element) {
  const text = compactText(element.innerText || element.textContent || element.getAttribute("aria-label") || "", 90);
  return Boolean(text) && !isHiddenElement(element);
}

function makeMatch(candidate, index, profile, savedAnswers) {
  const context = getFieldContext(candidate.element, candidate);
  const values = { ...profile, ...savedAnswers };
  const keyMatch = matchKey(context, candidate.fieldType);
  const matchedKey = keyMatch.key;
  const isSensitive = SENSITIVE_KEYS.includes(matchedKey);
  const suggestedValue = matchedKey ? values[matchedKey] || "" : "";
  const optionMatch = candidate.options.length ? matchOptionText(candidate.options, suggestedValue, matchedKey) : null;
  const confidence = getConfidence(candidate, keyMatch, optionMatch, suggestedValue, isSensitive);

  return {
    index,
    fieldType: candidate.fieldType,
    context: context.displayText,
    matchedKey,
    suggestedValue,
    matchedOption: optionMatch ? optionMatch.text : "",
    availableOptions: candidate.options.map((option) => option.text).filter(Boolean),
    confidence,
    reason: getReason(candidate, keyMatch, optionMatch, suggestedValue, isSensitive, confidence),
    isSensitive
  };
}

function matchKey(context, fieldType) {
  if (includesPhrase(context.importantText, "county")) {
    return { key: "", strength: "low", phrase: "" };
  }

  const sensitive = findSensitiveKey(context.normalizedText);
  if (sensitive) {
    return { key: sensitive, strength: "manual_required", phrase: "Sensitive voluntary demographic field" };
  }

  const autoKey = matchAutocomplete(context);
  if (autoKey) {
    return { key: autoKey, strength: "high", phrase: "autocomplete" };
  }

  const futureSponsorshipPhrase = FIELD_PATTERNS.futureSponsorship.high.find((phrase) =>
    includesPhrase(context.normalizedText, phrase)
  );
  if (futureSponsorshipPhrase) {
    return { key: "futureSponsorship", strength: "high", phrase: futureSponsorshipPhrase };
  }

  for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
    if (SENSITIVE_KEYS.includes(key)) {
      continue;
    }

    const high = patterns.high.find((phrase) => includesPhrase(context.importantText, phrase));
    if (high) {
      return { key, strength: "high", phrase: high };
    }
  }

  for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
    if (SENSITIVE_KEYS.includes(key)) {
      continue;
    }

    const medium = patterns.medium.find((phrase) => includesPhrase(context.normalizedText, phrase));
    if (medium) {
      return { key, strength: fieldType === "customDropdown" ? "medium" : "medium", phrase: medium };
    }
  }

  return { key: "", strength: "low", phrase: "" };
}

async function enhanceMatchesWithBackend(matches, backendUrl, profile, savedAnswers) {
  const baseUrl = backendUrl.replace(/\/$/, "");
  const enhanced = [];

  for (const match of matches) {
    if (match.isSensitive || !["medium", "low"].includes(match.confidence)) {
      enhanced.push(match);
      continue;
    }

    const response = await fetch(`${baseUrl}/match-field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: match.context,
        fieldType: match.fieldType,
        availableOptions: match.availableOptions || [],
        profile,
        savedAnswers
      })
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const backendMatch = await response.json();
    enhanced.push(mergeBackendMatch(match, backendMatch));
  }

  return enhanced;
}

function mergeBackendMatch(localMatch, backendMatch) {
  if (!backendMatch || !backendMatch.matchedKey) {
    return localMatch;
  }

  const isSensitive = SENSITIVE_KEYS.includes(backendMatch.matchedKey);
  return {
    ...localMatch,
    matchedKey: backendMatch.matchedKey || localMatch.matchedKey,
    suggestedValue: backendMatch.suggestedValue || localMatch.suggestedValue,
    matchedOption: backendMatch.matchedOption || localMatch.matchedOption,
    confidence: isSensitive ? "manual_required" : backendMatch.confidence || localMatch.confidence,
    reason: `Backend: ${backendMatch.reason || localMatch.reason}`,
    isSensitive
  };
}

function getConfidence(candidate, keyMatch, optionMatch, suggestedValue, isSensitive) {
  if (isSensitive) {
    return "manual_required";
  }

  if (!keyMatch.key || !suggestedValue) {
    return "low";
  }

  if (candidate.fieldType === "customDropdown") {
    return keyMatch.strength === "high" ? "high" : "medium";
  }

  if (["select", "radio", "buttonChoice", "checkbox"].includes(candidate.fieldType) && !optionMatch) {
    return "low";
  }

  return keyMatch.strength === "high" ? "high" : "medium";
}

function getReason(candidate, keyMatch, optionMatch, suggestedValue, isSensitive, confidence) {
  if (isSensitive) {
    return "Sensitive voluntary demographic field";
  }

  if (!keyMatch.key) {
    return "No clear field match";
  }

  if (!suggestedValue) {
    return `Matched ${keyMatch.key}, but no saved value exists`;
  }

  if (["select", "radio", "buttonChoice", "checkbox"].includes(candidate.fieldType) && !optionMatch) {
    return "Matched question, but no reasonable option match was found";
  }

  if (candidate.fieldType === "customDropdown") {
    return confidence === "medium"
      ? "Custom dropdown match found; manual approval recommended"
      : "Custom dropdown requires manual review";
  }

  return keyMatch.strength === "high"
    ? `Matched exact phrase: ${keyMatch.phrase}`
    : `Matched possible phrase: ${keyMatch.phrase}`;
}

function groupScanResults(matches, backendWarning = "") {
  const result = {
    detectedCount: matches.length,
    textMatches: [],
    selectMatches: [],
    radioMatches: [],
    customDropdownMatches: [],
    manualReview: [],
    sensitiveFields: [],
    backendWarning
  };

  matches.forEach((match) => {
    if (match.isSensitive) {
      result.sensitiveFields.push(match);
    } else if (match.confidence === "medium" || match.confidence === "low") {
      result.manualReview.push(match);
    }

    if (match.fieldType === "text" || match.fieldType === "checkbox") {
      result.textMatches.push(match);
    } else if (match.fieldType === "select") {
      result.selectMatches.push(match);
    } else if (match.fieldType === "radio" || match.fieldType === "buttonChoice") {
      result.radioMatches.push(match);
    } else if (match.fieldType === "customDropdown") {
      result.customDropdownMatches.push(match);
    }
  });

  return result;
}

function getFieldContext(element, candidate) {
  const parts = {
    label: getAssociatedLabelText(element),
    legend: getLegendText(element),
    placeholder: element.getAttribute("placeholder") || "",
    name: element.getAttribute("name") || "",
    id: element.id || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    ariaLabelledBy: getAriaLabelledByText(element),
    autocomplete: element.getAttribute("autocomplete") || "",
    dataAutomationId: element.getAttribute("data-automation-id") || "",
    nearbyText: getNearbyText(element),
    previousSiblingText: getPreviousSiblingText(element),
    optionsText: candidate && candidate.options ? candidate.options.map((option) => option.text).join(" ") : ""
  };
  const displayText = firstUsefulText(parts) || parts.name || parts.id || `${element.tagName} field`;
  const allText = Object.values(parts).filter(Boolean).join(" ");
  const importantText = normalizeText(
    [parts.label, parts.legend, parts.placeholder, parts.ariaLabel, parts.ariaLabelledBy, parts.name, parts.id].join(" ")
  );

  return {
    displayText: compactText(displayText, 120),
    normalizedText: normalizeText(allText),
    importantText,
    autocomplete: normalizeText(parts.autocomplete)
  };
}

function getAssociatedLabelText(element) {
  const labels = [];

  if (element.labels && element.labels.length) {
    labels.push(...Array.from(element.labels).map((label) => label.textContent || ""));
  }

  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) {
      labels.push(label.textContent || "");
    }
  }

  const wrappingLabel = element.closest("label");
  if (wrappingLabel) {
    labels.push(wrappingLabel.textContent || "");
  }

  return labels.join(" ");
}

function getLegendText(element) {
  const fieldset = element.closest("fieldset");
  const legend = fieldset ? fieldset.querySelector("legend") : null;
  return legend ? legend.textContent || "" : "";
}

function getAriaLabelledByText(element) {
  const ids = (element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
  return ids.map((id) => document.getElementById(id)).filter(Boolean).map((item) => item.textContent || "").join(" ");
}

function getNearbyText(element) {
  const container = element.closest('[role="radiogroup"], label, fieldset, div, section, li, p');
  return container ? compactText(container.innerText || container.textContent || "", 260) : "";
}

function getPreviousSiblingText(element) {
  let sibling = element.previousElementSibling;
  let steps = 0;

  while (sibling && steps < 3) {
    const text = compactText(sibling.innerText || sibling.textContent || "", 140);
    if (text) {
      return text;
    }
    sibling = sibling.previousElementSibling;
    steps += 1;
  }

  return "";
}

function firstUsefulText(parts) {
  return (
    parts.label ||
    parts.legend ||
    parts.ariaLabel ||
    parts.ariaLabelledBy ||
    parts.placeholder ||
    parts.previousSiblingText ||
    parts.nearbyText
  );
}

function getOptionLabel(element) {
  const labels = [];

  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) {
      labels.push(label.textContent || "");
    }
  }

  const wrappingLabel = element.closest("label");
  if (wrappingLabel) {
    labels.push(wrappingLabel.textContent || "");
  }

  labels.push(element.getAttribute("aria-label") || "", element.value || "");
  return compactText(labels.filter(Boolean).join(" "), 90);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[-_/.,']/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text, maxLength) {
  const compacted = String(text || "").replace(/\s+/g, " ").trim();
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 3)}...` : compacted;
}

function includesPhrase(text, phrase) {
  const normalized = normalizeText(phrase);
  return normalized && ` ${text} `.includes(` ${normalized} `);
}

function hasKnownQuestionText(text) {
  return Object.values(FIELD_PATTERNS).some((group) =>
    [...group.high, ...group.medium].some((phrase) => includesPhrase(text, phrase))
  );
}

function findSensitiveKey(text) {
  return SENSITIVE_KEYS.find((key) => FIELD_PATTERNS[key].medium.some((phrase) => includesPhrase(text, phrase))) || "";
}

function matchAutocomplete(context) {
  const map = {
    "given name": "firstName",
    "family name": "lastName",
    name: "fullName",
    email: "email",
    tel: "phone",
    url: context.normalizedText.includes("linkedin") ? "linkedin" : "website",
    "address line1": "addressLine1",
    "address line 1": "addressLine1",
    "address level2": "city",
    "address level1": "state",
    "postal code": "postalCode",
    country: "country"
  };

  return map[context.autocomplete] || "";
}

function matchOptionText(options, desiredValue, key) {
  if (!desiredValue) {
    return null;
  }

  const desired = normalizeText(desiredValue);
  const desiredOptions = getDesiredOptionTexts(desired, key);

  return (
    options.find((option) => desiredOptions.includes(normalizeText(option.text)) || desiredOptions.includes(normalizeText(option.value))) ||
    options.find((option) => {
      const optionText = normalizeText(`${option.text} ${option.value}`);
      return desiredOptions.some((value) => optionText.includes(value) || value.includes(optionText));
    }) ||
    null
  );
}

function getDesiredOptionTexts(desired, key) {
  if (desired === "yes") {
    return YES_WORDS.map(normalizeText);
  }

  if (desired === "no") {
    return NO_WORDS.map(normalizeText);
  }

  if (OPTION_SYNONYMS[key]) {
    return Array.from(new Set([desired, ...OPTION_SYNONYMS[key].map(normalizeText)]));
  }

  return [desired];
}

async function fillMatches({ mode, selectedIndexes = [] }) {
  const scan = await scanFields();
  const candidates = buildFieldCandidates();
  const selected = new Set(selectedIndexes.map(Number));
  const allMatches = flattenScan(scan);
  const filled = [];
  const skipped = [];

  for (const match of allMatches) {
    if (!shouldFillMatch(match, mode, selected)) {
      skipped.push(match);
      continue;
    }

    const candidate = candidates[match.index];
    if (candidate && (await fillStructuredField(candidate, match))) {
      filled.push(match);
    } else {
      skipped.push(match);
    }
  }

  return {
    filledCount: filled.length,
    skippedCount: skipped.length,
    filled,
    skipped
  };
}

function flattenScan(scan) {
  return [
    ...scan.textMatches,
    ...scan.selectMatches,
    ...scan.radioMatches,
    ...scan.customDropdownMatches,
    ...scan.manualReview,
    ...scan.sensitiveFields
  ].filter((match, index, all) => all.findIndex((item) => item.index === match.index) === index);
}

function shouldFillMatch(match, mode, selected) {
  if (!match.matchedKey || !match.suggestedValue) {
    return false;
  }

  if (match.isSensitive) {
    return mode === "sensitive" && selected.has(match.index);
  }

  if (mode === "selected") {
    return selected.has(match.index) && match.confidence === "medium";
  }

  if (match.confidence !== "high") {
    return false;
  }

  if (mode === "highText") {
    return match.fieldType === "text";
  }

  if (mode === "highStructured") {
    return ["select", "radio", "buttonChoice", "customDropdown"].includes(match.fieldType);
  }

  return mode === "allHigh" && ["text", "select", "radio", "buttonChoice", "customDropdown"].includes(match.fieldType);
}

async function fillStructuredField(candidate, match) {
  if (candidate.fieldType === "text") {
    return fillTextField(candidate.element, match.suggestedValue);
  }

  if (candidate.fieldType === "select") {
    return selectNativeOption(candidate.element, match.suggestedValue, match.matchedKey);
  }

  if (candidate.fieldType === "radio") {
    return selectRadioOption(candidate.group, match.suggestedValue, match.matchedKey);
  }

  if (candidate.fieldType === "checkbox") {
    return fillCheckbox(candidate.element, match.suggestedValue);
  }

  if (candidate.fieldType === "buttonChoice") {
    return selectButtonOption(candidate.options, match.suggestedValue, match.matchedKey);
  }

  if (candidate.fieldType === "customDropdown") {
    return fillCustomDropdown(candidate.element, match.suggestedValue, match.matchedKey);
  }

  return false;
}

function fillTextField(element, value) {
  if (!isEmptyField(element) || !isUsableElement(element)) {
    return false;
  }

  element.focus();
  element.value = value;
  dispatchFieldEvents(element);
  return true;
}

function selectNativeOption(selectElement, desiredValue, key) {
  if (!isEmptyField(selectElement) || !isUsableElement(selectElement)) {
    return false;
  }

  const match = matchOptionText(getOptionsForField(selectElement), desiredValue, key);
  if (!match) {
    return false;
  }

  selectElement.value = match.element.value;
  dispatchFieldEvents(selectElement);
  return true;
}

function selectRadioOption(radioGroup, desiredValue, key) {
  const match = matchOptionText(radioGroup.options, desiredValue, key);
  if (!match || !match.element || match.element.checked || !isUsableElement(match.element)) {
    return false;
  }

  match.element.checked = true;
  match.element.click();
  dispatchFieldEvents(match.element);
  return true;
}

function fillCheckbox(checkbox, desiredValue) {
  if (checkbox.checked || !isUsableElement(checkbox) || looksLikeConsent(checkbox)) {
    return false;
  }

  if (normalizeText(desiredValue) !== "yes") {
    return false;
  }

  checkbox.checked = true;
  checkbox.click();
  dispatchFieldEvents(checkbox);
  return true;
}

function selectButtonOption(options, desiredValue, key) {
  const match = matchOptionText(options, desiredValue, key);
  if (!match || !match.element || !isUsableElement(match.element) || looksLikeSubmitButton(match.element)) {
    return false;
  }

  match.element.click();
  dispatchFieldEvents(match.element);
  return true;
}

async function fillCustomDropdown(element, desiredValue, key) {
  if (!isUsableElement(element)) {
    return false;
  }

  element.click();
  await wait(250);
  const match = matchOptionText(getOptionsForField(element), desiredValue, key);
  if (!match || !match.element || !isUsableElement(match.element)) {
    return false;
  }

  match.element.click();
  dispatchFieldEvents(element);
  return true;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function dispatchFieldEvents(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

function looksLikeSubmitButton(element) {
  const text = normalizeText(`${element.type || ""} ${element.innerText || ""} ${element.value || ""} ${element.getAttribute("aria-label") || ""}`);
  return ["submit", "apply", "continue", "next", "save", "finish", "send"].some((word) => includesPhrase(text, word));
}

function looksLikeConsent(element) {
  const context = getFieldContext(element, { options: [] }).normalizedText;
  return ["terms", "conditions", "certify", "certification", "consent", "acknowledge", "agreement"].some((word) =>
    includesPhrase(context, word)
  );
}
