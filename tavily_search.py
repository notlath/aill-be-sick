import urllib.request
import json

api_key = "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"
url = "https://api.tavily.com/search"
data = {
    "api_key": api_key,
    "query": "clinical severity triage for Dengue Typhoid Pneumonia outpatient vs inpatient warning signs",
    "search_depth": "advanced",
    "include_answer": True,
    "max_results": 4
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print(result.get('answer', 'No answer key'))
except Exception as e:
    print(e)
