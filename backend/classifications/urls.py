from django.urls import path
from . import views

urlpatterns = [
    path('new', views.new_case, name="new_case"),
    path('', views.index, name="index")
]
