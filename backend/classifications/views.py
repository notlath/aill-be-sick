from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


def index(request):
    return JsonResponse({"message": "Hello, world!"})


@csrf_exempt
def new_case(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        symptoms = data.get("symptoms", [])

        print("Detecting disease for symptoms:", symptoms)

        # Insert machine learning stuff
        detected_disease = "Jabetis"  # Placeholder for actual disease detection logic

        return JsonResponse({"data": detected_disease}, status=201)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)
