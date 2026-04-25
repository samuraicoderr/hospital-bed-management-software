"""
ViewSets for organization management.
Per requirements section 4.7 - Multi-hospital support.
"""

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from src.lib.django.views_mixin import ViewSetHelperMixin
from src.users.permissions import IsVerifiedUser
from src.organizations.models import (
    Organization,
    Hospital,
    Building,
    Department,
    Ward,
    HospitalStaff,
    HospitalStaffInvitation,
    HospitalStaffInvitationStatus,
)
from src.organizations.serializers import (
    OrganizationSerializer,
    HospitalListSerializer,
    HospitalDetailSerializer,
    HospitalWriteSerializer,
    BuildingSerializer,
    DepartmentSerializer,
    WardSerializer,
    WardListSerializer,
    HospitalStaffSerializer,
    HospitalStaffInvitationSerializer,
    CreateHospitalStaffInvitationSerializer,
    AcceptHospitalStaffInvitationSerializer,
)
from src.organizations.services import HospitalAccessService, HospitalInvitationService, ORG_MANAGEMENT_ROLES


class OrganizationViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": OrganizationSerializer}
    permissions = {"default": [IsVerifiedUser]}
    _do_not_override_filters = True

    def get_queryset(self):
        return Organization.objects.filter(
            Q(created_by=self.request.user) | Q(hospitals__staff__user=self.request.user, hospitals__staff__is_active=True),
            is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.created_by_id != self.request.user.id:
            raise PermissionDenied("Only the organization owner can update organization details.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.created_by_id != self.request.user.id:
            raise PermissionDenied("Only the organization owner can deactivate this organization.")
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted", "updated_at"])


class HospitalViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": HospitalDetailSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["organization", "hospital_type", "is_active"]

    def get_serializer_class(self):
        if self.action == "list":
            return HospitalListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return HospitalWriteSerializer
        if self.action == "invite_staff":
            return CreateHospitalStaffInvitationSerializer
        return HospitalDetailSerializer

    def get_queryset(self):
        return (
            Hospital.objects.filter(
                Q(organization__created_by=self.request.user) | Q(staff__user=self.request.user, staff__is_active=True),
                is_active=True,
            )
            .select_related("organization")
            .prefetch_related("staff")
            .distinct()
        )

    def perform_create(self, serializer):
        organization = serializer.validated_data["organization"]
        if organization.created_by_id != self.request.user.id:
            raise PermissionDenied("Only the organization owner can create hospitals.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        HospitalAccessService.require_org_management(serializer.instance, self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        HospitalAccessService.require_org_management(instance, self.request.user)
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted", "updated_at"])

    @action(detail=True, methods=["get"])
    def departments(self, request, pk=None):
        hospital = self.get_object()
        HospitalAccessService.require_view_access(hospital, request.user)
        departments = Department.objects.filter(hospital=hospital, is_active=True).order_by("name")
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def buildings(self, request, pk=None):
        hospital = self.get_object()
        HospitalAccessService.require_view_access(hospital, request.user)
        buildings = Building.objects.filter(hospital=hospital, is_active=True).order_by("name")
        serializer = BuildingSerializer(buildings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def staff(self, request, pk=None):
        hospital = self.get_object()
        HospitalAccessService.require_view_access(hospital, request.user)
        staff = (
            HospitalStaff.objects.filter(hospital=hospital, is_active=True)
            .select_related("user", "department", "hospital")
            .order_by("user__first_name", "user__last_name")
        )
        serializer = HospitalStaffSerializer(staff, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def pending_invites(self, request, pk=None):
        hospital = self.get_object()
        HospitalAccessService.require_org_management(hospital, request.user)
        invites = HospitalStaffInvitation.objects.filter(
            hospital=hospital,
            status=HospitalStaffInvitationStatus.PENDING,
        ).select_related("department", "hospital", "invited_by")
        serializer = HospitalStaffInvitationSerializer(invites, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def invite_staff(self, request, pk=None):
        hospital = self.get_object()
        serializer = CreateHospitalStaffInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        department = None
        department_id = serializer.validated_data.get("department")
        if department_id:
            department = Department.objects.filter(id=department_id, hospital=hospital, is_active=True).first()
            if not department:
                return Response(
                    {"department": "Department not found in this hospital."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        invitation = HospitalInvitationService.create_invitation(
            hospital=hospital,
            invited_by=request.user,
            email=serializer.validated_data["email"],
            role=serializer.validated_data["role"],
            department=department,
            employee_id=serializer.validated_data.get("employee_id", ""),
            message=serializer.validated_data.get("message", ""),
        )
        out = HospitalStaffInvitationSerializer(invitation)
        return Response(out.data, status=status.HTTP_201_CREATED)


class BuildingViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": BuildingSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filterset_fields = ["hospital"]

    def get_queryset(self):
        return (
            Building.objects.filter(
                Q(hospital__organization__created_by=self.request.user)
                | Q(hospital__staff__user=self.request.user, hospital__staff__is_active=True),
                is_active=True,
            )
            .select_related("hospital", "hospital__organization")
            .distinct()
        )

    def perform_create(self, serializer):
        hospital = serializer.validated_data["hospital"]
        HospitalAccessService.require_structure_management(hospital, self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        HospitalAccessService.require_structure_management(serializer.instance.hospital, self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        HospitalAccessService.require_structure_management(instance.hospital, self.request.user)
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted", "updated_at"])


class DepartmentViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": DepartmentSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filterset_fields = ["hospital", "department_type", "gender_restriction"]
    search_fields = ["name", "code"]

    def get_queryset(self):
        return (
            Department.objects.filter(
                Q(hospital__organization__created_by=self.request.user)
                | Q(hospital__staff__user=self.request.user, hospital__staff__is_active=True),
                is_active=True,
            )
            .select_related("hospital", "hospital__organization", "building")
            .distinct()
        )

    def perform_create(self, serializer):
        hospital = serializer.validated_data["hospital"]
        HospitalAccessService.require_structure_management(hospital, self.request.user)
        building = serializer.validated_data.get("building")
        if building and building.hospital_id != hospital.id:
            raise ValidationError({"building": "Building must belong to the same hospital as the department."})
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        hospital = serializer.instance.hospital
        HospitalAccessService.require_structure_management(hospital, self.request.user)
        building = serializer.validated_data.get("building")
        if building and building.hospital_id != hospital.id:
            raise ValidationError({"building": "Building must belong to the same hospital as the department."})
        serializer.save()

    def perform_destroy(self, instance):
        HospitalAccessService.require_structure_management(instance.hospital, self.request.user)
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted", "updated_at"])

    @action(detail=True, methods=["get"])
    def wards(self, request, pk=None):
        department = self.get_object()
        HospitalAccessService.require_view_access(department.hospital, request.user)
        wards = Ward.objects.filter(department=department, is_active=True).order_by("name")
        serializer = WardListSerializer(wards, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def available_beds(self, request, pk=None):
        department = self.get_object()
        HospitalAccessService.require_view_access(department.hospital, request.user)
        beds = department.get_available_beds()
        from src.beds.serializers import BedListSerializer
        serializer = BedListSerializer(beds, many=True)
        return Response(serializer.data)


class WardViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {"default": WardSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filterset_fields = ["department", "ward_type"]

    def get_queryset(self):
        return (
            Ward.objects.filter(
                Q(department__hospital__organization__created_by=self.request.user)
                | Q(department__hospital__staff__user=self.request.user, department__hospital__staff__is_active=True),
                is_active=True,
            )
            .select_related("department", "department__hospital", "department__hospital__organization")
            .distinct()
        )

    def perform_create(self, serializer):
        department = serializer.validated_data["department"]
        HospitalAccessService.require_structure_management(department.hospital, self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        department = serializer.instance.department
        HospitalAccessService.require_structure_management(department.hospital, self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        HospitalAccessService.require_structure_management(instance.department.hospital, self.request.user)
        instance.is_active = False
        instance.is_deleted = True
        instance.save(update_fields=["is_active", "is_deleted", "updated_at"])


class HospitalStaffViewSet(ViewSetHelperMixin, viewsets.ModelViewSet):
    serializers = {
        "default": HospitalStaffSerializer,
        "accept_invitation": AcceptHospitalStaffInvitationSerializer,
    }
    permissions = {"default": [IsVerifiedUser]}
    filterset_fields = ["hospital", "department", "role"]

    def get_queryset(self):
        return (
            HospitalStaff.objects.filter(
                Q(hospital__organization__created_by=self.request.user)
                | Q(hospital__staff__user=self.request.user, hospital__staff__is_active=True),
                is_active=True,
            )
            .select_related("hospital", "hospital__organization", "department", "user")
            .distinct()
        )

    def perform_update(self, serializer):
        HospitalAccessService.require_org_management(serializer.instance.hospital, self.request.user)
        serializer.save()

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Direct staff creation is not allowed. Use invite_staff and invitation acceptance flow."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def perform_destroy(self, instance):
        HospitalAccessService.require_org_management(instance.hospital, self.request.user)
        if instance.role == "owner":
            raise ValidationError({"detail": "Owner assignment cannot be removed from this endpoint."})
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    @action(detail=False, methods=["post"])
    def accept_invitation(self, request):
        serializer = AcceptHospitalStaffInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = HospitalStaffInvitation.objects.filter(
            token=serializer.validated_data["token"],
        ).select_related("hospital", "department").first()
        if not invitation:
            return Response({"token": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        staff = HospitalInvitationService.accept_invitation(invitation=invitation, user=request.user)
        return Response(
            HospitalStaffSerializer(staff, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class HospitalStaffInvitationViewSet(ViewSetHelperMixin, viewsets.ReadOnlyModelViewSet):
    serializers = {"default": HospitalStaffInvitationSerializer}
    permissions = {"default": [IsVerifiedUser]}
    filterset_fields = ["hospital", "status"]

    def get_queryset(self):
        email = (self.request.user.email or "").lower()
        manageable_hospital_ids = HospitalStaff.objects.filter(
            user=self.request.user,
            is_active=True,
            role__in=ORG_MANAGEMENT_ROLES,
        ).values_list("hospital_id", flat=True)
        return HospitalStaffInvitation.objects.filter(
            Q(hospital__organization__created_by=self.request.user)
            | Q(hospital_id__in=manageable_hospital_ids)
            | Q(email=email),
        ).select_related("hospital", "department", "invited_by")
