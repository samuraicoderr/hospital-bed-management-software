from rest_framework.routers import SimpleRouter
from .views import CleaningTaskViewSet, HousekeepingStaffViewSet

housekeeping_router = SimpleRouter()
housekeeping_router.register(r"cleaning-tasks", CleaningTaskViewSet, basename="cleaning-task")
housekeeping_router.register(r"housekeeping-staff", HousekeepingStaffViewSet, basename="housekeeping-staff")
