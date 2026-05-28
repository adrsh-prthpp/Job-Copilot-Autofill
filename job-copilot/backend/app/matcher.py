import re
from typing import Any

from .models import CustomQuestionResponse, FieldMatchResponse


SENSITIVE_KEYS = {
    "veteranStatus": ["veteran status", "protected veteran", "veteran"],
    "disabilityStatus": ["disability status", "disability"],
    "gender": ["gender", "sex"],
    "raceEthnicity": ["race ethnicity", "race", "ethnicity", "race ethnicity", "hispanic", "latino"],
    "sexualOrientation": ["sexual orientation"],
    "pronouns": ["pronouns"],
}

FIELD_PATTERNS = {
    "firstName": ["first name", "given name", "legal first name"],
    "lastName": ["last name", "family name", "surname", "legal last name"],
    "fullName": ["full name", "legal name", "preferred name"],
    "email": ["email", "email address", "e mail"],
    "phone": ["phone", "phone number", "mobile phone", "telephone", "cell"],
    "linkedin": ["linkedin", "linkedin url", "linkedin profile"],
    "website": ["website", "portfolio", "personal website", "web site"],
    "addressLine1": ["address line 1", "street address", "mailing address", "home address", "address"],
    "city": ["city"],
    "state": ["state", "province", "region"],
    "postalCode": ["postal code", "zip code", "zipcode", "zip", "postal"],
    "country": ["country"],
    "school": ["school", "university", "institution"],
    "collegeAttended": ["college attended", "school attended", "university attended", "college"],
    "degree": ["degree", "degree type"],
    "highestEducation": ["highest level of education", "highest education", "education level"],
    "major": ["major", "field of study", "area of study", "discipline"],
    "graduationDate": ["graduation date", "expected graduation", "graduation month", "graduation year"],
    "graduated": ["have you graduated", "graduated", "completed"],
    "workAuthorization": [
        "authorized to work",
        "legally authorized",
        "work authorization",
        "eligible to work",
        "authorized to work in the united states",
    ],
    "basedInUS": ["based in the united states", "are you based in the us", "are you located in the us"],
    "requireSponsorship": ["will you require sponsorship", "require sponsorship", "visa sponsorship", "immigration sponsorship"],
    "futureSponsorship": ["future sponsorship", "now or in the future require sponsorship"],
    "willingToRelocate": ["willing to relocate", "relocate", "relocation"],
    "salaryExpectations": ["salary expectations", "desired salary", "salary", "compensation"],
    "startDate": ["start date", "available start date", "availability", "available"],
}

YES_OPTIONS = ["yes", "y", "i am authorized", "i am legally authorized", "yes i am authorized"]
NO_OPTIONS = ["no", "n", "no i do not", "i do not", "no sponsorship required"]
OPTION_SYNONYMS = {
    "country": ["united states", "united states of america", "usa", "u s", "us"],
    "state": ["california", "ca"],
    "degree": ["bachelor s", "bachelors", "bachelor s degree", "bachelor degree", "undergraduate degree", "4 year degree"],
    "highestEducation": [
        "bachelor s",
        "bachelors",
        "bachelor s degree",
        "bachelor degree",
        "undergraduate degree",
        "4 year degree",
    ],
    "school": ["university of california riverside", "uc riverside", "ucr"],
    "collegeAttended": ["university of california riverside", "uc riverside", "ucr"],
    "major": ["computer science", "cs", "computer and information sciences"],
}

CUSTOM_QUESTION_PATTERNS = {
    "motivation": ["why are you interested", "why do you want", "interest in this role", "interested in this role"],
    "experience": ["describe your experience", "tell us about your experience", "relevant experience"],
    "cover_letter": ["cover letter", "additional information", "anything else"],
    "availability": ["when can you start", "availability"],
}


def normalize_text(text: str | None) -> str:
    raw = text or ""
    raw = re.sub(r"([a-z])([A-Z])", r"\1 \2", raw)
    raw = raw.lower().replace("&", " and ")
    raw = re.sub(r"[-_/.,'’]", " ", raw)
    raw = re.sub(r"[^\w\s]", " ", raw)
    return re.sub(r"\s+", " ", raw).strip()


def includes_phrase(text: str, phrase: str) -> bool:
    normalized = normalize_text(phrase)
    return bool(normalized) and f" {normalized} " in f" {text} "


