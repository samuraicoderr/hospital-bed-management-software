import { api } from "@/lib/api/ApiClient";
import BackendRoutes from "@/lib/api/BackendRoutes";
import type { PaginatedAnything } from "@/lib/api/types/common.types";
import type {
  Organization,
  Hospital,
  Building,
  Department,
  Ward,
  HospitalStaff,
  HospitalStaffInvitation,
  CreateBuildingRequest,
  CreateDepartmentRequest,
  CreateWardRequest,
  InviteHospitalStaffRequest,
  UpdateHospitalStaffRequest,
} from "@/lib/api/types/organizations.types";

class OrganizationService {
  async getOrganizations(): Promise<PaginatedAnything<Organization>> {
    const response = await api.get<PaginatedAnything<Organization>>(BackendRoutes.organizations.base);
    return response.data;
  }

  async getHospitals(params?: { organization?: string }): Promise<PaginatedAnything<Hospital>> {
    const response = await api.get<PaginatedAnything<Hospital>>(BackendRoutes.organizations.hospitals, { params });
    return response.data;
  }

  async getHospital(hospitalId: string): Promise<Hospital> {
    const response = await api.get<Hospital>(BackendRoutes.organizations.hospitalDetail(hospitalId));
    return response.data;
  }

  async getBuildings(hospitalId: string): Promise<Building[]> {
    const response = await api.get<Building[]>(BackendRoutes.organizations.hospitalBuildings(hospitalId));
    return response.data;
  }

  async createBuilding(payload: CreateBuildingRequest): Promise<Building> {
    const response = await api.post<Building>(BackendRoutes.organizations.buildings, payload);
    return response.data;
  }

  async updateBuilding(buildingId: string, payload: Partial<CreateBuildingRequest>): Promise<Building> {
    const response = await api.patch<Building>(BackendRoutes.organizations.buildingDetail(buildingId), payload);
    return response.data;
  }

  async deleteBuilding(buildingId: string): Promise<void> {
    await api.delete(BackendRoutes.organizations.buildingDetail(buildingId));
  }

  async getDepartments(hospitalId: string): Promise<Department[]> {
    const response = await api.get<Department[]>(BackendRoutes.organizations.hospitalDepartments(hospitalId));
    return response.data;
  }

  async createDepartment(payload: CreateDepartmentRequest): Promise<Department> {
    const response = await api.post<Department>(BackendRoutes.organizations.departments, payload);
    return response.data;
  }

  async updateDepartment(departmentId: string, payload: Partial<CreateDepartmentRequest>): Promise<Department> {
    const response = await api.patch<Department>(BackendRoutes.organizations.departmentDetail(departmentId), payload);
    return response.data;
  }

  async deleteDepartment(departmentId: string): Promise<void> {
    await api.delete(BackendRoutes.organizations.departmentDetail(departmentId));
  }

  async getWards(departmentId: string): Promise<Ward[]> {
    const response = await api.get<Ward[]>(BackendRoutes.organizations.departmentWards(departmentId));
    return response.data;
  }

  async createWard(payload: CreateWardRequest): Promise<Ward> {
    const response = await api.post<Ward>(BackendRoutes.organizations.wards, payload);
    return response.data;
  }

  async updateWard(wardId: string, payload: Partial<CreateWardRequest>): Promise<Ward> {
    const response = await api.patch<Ward>(BackendRoutes.organizations.wardDetail(wardId), payload);
    return response.data;
  }

  async deleteWard(wardId: string): Promise<void> {
    await api.delete(BackendRoutes.organizations.wardDetail(wardId));
  }

  async getHospitalStaff(hospitalId: string): Promise<HospitalStaff[]> {
    const response = await api.get<HospitalStaff[]>(BackendRoutes.organizations.hospitalStaff(hospitalId));
    return response.data;
  }

  async updateHospitalStaff(staffId: string, payload: UpdateHospitalStaffRequest): Promise<HospitalStaff> {
    const response = await api.patch<HospitalStaff>(BackendRoutes.organizations.hospitalStaffListDetail(staffId), payload);
    return response.data;
  }

  async removeHospitalStaff(staffId: string): Promise<void> {
    await api.delete(BackendRoutes.organizations.hospitalStaffListDetail(staffId));
  }

  async inviteStaff(hospitalId: string, payload: InviteHospitalStaffRequest): Promise<HospitalStaffInvitation> {
    const response = await api.post<HospitalStaffInvitation>(BackendRoutes.organizations.hospitalInviteStaff(hospitalId), payload);
    return response.data;
  }

  async getPendingInvites(hospitalId: string): Promise<HospitalStaffInvitation[]> {
    const response = await api.get<HospitalStaffInvitation[]>(BackendRoutes.organizations.hospitalPendingInvites(hospitalId));
    return response.data;
  }

  async getMyInvitations(): Promise<PaginatedAnything<HospitalStaffInvitation>> {
    const response = await api.get<PaginatedAnything<HospitalStaffInvitation>>(BackendRoutes.organizations.hospitalStaffInvitations, {
      params: { status: "pending" },
    });
    return response.data;
  }

  async acceptInvitation(token: string): Promise<HospitalStaff> {
    const response = await api.post<HospitalStaff>(BackendRoutes.organizations.hospitalStaffAcceptInvitation, { token });
    return response.data;
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
