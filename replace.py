import re

with open("backend/app/api/diagnosis.py", "r") as f:
    text = f.read()

# Add imports
text = text.replace(
    "from app.utils import _count_words, _build_cdss_payload, detect_language_heuristic",
    "from app.utils import _count_words, _build_cdss_payload, detect_language_heuristic, extract_all_symptom_qids"
)

# In new_case, after getting symptoms
text = text.replace(
    '''        if not symptoms:
            return jsonify({"error": "Symptoms cannot be empty"}), 400''',
    '''        if not symptoms:
            return jsonify({"error": "Symptoms cannot be empty"}), 400
            
        extracted_symptom_ids = extract_all_symptom_qids(symptoms, {}, EVIDENCE_KEYWORDS)'''
)

# In follow_up_question, at the end of the load session state section (around line 640)
text = text.replace(
    '''        if not symptoms_text:
            return jsonify({"error": "No symptom history found in session"}), 400''',
    '''        if not symptoms_text:
            return jsonify({"error": "No symptom history found in session"}), 400
            
        extracted_symptom_ids = extract_all_symptom_qids(symptoms_text, question_answers, EVIDENCE_KEYWORDS)'''
)

# Update _stop_response signature
text = text.replace(
    '''    is_valid=True,
    extra_fields=None,
):''',
    '''    is_valid=True,
    extra_fields=None,
    extracted_symptoms=None,
):'''
)

# Update _stop_response body
text = text.replace(
    '''                model_used,
                is_valid=is_valid,
            ),''',
    '''                model_used,
                is_valid=is_valid,
                extracted_symptoms=extracted_symptoms,
            ),'''
)

# Update _stop_response calls in diagnosis.py
# Luckily they look something like:
#         return _stop_response(
#             ...
#             is_valid=...,
#         )
# Actually, let's just do a string replacement for each
# But some do not have is_valid explicitly.
def replace_stop_response(match):
    return match.group(1) + "\n                extracted_symptoms=extracted_symptom_ids," + match.group(2)

text = re.sub(
    r"(\b_stop_response\((?:.*?\n)*?.*?is_valid=[A-Za-z]+,?)(\s*\))",
    replace_stop_response,
    text
)
# For the rest of _stop_response calls that don't pass is_valid
def replace_stop_response2(match):
    if "extracted_symptoms" not in match.group(0):
        return match.group(1) + ",\n                extracted_symptoms=extracted_symptom_ids\n" + match.group(2)
    return match.group(0)

text = re.sub(
    r"(return _stop_response\([^)]+)(?<!,)\s*(\))",
    replace_stop_response2,
    text
)

# Now manually add to the explicit _build_cdss_payload calls!
# there are 8 calls to _build_cdss_payload in diagnosis.py
# One in _stop_response (which we already fixed by replacing model_used, is_valid=is_valid, ...)
# Seven others in the body of new_case and follow_up_question. 
# They all end in `model_used,\n        )` or `model_used,\n            )`
def replace_build_cdss(match):
    # Don't replace if it's the one in _stop_response which has is_valid
    return match.group(1) + ",\n                extracted_symptoms=extracted_symptom_ids" + match.group(2)

text = re.sub(
    r"(cdss.*?_build_cdss_payload\((?:.*?\n)*?.*?model_used)(,\s*\))",
    replace_build_cdss,
    text
)

with open("backend/app/api/diagnosis.py", "w") as f:
    f.write(text)
