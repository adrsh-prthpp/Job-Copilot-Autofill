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

const FIELD_LABELS = {
  firstName: "First Name",
  lastName: "Last Name",
  fullName: "Full Name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
  website: "Website",
  addressLine1: "Address Line 1",
  city: "City",
  state: "State",
  postalCode: "Postal Code",
  country: "Country",
  school: "School",
  collegeAttended: "College Attended",
  degree: "Degree",
  highestEducation: "Highest Education",
  major: "Major",
  graduationDate: "Graduation Date",
  graduated: "Graduated",
  workAuthorization: "Work Authorization",
  basedInUS: "Based In US",
  requireSponsorship: "Require Sponsorship",
  futureSponsorship: "Future Sponsorship",
  willingToRelocate: "Willing To Relocate",
  salaryExpectations: "Salary Expectations",
  startDate: "Start Date",
  veteranStatus: "Veteran Status",
  disabilityStatus: "Disability Status",
  gender: "Gender",
  raceEthnicity: "Race/Ethnicity",
  sexualOrientation: "Sexual Orientation",
  pronouns: "Pronouns"
};

const profileFields = document.getElementById("profileFields");
const answerFields = document.getElementById("answerFields");
const settingsForm = document.getElementById("settingsForm");
const resetButton = document.getElementById("resetButton");
const settingsStatus = document.getElementById("settingsStatus");
const backendEnabled = document.getElementById("backendEnabled");
const backendUrl = document.getElementById("backendUrl");

function createField(groupName, key, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-field";

  const label = document.createElement("label");
  label.setAttribute("for", `${groupName}-${key}`);
  label.textContent = FIELD_LABELS[key] || key;

  const input = document.createElement("input");
  input.id = `${groupName}-${key}`;
  input.name = key;
  input.dataset.group = groupName;
  input.value = value || "";

  wrapper.append(label, input);
  return wrapper;
}

function renderFields(profile, savedAnswers) {
  profileFields.textContent = "";
  answerFields.textContent = "";

  Object.keys(DEFAULT_PROFILE).forEach((key) => {
    profileFields.appendChild(createField("profile", key, profile[key]));
  });

  Object.keys(DEFAULT_SAVED_ANSWERS).forEach((key) => {
    answerFields.appendChild(createField("savedAnswers", key, savedAnswers[key]));
  });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(["profile", "savedAnswers", "backendSettings"]);
  const profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  const savedAnswers = { ...DEFAULT_SAVED_ANSWERS, ...(stored.savedAnswers || {}) };
  const backendSettings = { ...DEFAULT_BACKEND_SETTINGS, ...(stored.backendSettings || {}) };

  renderFields(profile, savedAnswers);
  backendEnabled.checked = Boolean(backendSettings.backendEnabled);
  backendUrl.value = backendSettings.backendUrl;
}

function readFormValues() {
  const profile = {};
  const savedAnswers = {};
  const inputs = settingsForm.querySelectorAll("input[data-group]");

  inputs.forEach((input) => {
    if (input.dataset.group === "profile") {
      profile[input.name] = input.value.trim();
    } else {
      savedAnswers[input.name] = input.value.trim();
    }
  });

  return {
    profile,
    savedAnswers,
    backendSettings: {
      backendEnabled: backendEnabled.checked,
      backendUrl: backendUrl.value.trim() || DEFAULT_BACKEND_SETTINGS.backendUrl
    }
  };
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = readFormValues();
  await chrome.storage.local.set(values);
  settingsStatus.textContent = "Settings saved.";
});

resetButton.addEventListener("click", async () => {
  await chrome.storage.local.set({
    profile: DEFAULT_PROFILE,
    savedAnswers: DEFAULT_SAVED_ANSWERS,
    backendSettings: DEFAULT_BACKEND_SETTINGS
  });

  renderFields(DEFAULT_PROFILE, DEFAULT_SAVED_ANSWERS);
  backendEnabled.checked = DEFAULT_BACKEND_SETTINGS.backendEnabled;
  backendUrl.value = DEFAULT_BACKEND_SETTINGS.backendUrl;
  settingsStatus.textContent = "Defaults restored.";
});

loadSettings().catch((error) => {
  settingsStatus.textContent = `Could not load settings: ${error.message}`;
});
