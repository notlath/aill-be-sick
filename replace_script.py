import re

with open("backend/app/api/diagnosis.py", "r") as f:
    text = f.read()

# Replace _stop_response calls to include extracted_symptoms
text = re.sub(
    r"(\b_stop_response\((?:.*?\n)*?.*?)(is_valid=is_valid,?)",
    r"\1\2\n                extracted_symptoms=extracted_symptom_ids,",
    text
)

# And similarly for _build_cdss_payload calls! Which don't always have is_valid.
# Let's just find _build_cdss_payload(..., model_used, ...) and append it.
# It's consistently:
#                 model_used,
#             )
# or
#                 is_valid=is_valid,
#             )

text = re.sub(
    r"(cdss = _build_cdss_payload\((?:.*?\n)*?.*?model_used,)(\s*\))",
    r"\1\n    extracted_symptoms=extracted_symptom_ids,\n\2",
    text
)

text = re.sub(
    r"(\"cdss\": _build_cdss_payload\((?:.*?\n)*?.*?model_used,)(\s*\))",
    r"\1\n    extracted_symptoms=extracted_symptom_ids,\n\2",
    text
)

text = re.sub(
    r"(cdss = _build_cdss_payload\((?:.*?\n)*?.*?is_valid=is_valid,)(\s*\))",
    r"\1\n    extracted_symptoms=extracted_symptom_ids,\n\2",
    text
)

# Let's do a simple replace on the string: "model_used," followed by ")"
# Let's be very careful so we don't break indentation.

with open("backend/app/api/diagnosis.py", "w") as f:
    f.write(text)

