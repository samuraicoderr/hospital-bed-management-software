"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useHospital, usePatient } from "@/lib/api/contexts";
import type {
  PatientListItem,
  PatientDetail,
  PatientGender,
  RequirementType,
  RequirementPriority,
  UpdatePatientRequest,
  CreateClinicalRequirementRequest,
} from "@/lib/api/types";
import type { CreatePatientRequest as CreatePatientRecordRequest } from "@/lib/api/types/patients.types";
import { cn, interpretServerError } from "@/lib/utils";
import {
  Users,
  Search,
  User,
  Phone,
  Bed,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
  Calendar,
  FileText,
  Activity,
  Shield,
  Clock,
  Filter,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const GENDER_OPTIONS: { value: PatientGender; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
  { value: "U", label: "Unknown" },
];

const REQUIREMENT_TYPES: { value: RequirementType; label: string }[] = [
  { value: "isolation", label: "Isolation Required" },
  { value: "icu", label: "ICU Required" },
  { value: "oxygen", label: "Oxygen Required" },
  { value: "ventilator", label: "Ventilator Required" },
  { value: "cardiac_monitor", label: "Cardiac Monitor" },
  { value: "bariatric", label: "Bariatric Bed" },
  { value: "fall_risk", label: "Fall Risk" },
  { value: "infection_control", label: "Infection Control" },
  { value: "dietary", label: "Dietary Restrictions" },
  { value: "mobility", label: "Mobility Assistance" },
];

const PRIORITY_OPTIONS: { value: RequirementPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-blue-100 text-blue-700" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function PatientsContent() {
  const { hospital } = useHospital();
  const {
    patients,
    selectedPatient,
    clinicalRequirements,
    isLoading,
    isLoadingPatient,
    isLoadingRequirements,
    error,
    loadPatients,
    loadPatient,
    createPatient,
    updatePatient,
    deactivatePatient,
    markDeceased,
    selectPatient,
    clearSelectedPatient,
    loadClinicalRequirements,
    createClinicalRequirement,
    updateClinicalRequirement,
    deleteClinicalRequirement,
    resolveClinicalRequirement,
    refreshPatients,
  } = usePatient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeceasedModal, setShowDeceasedModal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<PatientGender | "">("");
  const [filterAdmitted, setFilterAdmitted] = useState<"" | "true" | "false">("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [showFilters, setShowFilters] = useState(false);

  const [createForm, setCreateForm] = useState<CreatePatientRecordRequest>({
    mrn: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    date_of_birth: "",
    gender: "M",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_group_number: "",
    allergies: "",
    medical_history: "",
    current_medications: "",
    primary_hospital: hospital?.id,
    ehr_id: "",
    external_source: "",
  });

  const [editForm, setEditForm] = useState<UpdatePatientRequest>({});

  const [requirementForm, setRequirementForm] = useState<CreateClinicalRequirementRequest>({
    patient: "",
    requirement_type: "isolation",
    description: "",
    priority: "medium",
  });

  const getErrorMessage = useCallback((err: unknown) => {
    const errors = interpretServerError(err);
    return errors[0] || "An error occurred";
  }, []);

  useEffect(() => {
    if (hospital) {
      loadPatients({ primary_hospital: hospital.id });
    }
  }, [hospital, loadPatients]);

  useEffect(() => {
    if (selectedPatient) {
      loadClinicalRequirements(selectedPatient.id);
    }
  }, [selectedPatient, loadClinicalRequirements]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGender = !filterGender || p.gender === filterGender;
      const matchesAdmitted =
        filterAdmitted === "" ||
        (filterAdmitted === "true" && p.is_currently_admitted) ||
        (filterAdmitted === "false" && !p.is_currently_admitted);
      const matchesActive =
        filterActive === "" ||
        (filterActive === "true" && p.is_active) ||
        (filterActive === "false" && !p.is_active);

      return matchesSearch && matchesGender && matchesAdmitted && matchesActive;
    });
  }, [patients, searchQuery, filterGender, filterAdmitted, filterActive]);

  const stats = useMemo(() => {
    return {
      total: patients.length,
      admitted: patients.filter((p) => p.is_currently_admitted).length,
      active: patients.filter((p) => p.is_active).length,
      deceased: patients.filter((p) => p.is_deceased).length,
    };
  }, [patients]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setFormError(null);
    try {
      await createPatient(createForm as any);
      setShowCreateModal(false);
      setCreateForm({
        mrn: "",
        first_name: "",
        last_name: "",
        middle_name: "",
        date_of_birth: "",
        gender: "M",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relationship: "",
        insurance_provider: "",
        insurance_policy_number: "",
        insurance_group_number: "",
        allergies: "",
        medical_history: "",
        current_medications: "",
        primary_hospital: hospital?.id,
        ehr_id: "",
        external_source: "",
      });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsBusy(true);
    setFormError(null);
    try {
      await updatePatient(selectedPatient.id, editForm);
      setShowEditModal(false);
      setEditForm({});
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedPatient) return;
    setIsBusy(true);
    try {
      await deactivatePatient(selectedPatient.id);
      setShowDeleteModal(false);
      setShowDetailModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleMarkDeceased = async () => {
    if (!selectedPatient) return;
    setIsBusy(true);
    try {
      await markDeceased(selectedPatient.id);
      setShowDeceasedModal(false);
      setShowDetailModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsBusy(true);
    setFormError(null);
    try {
      await createClinicalRequirement({
        ...requirementForm,
        patient: selectedPatient.id,
      });
      setShowRequirementModal(false);
      setRequirementForm({
        patient: "",
        requirement_type: "isolation",
        description: "",
        priority: "medium",
      });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleResolveRequirement = async (id: string) => {
    setIsBusy(true);
    try {
      await resolveClinicalRequirement(id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    setIsBusy(true);
    try {
      await deleteClinicalRequirement(id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const openDetailModal = async (patient: PatientListItem) => {
    try {
      const detail = await loadPatient(patient.id);
      selectPatient(detail);
      setEditForm({
        first_name: detail.first_name,
        last_name: detail.last_name,
        middle_name: detail.middle_name,
        date_of_birth: detail.date_of_birth,
        gender: detail.gender,
        phone: detail.phone,
        email: detail.email,
        address: detail.address,
        city: detail.city,
        state: detail.state,
        postal_code: detail.postal_code,
        country: detail.country,
        emergency_contact_name: detail.emergency_contact_name,
        emergency_contact_phone: detail.emergency_contact_phone,
        emergency_contact_relationship: detail.emergency_contact_relationship,
        insurance_provider: detail.insurance_provider,
        insurance_policy_number: detail.insurance_policy_number,
        insurance_group_number: detail.insurance_group_number,
        allergies: detail.allergies,
        medical_history: detail.medical_history,
        current_medications: detail.current_medications,
        primary_hospital: detail.primary_hospital || undefined,
        ehr_id: detail.ehr_id,
        external_source: detail.external_source,
      });
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = () => {
    if (!selectedPatient) return;
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const openRequirementModal = () => {
    setRequirementForm({
      patient: selectedPatient?.id || "",
      requirement_type: "isolation",
      description: "",
      priority: "medium",
    });
    setShowRequirementModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
            <p className="text-sm text-slate-500">
              Manage patient records, clinical requirements, and admissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            New Patient
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4" />
              <span>Total Patients</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Bed className="h-4 w-4 text-green-600" />
              <span>Currently Admitted</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.admitted}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Active</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.active}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Deceased</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.deceased}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {showFilters && (
          <div className="rounded-lg border bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Gender">
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value as PatientGender | "")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Admission Status">
                <select
                  value={filterAdmitted}
                  onChange={(e) => setFilterAdmitted(e.target.value as "" | "true" | "false")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  <option value="true">Admitted</option>
                  <option value="false">Not Admitted</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as "" | "true" | "false")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Patient List */}
        {filteredPatients.length > 0 ? (
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-12 border-b bg-slate-50 px-6 py-3 text-xs font-medium text-slate-600">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">MRN</div>
              <div className="col-span-2">Gender</div>
              <div className="col-span-2">Age</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => openDetailModal(patient)}
                className="grid grid-cols-12 border-b border-slate-100 px-6 py-4 text-sm hover:bg-slate-50 cursor-pointer"
              >
                <div className="col-span-3 font-medium text-slate-900">
                  {patient.first_name} {patient.last_name}
                </div>
                <div className="col-span-2 text-slate-600">{patient.mrn}</div>
                <div className="col-span-2 text-slate-600">
                  {GENDER_OPTIONS.find((g) => g.value === patient.gender)?.label || patient.gender}
                </div>
                <div className="col-span-2 text-slate-600">{patient.age || "--"}</div>
                <div className="col-span-2">
                  {patient.is_deceased ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      Deceased
                    </span>
                  ) : !patient.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      Inactive
                    </span>
                  ) : patient.is_currently_admitted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      <Bed className="h-3 w-3" />
                      Admitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      Not Admitted
                    </span>
                  )}
                </div>
                <div className="col-span-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetailModal(patient);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              {searchQuery || filterGender || filterAdmitted || filterActive
                ? "No patients match your filters"
                : "No patients found"}
            </p>
          </div>
        )}
      </div>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <Modal title="Create New Patient" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreatePatient} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="MRN" required>
                <input
                  type="text"
                  required
                  value={createForm.mrn}
                  onChange={(e) => setCreateForm({ ...createForm, mrn: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Date of Birth" required>
                <input
                  type="date"
                  required
                  value={createForm.date_of_birth}
                  onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="First Name" required>
                <input
                  type="text"
                  required
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  type="text"
                  required
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Middle Name">
                <input
                  type="text"
                  value={createForm.middle_name}
                  onChange={(e) => setCreateForm({ ...createForm, middle_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Gender" required>
                <select
                  required
                  value={createForm.gender}
                  onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value as PatientGender })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Emergency Contact Name">
                <input
                  type="text"
                  value={createForm.emergency_contact_name}
                  onChange={(e) => setCreateForm({ ...createForm, emergency_contact_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Emergency Contact Phone">
                <input
                  type="tel"
                  value={createForm.emergency_contact_phone}
                  onChange={(e) => setCreateForm({ ...createForm, emergency_contact_phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Insurance Provider">
                <input
                  type="text"
                  value={createForm.insurance_provider}
                  onChange={(e) => setCreateForm({ ...createForm, insurance_provider: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Insurance Policy Number">
                <input
                  type="text"
                  value={createForm.insurance_policy_number}
                  onChange={(e) => setCreateForm({ ...createForm, insurance_policy_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
            </div>
            <Field label="Address">
              <textarea
                rows={2}
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Allergies">
              <textarea
                rows={2}
                value={createForm.allergies}
                onChange={(e) => setCreateForm({ ...createForm, allergies: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Medical History">
              <textarea
                rows={2}
                value={createForm.medical_history}
                onChange={(e) => setCreateForm({ ...createForm, medical_history: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Current Medications">
              <textarea
                rows={2}
                value={createForm.current_medications}
                onChange={(e) => setCreateForm({ ...createForm, current_medications: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Patient"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Patient Detail Modal */}
      {showDetailModal && selectedPatient && (
        <Modal
          title={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          onClose={() => {
            setShowDetailModal(false);
            clearSelectedPatient();
          }}
        >
          {isLoadingPatient ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">MRN</h3>
                  <p className="text-slate-900">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Age</h3>
                  <p className="text-slate-900">{selectedPatient.age || "--"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Gender</h3>
                  <p className="text-slate-900">
                    {GENDER_OPTIONS.find((g) => g.value === selectedPatient.gender)?.label}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Status</h3>
                  <p className="text-slate-900">
                    {selectedPatient.is_deceased
                      ? "Deceased"
                      : selectedPatient.is_active
                      ? "Active"
                      : "Inactive"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Phone</h3>
                  <p className="text-slate-900">{selectedPatient.phone || "--"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Email</h3>
                  <p className="text-slate-900">{selectedPatient.email || "--"}</p>
                </div>
              </div>

              {/* Current Admission */}
              {selectedPatient.current_admission && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-green-900">
                    <Bed className="h-4 w-4" />
                    Current Admission
                  </h3>
                  <div className="mt-2 grid gap-2 text-sm text-green-800">
                    <div>
                      <span className="font-medium">Hospital:</span> {selectedPatient.current_admission.hospital}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {selectedPatient.current_admission.department}
                    </div>
                    <div>
                      <span className="font-medium">Bed:</span> {selectedPatient.current_admission.bed || "Not assigned"}
                    </div>
                    <div>
                      <span className="font-medium">Admitted:</span>{" "}
                      {new Date(selectedPatient.current_admission.admitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Clinical Notes</h3>
                {selectedPatient.allergies && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500">Allergies</h4>
                    <p className="text-sm text-slate-700">{selectedPatient.allergies}</p>
                  </div>
                )}
                {selectedPatient.medical_history && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500">Medical History</h4>
                    <p className="text-sm text-slate-700">{selectedPatient.medical_history}</p>
                  </div>
                )}
                {selectedPatient.current_medications && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500">Current Medications</h4>
                    <p className="text-sm text-slate-700">{selectedPatient.current_medications}</p>
                  </div>
                )}
              </div>

              {/* Clinical Requirements */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">Clinical Requirements</h3>
                  <button
                    onClick={openRequirementModal}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                {isLoadingRequirements ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                ) : clinicalRequirements.length > 0 ? (
                  <div className="space-y-2">
                    {clinicalRequirements.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-start justify-between rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {req.requirement_type_display}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                PRIORITY_OPTIONS.find((p) => p.value === req.priority)?.color
                              )}
                            >
                              {req.priority_display}
                            </span>
                          </div>
                          {req.description && (
                            <p className="mt-1 text-sm text-slate-600">{req.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {req.is_active && (
                            <button
                              onClick={() => handleResolveRequirement(req.id)}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Resolve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRequirement(req.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No clinical requirements</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                {!selectedPatient.is_deceased && (
                  <button
                    onClick={() => setShowDeceasedModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Mark Deceased
                  </button>
                )}
                {selectedPatient.is_active && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Shield className="h-4 w-4" />
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && selectedPatient && (
        <Modal title="Edit Patient" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleUpdatePatient} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name">
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Last Name">
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Emergency Contact Name">
                <input
                  type="text"
                  value={editForm.emergency_contact_name}
                  onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Emergency Contact Phone">
                <input
                  type="tel"
                  value={editForm.emergency_contact_phone}
                  onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Insurance Provider">
                <input
                  type="text"
                  value={editForm.insurance_provider}
                  onChange={(e) => setEditForm({ ...editForm, insurance_provider: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
              <Field label="Insurance Policy Number">
                <input
                  type="text"
                  value={editForm.insurance_policy_number}
                  onChange={(e) => setEditForm({ ...editForm, insurance_policy_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </Field>
            </div>
            <Field label="Address">
              <textarea
                rows={2}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Allergies">
              <textarea
                rows={2}
                value={editForm.allergies}
                onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Medical History">
              <textarea
                rows={2}
                value={editForm.medical_history}
                onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Current Medications">
              <textarea
                rows={2}
                value={editForm.current_medications}
                onChange={(e) => setEditForm({ ...editForm, current_medications: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Clinical Requirement Modal */}
      {showRequirementModal && (
        <Modal title="Add Clinical Requirement" onClose={() => setShowRequirementModal(false)}>
          <form onSubmit={handleCreateRequirement} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
            )}
            <Field label="Requirement Type" required>
              <select
                required
                value={requirementForm.requirement_type}
                onChange={(e) => setRequirementForm({ ...requirementForm, requirement_type: e.target.value as RequirementType })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {REQUIREMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={requirementForm.priority}
                onChange={(e) => setRequirementForm({ ...requirementForm, priority: e.target.value as RequirementPriority })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={requirementForm.description}
                onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowRequirementModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Requirement"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeleteModal && (
        <Modal title="Deactivate Patient" onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to deactivate {selectedPatient?.first_name} {selectedPatient?.last_name}? This will mark the patient as inactive but preserve their records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isBusy}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deactivate"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mark Deceased Modal */}
      {showDeceasedModal && (
        <Modal title="Mark Patient as Deceased" onClose={() => setShowDeceasedModal(false)}>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to mark {selectedPatient?.first_name} {selectedPatient?.last_name} as deceased? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeceasedModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkDeceased}
                disabled={isBusy}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Deceased"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return <PatientsContent />;
}