def is_sensitive_field(context: str) -> str:
    normalized = normalize_text(context)
    for key, phrases in SENSITIVE_KEYS.items():
        if any(includes_phrase(normalized, phrase) for phrase in phrases):
            return key
    return ""


def match_field(
    context: str,
    field_type: str,
    available_options: list[str],
    profile: dict[str, Any],
    saved_answers: dict[str, Any],
) -> FieldMatchResponse:
    normalized = normalize_text(context)
    values = {**profile, **saved_answers}
    sensitive_key = is_sensitive_field(context)

    if includes_phrase(normalized, "county"):
        return FieldMatchResponse(reason="County is not configured for autofill")

    if sensitive_key:
        value = str(values.get(sensitive_key, "") or "")
        return FieldMatchResponse(
            matchedKey=sensitive_key,
            suggestedValue=value,
            matchedOption=match_option(available_options, value, sensitive_key),
            confidence="manual_required",
            reason="Sensitive voluntary demographic field",
        )

    if any(includes_phrase(normalized, phrase) for phrase in FIELD_PATTERNS["futureSponsorship"]):
        value = str(values.get("futureSponsorship", "") or "")
        option = match_option(available_options, value, "futureSponsorship")
        return FieldMatchResponse(
            matchedKey="futureSponsorship",
            suggestedValue=value,
            matchedOption=option,
            confidence=_confidence_for_match(field_type, available_options, value, option),
            reason="Matched sponsorship question",
        )

    for key, phrases in FIELD_PATTERNS.items():
        if any(includes_phrase(normalized, phrase) for phrase in phrases):
            value = str(values.get(key, "") or "")
            option = match_option(available_options, value, key)
            confidence = _confidence_for_match(field_type, available_options, value, option)
            return FieldMatchResponse(
                matchedKey=key,
                suggestedValue=value,
                matchedOption=option,
                confidence=confidence,
                reason=_reason_for_key(key),
            )

    return FieldMatchResponse()


def detect_custom_question(context: str, field_type: str) -> CustomQuestionResponse:
    normalized = normalize_text(context)
    is_long_form = field_type in {"textarea", "text"} and len(normalized.split()) >= 4

    for question_type, phrases in CUSTOM_QUESTION_PATTERNS.items():
        if any(includes_phrase(normalized, phrase) for phrase in phrases):
            return CustomQuestionResponse(
                isCustomQuestion=True,
                questionType=question_type,
                confidence="high",
                reason=f"Detected long-form {question_type.replace('_', ' ')} question",
            )

    if is_long_form and normalized.endswith("?"):
        return CustomQuestionResponse(
            isCustomQuestion=True,
            questionType="unknown",
            confidence="medium",
            reason="Detected long-form custom question",
        )

    return CustomQuestionResponse(isCustomQuestion=False, confidence="low", reason="No custom question detected")


def match_option(available_options: list[str], desired_value: str, matched_key: str = "") -> str:
    if not available_options or not desired_value:
        return ""

    desired_values = _desired_option_values(desired_value, matched_key)
    normalized_options = [(option, normalize_text(option)) for option in available_options]

    for original, normalized in normalized_options:
        if normalized in desired_values:
            return original

    for original, normalized in normalized_options:
        if any(value in normalized or normalized in value for value in desired_values if value):
            return original

    return ""


def _desired_option_values(desired_value: str, matched_key: str) -> set[str]:
    desired = normalize_text(desired_value)
    if desired == "yes":
        return {normalize_text(value) for value in YES_OPTIONS}
    if desired == "no":
        return {normalize_text(value) for value in NO_OPTIONS}
    return {desired, *OPTION_SYNONYMS.get(matched_key, [])}


def _confidence_for_match(field_type: str, available_options: list[str], value: str, option: str) -> str:
    if not value:
        return "low"
    if available_options and not option:
        return "low"
    if field_type in {"customDropdown", "listbox", "combobox"}:
        return "medium"
    return "high"


def _reason_for_key(key: str) -> str:
    reasons = {
        "requireSponsorship": "Matched sponsorship question",
        "futureSponsorship": "Matched sponsorship question",
        "workAuthorization": "Matched work authorization question",
        "basedInUS": "Matched US location question",
        "highestEducation": "Matched education level synonym",
    }
    return reasons.get(key, f"Matched {key} field")
