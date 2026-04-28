import { api } from "../ApiClient";
import BackendRoutes from "../BackendRoutes";
import type { PaginatedAnything } from "../types/common.types";
import type {
  Patient,
  PatientListItem,
  PatientDetail,
  CurrentAdmission,
  AdmissionHistoryEntry,
  AdmissionStatus as PatientAdmissionStatus,
  ClinicalRequirement as PatientClinicalRequirement,
  CreatePatientRequest as CreatePatientRecordRequest,
  UpdatePatientRequest,
  MarkDeceasedRequest,
  CreateClinicalRequirementRequest,
  UpdateClinicalRequirementRequest,
  PatientFilters,
  ClinicalRequirementFilters,
} from "../types";

class PatientService {
  async getPatients(
    params: PatientFilters & { page?: number; page_size?: number } = {}
  ): Promise<PaginatedAnything<PatientListItem>> {
    const response = await api.get<PaginatedAnything<PatientListItem>>(BackendRoutes.patients.base, {
      params,
    });
    return response.data;
  }

  async getPatient(id: string): Promise<PatientDetail> {
    const response = await api.get<PatientDetail>(BackendRoutes.patients.detail(id));
    return response.data;
  }

  async createPatient(data: CreatePatientRecordRequest): Promise<PatientDetail> {
    const response = await api.post<PatientDetail>(BackendRoutes.patients.base, data);
    return response.data;
  }

  async updatePatient(id: string, data: UpdatePatientRequest): Promise<PatientDetail> {
    const response = await api.patch<PatientDetail>(BackendRoutes.patients.detail(id), data);
    return response.data;
  }

  async deletePatient(id: string): Promise<void> {
    await api.delete(BackendRoutes.patients.detail(id));
  }

  async deactivatePatient(id: string): Promise<PatientDetail> {
    const response = await api.post<PatientDetail>(BackendRoutes.patients.deactivate(id), {});
    return response.data;
  }

  async markDeceased(id: string, data: MarkDeceasedRequest = {}): Promise<PatientDetail> {
    const response = await api.post<PatientDetail>(BackendRoutes.patients.markDeceased(id), data);
    return response.data;
  }

  async getAdmissionHistory(id: string): Promise<AdmissionHistoryEntry[]> {
    const response = await api.get<AdmissionHistoryEntry[]>(BackendRoutes.patients.admissionHistory(id));
    return response.data;
  }

  async getCurrentAdmission(id: string): Promise<CurrentAdmission> {
    const response = await api.get<CurrentAdmission>(BackendRoutes.patients.currentAdmission(id));
    return response.data;
  }

  async getAdmissionStatus(id: string): Promise<PatientAdmissionStatus> {
    const response = await api.get<PatientAdmissionStatus>(BackendRoutes.patients.admissionStatus(id));
    return response.data;
  }

  async getClinicalRequirements(
    params: ClinicalRequirementFilters & { page?: number; page_size?: number } = {}
  ): Promise<PaginatedAnything<PatientClinicalRequirement>> {
    const response = await api.get<PaginatedAnything<PatientClinicalRequirement>>(
      BackendRoutes.clinicalRequirements.base,
      { params }
    );
    return response.data;
  }

  async getPatientClinicalRequirements(id: string): Promise<PatientClinicalRequirement[]> {
    const response = await api.get<PatientClinicalRequirement[]>(
      BackendRoutes.patients.clinicalRequirements(id)
    );
    return response.data;
  }

  async createClinicalRequirement(data: CreateClinicalRequirementRequest): Promise<PatientClinicalRequirement> {
    const response = await api.post<PatientClinicalRequirement>(
      BackendRoutes.clinicalRequirements.base,
      data
    );
    return response.data;
  }

  async updateClinicalRequirement(
    id: string,
    data: UpdateClinicalRequirementRequest
  ): Promise<PatientClinicalRequirement> {
    const response = await api.patch<PatientClinicalRequirement>(
      BackendRoutes.clinicalRequirements.detail(id),
      data
    );
    return response.data;
  }

  async deleteClinicalRequirement(id: string): Promise<void> {
    await api.delete(BackendRoutes.clinicalRequirements.detail(id));
  }

  async resolveClinicalRequirement(id: string): Promise<PatientClinicalRequirement> {
    const response = await api.post<PatientClinicalRequirement>(
      BackendRoutes.clinicalRequirements.resolve(id),
      {}
    );
    return response.data;
  }
}

export const patientService = new PatientService();
export default patientService;
