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
  state: "",
  country: "United States",
  school: "Irvine High School",
  degree: "Bachelor's",
  major: "Computer Science",
  graduationDate: "December 15, 2025"
};

const DEFAULT_SAVED_ANSWERS = {
  workAuthorization: "Yes",
  requireSponsorship: "No",
  willingToRelocate: "",
  salaryExpectations: "",
  startDate: "",
  veteranStatus: "",
  disabilityStatus: "",
  gender: "",
  raceEthnicity: ""
};

const FILLABLE_KEYS = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "linkedin",
  "website",
  "addressLine1",
  "city",
  "state",
  "country",
  "school",
  "degree",
  "major",
  "graduationDate",
  "workAuthorization",
  "requireSponsorship",
  "willingToRelocate",
  "salaryExpectations",
  "startDate"
];

const MANUAL_REVIEW_KEYS = ["veteranStatus", "disabilityStatus", "gender", "raceEthnicity"];
const CONFIDENCE_RANK = {
  low: 1,
  medium: 2,
  high: 3
};

const FIELD_PATTERNS = {
  firstName: {
    high: ["first name", "firstname", "given name", "legal first name"],
    medium: ["first"]
  },
  lastName: {
    high: ["last name", "lastname", "family name", "surname", "legal last name"],
    medium: ["last"]
  },
  fullName: {
    high: ["full name"],
    medium: ["name", "legal name", "preferred name"]
  },
  email: {
    high: ["email address", "email", "e mail"],
    medium: []
  },
  phone: {
    high: ["phone number", "phone", "mobile phone", "telephone", "cell phone"],
    medium: ["mobile", "cell"]
  },
  linkedin: {
    high: ["linkedin url", "linkedin profile", "linkedin"],
    medium: ["linked in"]
  },
  website: {
    high: ["portfolio website", "personal website", "website"],
    medium: ["portfolio", "profile", "url", "web site"]
  },
  addressLine1: {
    high: ["address line 1", "street address", "mailing address", "home address"],
    medium: ["address"]
  },
  city: {
    high: ["city"],
    medium: ["current city"]
  },
  state: {
    high: ["state", "province"],
    medium: ["region"]
  },
  country: {
    high: ["country"],
    medium: ["location"]
  },
  school: {
    high: ["school", "university", "college"],
    medium: ["institution"]
  },
  degree: {
    high: ["degree", "degree type"],
    medium: ["qualification"]
  },
  major: {
    high: ["major", "field of study"],
    medium: ["area of study", "discipline"]
  },
  graduationDate: {
    high: ["graduation date", "grad date"],
    medium: ["graduated", "completion date"]
  },
  workAuthorization: {
    high: ["authorized to work", "work authorization", "eligible to work"],
    medium: ["authorized", "legally authorized"]
  },
  requireSponsorship: {
    high: ["require sponsorship", "need sponsorship", "visa sponsorship"],
    medium: ["sponsorship", "future sponsorship"]
  },
  willingToRelocate: {
    high: ["willing to relocate", "relocation"],
    medium: ["relocate"]
  },
  salaryExpectations: {
    high: ["salary expectations", "desired salary", "expected salary"],
    medium: ["salary", "compensation"]
  },
  startDate: {
    high: ["start date", "available start date"],
    medium: ["availability", "available"]
  },
  veteranStatus: {
    high: [],
    medium: ["veteran status", "protected veteran", "veteran"]
  },
  disabilityStatus: {
    high: [],
    medium: ["disability status", "disability"]
  },
  gender: {
    high: [],
    medium: ["gender", "sex"]
  },
  raceEthnicity: {
    high: [],
    medium: ["race ethnicity", "race", "ethnicity", "hispanic", "latino"]
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return false;
  }

  if (message.action === "SCAN_FIELDS") {
    scanFields()
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "FILL_HIGH_CONFIDENCE" || message.action === "FILL_BY_CONFIDENCE") {
    fillByConfidence(message.minimumConfidence || "high")
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function loadProfileAndAnswers() {
  const stored = await chrome.storage.local.get(["profile", "savedAnswers"]);

  return {
    profile: { ...DEFAULT_PROFILE, ...(stored.profile || {}) },
    savedAnswers: { ...DEFAULT_SAVED_ANSWERS, ...(stored.savedAnswers || {}) }
  };
}

async function scanFields() {
  const { profile, savedAnswers } = await loadProfileAndAnswers();
  const fields = getCandidateFields();

  return fields.map((element, index) => {
    const context = getFieldContext(element);
    const match = matchField(context, profile, savedAnswers);

    return {
      index,
      tagName: element.tagName,
      type: element.type || "",
      context: context.displayText,
      matchedKey: match.matchedKey,
      valuePreview: match.value || "",
      confidence: match.confidence,
      reason: match.reason
    };
  });
}

function getCandidateFields() {
  return Array.from(document.querySelectorAll("input, textarea, select")).filter((element) => {
    if (element.disabled || element.readOnly) {
      return false;
    }

    if (isHiddenElement(element)) {
      return false;
    }

    if (element.tagName.toLowerCase() === "input") {
      const type = (element.type || "text").toLowerCase();
      const blockedTypes = [
        "button",
        "checkbox",
        "color",
        "file",
        "hidden",
        "image",
        "password",
        "radio",
        "range",
        "reset",
        "submit"
      ];

      if (blockedTypes.includes(type)) {
        return false;
      }
    }

    return isEmptyField(element);
  });
}

function isHiddenElement(element) {
  const type = (element.type || "").toLowerCase();
  if (type === "hidden" || element.hidden) {
    return true;
  }

  const style = window.getComputedStyle(element);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    (element.offsetParent === null && style.position !== "fixed")
  );
}

function isEmptyField(element) {
  if (element.tagName.toLowerCase() === "select") {
    return !element.value;
  }

  return !element.value || !element.value.trim();
}

function getFieldContext(element) {
  const parts = {
    label: getAssociatedLabelText(element),
    placeholder: element.getAttribute("placeholder") || "",
    name: element.getAttribute("name") || "",
    id: element.id || "",
    ariaLabel: element.getAttribute("aria-label") || "",
    autocomplete: element.getAttribute("autocomplete") || "",
    nearbyText: getNearbyText(element),
    previousSiblingText: getPreviousSiblingText(element)
  };
  const displayText = firstUsefulText(parts) || parts.name || parts.id || `${element.tagName} field`;
  const allText = Object.values(parts).filter(Boolean).join(" ");

  return {
    parts,
    displayText: compactText(displayText, 80),
    normalizedText: normalizeText(allText),
    normalizedParts: Object.fromEntries(
      Object.entries(parts).map(([key, value]) => [key, normalizeText(value)])
    )
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

function getNearbyText(element) {
  const container = element.closest("label, div, section, fieldset, li, p");
  if (!container) {
    return "";
  }

  return compactText(container.innerText || container.textContent || "", 220);
}

function getPreviousSiblingText(element) {
  let sibling = element.previousElementSibling;
  let steps = 0;

  while (sibling && steps < 2) {
    const text = compactText(sibling.innerText || sibling.textContent || "", 120);
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
    parts.ariaLabel ||
    parts.placeholder ||
    parts.autocomplete ||
    parts.previousSiblingText ||
    parts.nearbyText
  );
}

function compactText(text, maxLength) {
  const compacted = String(text || "").replace(/\s+/g, " ").trim();
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 3)}...` : compacted;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchField(context, profile, savedAnswers) {
  const values = { ...profile, ...savedAnswers };
  const sensitiveMatch = findSensitiveMatch(context);

  if (sensitiveMatch) {
    return {
      matchedKey: sensitiveMatch,
      value: values[sensitiveMatch] || "",
      confidence: "low",
      reason: "Sensitive demographic field requires manual review."
    };
  }

  const typeMatch = matchByInputType(context, values);
  if (typeMatch) {
    return typeMatch;
  }

  for (const key of [...FILLABLE_KEYS, ...MANUAL_REVIEW_KEYS]) {
    const value = values[key] || "";
    const score = getConfidenceScore(context, key);

    if (score.confidence !== "low" || score.reason.includes("Matched")) {
      return {
        matchedKey: key,
        value,
        confidence: value ? score.confidence : "low",
        reason: value ? score.reason : `Matched ${key}, but no saved value exists.`
      };
    }
  }

  return {
    matchedKey: "",
    value: "",
    confidence: "low",
    reason: "No clear field match."
  };
}

function findSensitiveMatch(context) {
  for (const key of MANUAL_REVIEW_KEYS) {
    const patterns = FIELD_PATTERNS[key].medium;
    if (patterns.some((pattern) => includesPhrase(context.normalizedText, pattern))) {
      return key;
    }
  }

  const sensitiveWords = ["social security", "ssn", "date of birth", "captcha"];
  return sensitiveWords.some((word) => includesPhrase(context.normalizedText, word)) ? "raceEthnicity" : "";
}

function matchByInputType(context, values) {
  const autocomplete = context.normalizedParts.autocomplete;

  const autocompleteMap = {
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
    country: "country"
  };

  if (autocompleteMap[autocomplete] && values[autocompleteMap[autocomplete]]) {
    const key = autocompleteMap[autocomplete];
    return {
      matchedKey: key,
      value: values[key],
      confidence: "high",
      reason: `Matched autocomplete: ${autocomplete}`
    };
  }

  return null;
}

function getConfidenceScore(context, matchedKey) {
  const patterns = FIELD_PATTERNS[matchedKey];
  if (!patterns) {
    return { confidence: "low", reason: "Unknown field type." };
  }

  for (const phrase of patterns.high) {
    if (matchesImportantPart(context, phrase)) {
      return { confidence: "high", reason: `Matched exact phrase: ${phrase}` };
    }
  }

  for (const phrase of patterns.medium) {
    if (includesPhrase(context.normalizedText, phrase)) {
      return { confidence: "medium", reason: `Matched possible phrase: ${phrase}` };
    }
  }

  return { confidence: "low", reason: "No clear phrase match." };
}

function matchesImportantPart(context, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  const importantParts = [
    context.normalizedParts.label,
    context.normalizedParts.ariaLabel,
    context.normalizedParts.placeholder,
    context.normalizedParts.name,
    context.normalizedParts.id,
    context.normalizedParts.autocomplete,
    context.normalizedParts.previousSiblingText
  ];

  return importantParts.some((part) => includesPhrase(part, normalizedPhrase));
}

function includesPhrase(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

async function fillByConfidence(minimumConfidence) {
  const scanned = await scanFields();
  const fields = getCandidateFields();
  const minimumRank = CONFIDENCE_RANK[minimumConfidence] || CONFIDENCE_RANK.high;
  const filled = [];
  let filledCount = 0;

  scanned.forEach((result) => {
    const element = fields[result.index];
    const resultRank = CONFIDENCE_RANK[result.confidence] || 0;

    if (
      !element ||
      resultRank < minimumRank ||
      !result.valuePreview ||
      MANUAL_REVIEW_KEYS.includes(result.matchedKey)
    ) {
      return;
    }

    if (fillField(element, result.valuePreview)) {
      filledCount += 1;
      filled.push(result);
    }
  });

  return {
    detectedCount: scanned.length,
    filledCount,
    skippedCount: scanned.length - filledCount,
    filled
  };
}

function fillField(element, value) {
  if (!isEmptyField(element) || element.disabled || element.readOnly || isHiddenElement(element)) {
    return false;
  }

  if (element.tagName.toLowerCase() === "select") {
    return fillSelect(element, value);
  }

  element.focus();
  element.value = value;
  dispatchFieldEvents(element);
  return true;
}

function fillSelect(select, value) {
  const normalizedValue = normalizeText(value);
  const option = Array.from(select.options).find((item) => {
    const optionText = normalizeText(item.textContent || "");
    const optionValue = normalizeText(item.value || "");

    return (
      optionText === normalizedValue ||
      optionValue === normalizedValue ||
      optionText.includes(normalizedValue) ||
      normalizedValue.includes(optionText)
    );
  });

  if (!option) {
    return false;
  }

  select.value = option.value;
  dispatchFieldEvents(select);
  return true;
}

function dispatchFieldEvents(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}
