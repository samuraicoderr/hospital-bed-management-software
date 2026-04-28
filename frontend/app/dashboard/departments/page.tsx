"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useHospital, useDepartment } from "@/lib/api/contexts";
import { organizationService } from "@/lib/api/services";
import type {
  CreateDepartmentRequest,
  Department,
  DepartmentType,
  Building,
} from "@/lib/api/types";
import type { GenderRestriction } from "@/lib/api/types/organizations.types";
import { cn, interpretServerError } from "@/lib/utils";

const DEPARTMENT_TYPE_OPTIONS: DepartmentType[] = [
  "general_medicine",
  "surgery",
  "icu",
  "emergency",
  "maternity",
  "pediatrics",
  "psychiatry",
  "oncology",
  "orthopedics",
  "cardiology",
  "neurology",
  "geriatrics",
  "rehabilitation",
];

const GENDER_OPTIONS = ["none", "male_only", "female_only"] as const;

const emptyCreateForm: CreateDepartmentRequest = {
  hospital: "",
  building: null,
  name: "",
  code: "",
  description: "",
  department_type: "general_medicine",
  floor: "",
  wing: "",
  total_beds: 0,
  gender_restriction: "none",
  extension: "",
  nurse_station_phone: "",
};

function formatDepartmentType(type: DepartmentType): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGenderRestriction(restriction: string): string {
  return restriction.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function DepartmentsPage() {
  const { hospital } = useHospital();
  const { departments, isLoading, loadDepartments, createDepartment, updateDepartment, deleteDepartment } = useDepartment();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [createForm, setCreateForm] = useState<CreateDepartmentRequest>(emptyCreateForm);
  const [editForm, setEditForm] = useState<Partial<CreateDepartmentRequest>>({});
  const [formError, setFormError] = useState("");

  const loadBuildings = useCallback(async () => {
    if (!hospital) return;
    try {
      const bldgs = await organizationService.getBuildings(hospital.id);
      setBuildings(bldgs);
    } catch (err) {
      console.error("Failed to load buildings:", err);
    }
  }, [hospital]);

  useEffect(() => {
    if (hospital) {
      loadBuildings();
      loadDepartments(hospital.id);
    }
  }, [hospital, loadBuildings]);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery) return departments;
    const query = searchQuery.toLowerCase();
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(query) ||
        dept.code.toLowerCase().includes(query) ||
        dept.description?.toLowerCase().includes(query)
    );
  }, [departments, searchQuery]);

  const handleCreateDepartment = async () => {
    setFormError("");
    if (!createForm.name || !createForm.code || !hospital) {
      setFormError("Name, code, and hospital are required.");
      return;
    }

    setIsBusy(true);
    try {
      await createDepartment({
        ...createForm,
        hospital: hospital.id,
      });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to create department.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;
    setFormError("");
    setIsBusy(true);
    try {
      await updateDepartment(selectedDepartment.id, editForm);
      setShowEditModal(false);
      setSelectedDepartment(null);
      setEditForm({});
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to update department.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;
    setIsBusy(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      setShowDeleteModal(false);
      setSelectedDepartment(null);
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to delete department.");
    } finally {
      setIsBusy(false);
    }
  };

  const openEditModal = (dept: Department) => {
    setSelectedDepartment(dept);
    setEditForm({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      department_type: dept.department_type,
      floor: dept.floor,
      wing: dept.wing,
      total_beds: dept.total_beds,
      gender_restriction: dept.gender_restriction,
      extension: dept.extension,
      nurse_station_phone: dept.nurse_station_phone,
      building: dept.building,
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setCreateForm({ ...emptyCreateForm, hospital: hospital?.id || "" });
            setShowCreateModal(true);
          }}
          disabled={!hospital}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Department
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-medium text-slate-600 uppercase">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Gender</div>
          <div className="col-span-2">Beds</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {filteredDepartments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            {searchQuery ? "No departments match your search." : "No departments found. Create one to get started."}
          </div>
        ) : (
          filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="grid grid-cols-12 border-b border-slate-100 px-6 py-4 text-sm hover:bg-slate-50"
            >
              <div className="col-span-3 font-medium text-slate-900">{dept.name}</div>
              <div className="col-span-2 text-slate-600">{dept.code}</div>
              <div className="col-span-2 text-slate-600">{formatDepartmentType(dept.department_type)}</div>
              <div className="col-span-2 text-slate-600">{formatGenderRestriction(dept.gender_restriction)}</div>
              <div className="col-span-2 text-slate-600">
                {dept.available_beds_count} / {dept.total_beds}
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(dept)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedDepartment(dept);
                    setShowDeleteModal(true);
                  }}
                  className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal ? (
        <Modal title="Create Department" onClose={() => setShowCreateModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Department Name" required>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., Emergency Department"
              />
            </Field>
            <Field label="Department Code" required>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-600"
                placeholder="e.g., ER"
              />
            </Field>
            <Field label="Department Type" required>
              <select
                value={createForm.department_type}
                onChange={(e) => setCreateForm((c) => ({ ...c, department_type: e.target.value as DepartmentType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {DEPARTMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatDepartmentType(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Building">
              <select
                value={createForm.building || ""}
                onChange={(e) => setCreateForm((c) => ({ ...c, building: e.target.value || null }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">No Building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Floor">
              <input
                value={createForm.floor}
                onChange={(e) => setCreateForm((c) => ({ ...c, floor: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., 1"
              />
            </Field>
            <Field label="Wing">
              <input
                value={createForm.wing}
                onChange={(e) => setCreateForm((c) => ({ ...c, wing: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., North"
              />
            </Field>
            <Field label="Total Beds">
              <input
                type="number"
                value={createForm.total_beds}
                onChange={(e) => setCreateForm((c) => ({ ...c, total_beds: Number(e.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                min="0"
              />
            </Field>
            <Field label="Gender Restriction">
              <select
                value={createForm.gender_restriction}
                onChange={(e) => setCreateForm((c) => ({ ...c, gender_restriction: e.target.value as GenderRestriction }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatGenderRestriction(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Extension">
              <input
                value={createForm.extension}
                onChange={(e) => setCreateForm((c) => ({ ...c, extension: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., 101"
              />
            </Field>
            <Field label="Nurse Station Phone">
              <input
                value={createForm.nurse_station_phone}
                onChange={(e) => setCreateForm((c) => ({ ...c, nurse_station_phone: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., +1 (555) 000-0000"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((c) => ({ ...c, description: e.target.value }))}
                  className="min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="Department description..."
                />
              </Field>
            </div>
          </div>
          {formError && <div className="mt-4 text-sm text-rose-600">{formError}</div>}
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={handleCreateDepartment}
              disabled={isBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Department"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal title="Edit Department" onClose={() => setShowEditModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Department Name" required>
              <input
                value={editForm.name || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Department Code" required>
              <input
                value={editForm.code || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Department Type" required>
              <select
                value={editForm.department_type || "general_medicine"}
                onChange={(e) => setEditForm((c) => ({ ...c, department_type: e.target.value as DepartmentType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {DEPARTMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatDepartmentType(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Building">
              <select
                value={editForm.building || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, building: e.target.value || null }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">No Building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Floor">
              <input
                value={editForm.floor || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, floor: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Wing">
              <input
                value={editForm.wing || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, wing: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Total Beds">
              <input
                type="number"
                value={editForm.total_beds || 0}
                onChange={(e) => setEditForm((c) => ({ ...c, total_beds: Number(e.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                min="0"
              />
            </Field>
            <Field label="Gender Restriction">
              <select
                value={editForm.gender_restriction || "none"}
                onChange={(e) => setEditForm((c) => ({ ...c, gender_restriction: e.target.value as GenderRestriction }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatGenderRestriction(option)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Extension">
              <input
                value={editForm.extension || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, extension: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Nurse Station Phone">
              <input
                value={editForm.nurse_station_phone || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, nurse_station_phone: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                  className="min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </Field>
            </div>
          </div>
          {formError && <div className="mt-4 text-sm text-rose-600">{formError}</div>}
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowEditModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={handleEditDepartment}
              disabled={isBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showDeleteModal ? (
        <Modal title="Delete Department" onClose={() => setShowDeleteModal(false)}>
          <div className="grid gap-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{selectedDepartment?.name}</strong>? This action cannot be undone.
            </p>
            {formError && <div className="text-sm text-rose-600">{formError}</div>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleDeleteDepartment}
                disabled={isBusy}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Department"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {isBusy ? (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Updating departments...</span>
        </div>
      ) : null}
    </div>
  );
}
