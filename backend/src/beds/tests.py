from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from src.admissions.models import Admission, AdmissionRequest
from src.beds.models import Bed, BedStatusHistory
from src.common.constants import AdmissionSource, AdmissionStatus, BedStatus
from src.organizations.models import Department, DepartmentType, Hospital, Organization, Ward, WardType
from src.patients.models import Patient


class BedDomainTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            email="bed.manager@example.com",
            first_name="Bed",
            last_name="Manager",
            is_email_verified=True,
            is_phone_number_verified=True,
            onboarding_status=user_model.OnboardingStatus.COMPLETED,
        )
        self.user.set_password("safe-password-123")
        self.user.save()

        self.organization = Organization.objects.create(
            name="Health Group",
            code="HEALTH_GROUP",
            created_by=self.user,
        )
        self.hospital = Hospital.objects.create(
            organization=self.organization,
            name="General Hospital",
            code="GH",
            hospital_type="general",
            created_by=self.user,
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Medical",
            code="MED",
            department_type=DepartmentType.GENERAL_MEDICINE,
            created_by=self.user,
        )
        self.ward = Ward.objects.create(
            department=self.department,
            name="Ward A",
            code="WA",
            ward_type=WardType.MULTI,
            room_number="101",
            capacity=6,
            is_isolation_capable=True,
        )
        self.patient = Patient.objects.create(
            mrn="MRN-001",
            first_name="Ada",
            last_name="Lovelace",
            date_of_birth=date(1990, 1, 1),
            gender="F",
            primary_hospital=self.hospital,
            created_by=self.user,
        )
        self.bed = Bed.objects.create(
            ward=self.ward,
            bed_number="01",
            bed_type="general",
            is_isolation=True,
            created_by=self.user,
        )

    def test_mark_for_cleaning_creates_task_and_history(self):
        self.bed.mark_for_cleaning(user=self.user, priority="routine")
        self.bed.refresh_from_db()

        self.assertEqual(self.bed.status, BedStatus.CLEANING_REQUIRED)
        self.assertEqual(self.bed.cleaning_tasks.count(), 1)
        self.assertTrue(
            BedStatusHistory.objects.filter(
                bed=self.bed,
                status=BedStatus.CLEANING_REQUIRED,
            ).exists()
        )

    def test_assign_and_release_clears_current_admission(self):
        admission = Admission.objects.create(
            patient=self.patient,
            bed=self.bed,
            hospital=self.hospital,
            department=self.department,
            admission_source=AdmissionSource.DIRECT_ADMISSION,
            admitted_by=self.user,
            status=AdmissionStatus.ADMITTED,
            is_isolation=True,
        )

        self.bed.assign_to_admission(admission, user=self.user)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, BedStatus.OCCUPIED)
        self.assertEqual(self.bed.current_admission_id, admission.id)

        self.bed.release_from_admission(
            user=self.user,
            trigger_cleaning=True,
            cleaning_priority="isolation_clean",
        )
        self.bed.refresh_from_db()

        self.assertIsNone(self.bed.current_admission)
        self.assertIsNone(self.bed.occupied_since)
        self.assertEqual(self.bed.status, BedStatus.CLEANING_REQUIRED)
        self.assertEqual(self.bed.cleaning_tasks.count(), 1)

    def test_expired_reservation_returns_bed_to_available(self):
        admission_request = AdmissionRequest.objects.create(
            patient=self.patient,
            admission_source=AdmissionSource.DIRECT_ADMISSION,
            preferred_hospital=self.hospital,
            preferred_department=self.department,
            status=AdmissionStatus.PENDING,
            created_by=self.user,
        )

        self.bed.reserve_for_request(
            admission_request,
            user=self.user,
            until=timezone.now() - timedelta(minutes=5),
        )
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, BedStatus.RESERVED)

        available = self.bed.is_available()
        self.bed.refresh_from_db()

        self.assertTrue(available)
        self.assertEqual(self.bed.status, BedStatus.AVAILABLE)
        self.assertIsNone(self.bed.reserved_for)
