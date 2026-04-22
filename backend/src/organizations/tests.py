from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from src.organizations.models import (
	Organization,
	OrganizationInvitation,
	OrganizationInvitationStatus,
	OrganizationMembership,
	OrganizationMembershipStatus,
	OrganizationRole,
	OrganizationRoleType,
)
from src.organizations.views import (
	OrganizationInvitationViewSet,
	OrganizationRoleViewSet,
	OrganizationViewSet,
)
from src.users.models import OnboardingStatus, User


class OrganizationApiTests(TestCase):
	def setUp(self):
		self.factory = APIRequestFactory()
		self.password = "StrongPass123!"

		self.owner = self._create_verified_user(
			username="owner_user",
			email="owner@example.com",
		)
		self.member = self._create_verified_user(
			username="member_user",
			email="member@example.com",
		)
		self.other = self._create_verified_user(
			username="other_user",
			email="other@example.com",
		)

	def _create_verified_user(self, *, username, email):
		user = User.objects.create_user(
			username=username,
			email=email,
			password=self.password,
			is_active=True,
		)
		user.onboarding_status = OnboardingStatus.COMPLETED
		user.save(update_fields=["onboarding_status"])
		return user

	def _create_organization_via_api(self, user, *, name="Acme Org"):
		view = OrganizationViewSet.as_view({"post": "create"})
		request = self.factory.post(
			"/api/v1/organizations/",
			{
				"name": name,
				"description": "Primary org",
				"status": "active",
				"settings": {"timezone": "UTC"},
			},
			format="json",
		)
		force_authenticate(request, user=user)
		response = view(request)
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		return Organization.objects.get(pk=response.data["id"])

	def test_create_organization_creates_owner_membership_and_default_roles(self):
		organization = self._create_organization_via_api(self.owner)

		owner_membership = OrganizationMembership.objects.filter(
			organization=organization,
			user=self.owner,
			status=OrganizationMembershipStatus.ACTIVE,
		).select_related("role").first()

		self.assertIsNotNone(owner_membership)
		self.assertEqual(owner_membership.role.role_type, OrganizationRoleType.OWNER)

		role_types = set(
			OrganizationRole.objects.filter(organization=organization, is_system=True).values_list(
				"role_type", flat=True
			)
		)
		self.assertIn(OrganizationRoleType.OWNER, role_types)
		self.assertIn(OrganizationRoleType.ADMIN, role_types)
		self.assertIn(OrganizationRoleType.MEMBER, role_types)

	def test_non_member_cannot_list_roles(self):
		organization = self._create_organization_via_api(self.owner)

		view = OrganizationRoleViewSet.as_view({"get": "list"})
		request = self.factory.get(f"/api/v1/organizations/{organization.id}/roles/")
		force_authenticate(request, user=self.other)

		response = view(request, organization_id=str(organization.id))
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_owner_can_create_custom_role(self):
		organization = self._create_organization_via_api(self.owner)

		view = OrganizationRoleViewSet.as_view({"post": "create"})
		request = self.factory.post(
			f"/api/v1/organizations/{organization.id}/roles/",
			{
				"name": "Billing Admin",
				"permissions": {"manage_billing": True},
			},
			format="json",
		)
		force_authenticate(request, user=self.owner)

		response = view(request, organization_id=str(organization.id))
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)

		role = OrganizationRole.objects.get(pk=response.data["id"])
		self.assertEqual(role.role_type, OrganizationRoleType.CUSTOM)
		self.assertFalse(role.is_system)

	def test_accept_invitation_creates_membership(self):
		organization = self._create_organization_via_api(self.owner)
		member_role = OrganizationRole.objects.get(
			organization=organization,
			role_type=OrganizationRoleType.MEMBER,
			is_system=True,
		)

		create_invite_view = OrganizationInvitationViewSet.as_view({"post": "create"})
		invite_request = self.factory.post(
			f"/api/v1/organizations/{organization.id}/invitations/",
			{
				"email": self.member.email,
				"role_id": str(member_role.id),
			},
			format="json",
		)
		force_authenticate(invite_request, user=self.owner)
		invite_response = create_invite_view(invite_request, organization_id=str(organization.id))
		self.assertEqual(invite_response.status_code, status.HTTP_201_CREATED)

		invitation = OrganizationInvitation.objects.get(pk=invite_response.data["id"])

		accept_view = OrganizationInvitationViewSet.as_view({"post": "accept"})
		accept_request = self.factory.post(
			f"/api/v1/organizations/{organization.id}/invitations/{invitation.id}/accept/",
			{"token": invitation.token},
			format="json",
		)
		force_authenticate(accept_request, user=self.member)
		accept_response = accept_view(
			accept_request,
			organization_id=str(organization.id),
			pk=str(invitation.id),
		)
		self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

		invitation.refresh_from_db()
		self.assertEqual(invitation.status, OrganizationInvitationStatus.ACCEPTED)

		membership = OrganizationMembership.objects.filter(
			organization=organization,
			user=self.member,
			status=OrganizationMembershipStatus.ACTIVE,
		).select_related("role").first()
		self.assertIsNotNone(membership)
		self.assertEqual(membership.role.role_type, OrganizationRoleType.MEMBER)

	def test_member_cannot_delete_organization(self):
		organization = self._create_organization_via_api(self.owner)
		member_role = OrganizationRole.objects.get(
			organization=organization,
			role_type=OrganizationRoleType.MEMBER,
			is_system=True,
		)
		OrganizationMembership.objects.create(
			organization=organization,
			user=self.member,
			role=member_role,
			invited_by=self.owner,
			status=OrganizationMembershipStatus.ACTIVE,
		)

		delete_view = OrganizationViewSet.as_view({"delete": "destroy"})
		request = self.factory.delete(f"/api/v1/organizations/{organization.id}/")
		force_authenticate(request, user=self.member)

		response = delete_view(request, pk=str(organization.id))
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
