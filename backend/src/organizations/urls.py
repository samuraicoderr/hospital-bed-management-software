from rest_framework.routers import SimpleRouter

from src.organizations.views import (
	OrganizationAuditLogViewSet,
	OrganizationInvitationViewSet,
	OrganizationMembershipViewSet,
	OrganizationResourceViewSet,
	OrganizationRoleViewSet,
	OrganizationSettingViewSet,
	OrganizationViewSet,
)

org_router = SimpleRouter()
org_router.register(r"organizations", OrganizationViewSet, basename="organizations")
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/roles",
	OrganizationRoleViewSet,
	basename="organization-roles",
)
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/memberships",
	OrganizationMembershipViewSet,
	basename="organization-memberships",
)
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/resources",
	OrganizationResourceViewSet,
	basename="organization-resources",
)
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/settings",
	OrganizationSettingViewSet,
	basename="organization-settings",
)
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/invitations",
	OrganizationInvitationViewSet,
	basename="organization-invitations",
)
org_router.register(
	r"organizations/(?P<organization_id>[^/.]+)/audit-logs",
	OrganizationAuditLogViewSet,
	basename="organization-audit-logs",
)