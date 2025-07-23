from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('classifications/', include('classifications.urls')),
    path('admin/', admin.site.urls),
]
