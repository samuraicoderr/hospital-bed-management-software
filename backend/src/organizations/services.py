from rest_framework.exceptions import ValidationError

from .models import (
    HospitalStaffRole,
    Organization,
    Hospital,
    Building,
    Department,
    Ward,
    HospitalStaff,
)

def clean_model_fields(model, data):
    allowed_fields = {f.name for f in model._meta.fields}
    return {k: v for k, v in data.items() if k in allowed_fields}


class HospitalService:
    @staticmethod
    def get_hospital_by_id(hospital_id):
        from .models import Hospital
        try:
            return Hospital.objects.get(id=hospital_id)
        except Hospital.DoesNotExist:
            return None
    
    @staticmethod
    def create_or_join_first_hospital(user, hospital_data):
        """Create a new hospital or join an existing one if it matches the name."""
        org_id = hospital_data.get("organization_id")
        hospital_id = hospital_data.get("id")        
        

        if org_id:
            organization = Organization.objects.filter(
                id=org_id,
                created_by=user
            ).first()
            if not organization:
                raise ValidationError("Organization not found.")
        else:
            organization, created = Organization.objects.get_or_create(
                created_by=user,
                defaults={
                    "name": f"Default Organization for {user.username}",
                    "code": f"DEFAULT-{str(user.id)[:8].upper()}",
                    "is_active": True,
                }
            )
        
        role = HospitalStaffRole.OWNER
        if hospital_id:
            raise ValidationError("Not Implemented")
            # Users should be invited to join the hospital by an admin.
            hospital = Hospital.objects.filter(id=hospital_id, organization=organization).first()
            if not hospital:
                raise ValidationError("Hospital not found in the specified organization.")
        else:
            hospital = Hospital.objects.create(
                **clean_model_fields(Hospital, hospital_data),
                organization=organization,
                created_by=user
            )
        
        staff = HospitalStaff.objects.create(
            user=user,
            hospital=hospital,
            role=role,
            assigned_by=user
        )

        return (
            organization,
            hospital,
            staff,
        )