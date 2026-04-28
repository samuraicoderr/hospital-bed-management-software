"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useHospital, useWard } from "@/lib/api/contexts";
import { organizationService } from "@/lib/api/services";
import type {
  CreateWardRequest,
  Department,
  Ward,
  WardType,
} from "@/lib/api/types";
import { cn, interpretServerError } from "@/lib/utils";

const WARD_TYPE_OPTIONS: WardType[] = ["single", "double", "multi", "bay", "icu", "emergency"];

const emptyCreateForm: CreateWardRequest = {
  department: "",
  name: "",
  code: "",
  description: "",
  ward_type: "multi",
  room_number: "",
  floor: "",
  capacity: 0,
  has_bathroom: false,
  has_oxygen: false,
  has_suction: false,
  has_monitor: false,
  has_ventilator: false,
  is_isolation_capable: false,
};

function formatWardType(type: WardType | undefined): string {
  if (!type) return "N/A";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
      />
      {label}
    </label>
  );
}

export default function WardsPage() {
  const { hospital } = useHospital();
  const { wards, isLoading, createWard, loadWards, updateWard, deleteWard } = useWard();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [createForm, setCreateForm] = useState<CreateWardRequest>(emptyCreateForm);
  const [editForm, setEditForm] = useState<Partial<CreateWardRequest>>({});
  const [formError, setFormError] = useState("");

  const loadDepartments = useCallback(async () => {
    if (!hospital) return;
    try {
      const depts = await organizationService.getDepartments(hospital.id);
      setDepartments(depts);
      if (depts.length > 0 && !selectedDepartment) {
        setSelectedDepartment(depts[0].id);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  }, [hospital, selectedDepartment]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      loadWards(selectedDepartment);
    }
  }, [selectedDepartment, loadWards]);


  const filteredWards = useMemo(() => {
    if (!searchQuery) return wards;
    const query = searchQuery.toLowerCase();
    return wards.filter(
      (ward) =>
        ward.name.toLowerCase().includes(query) ||
        ward.code.toLowerCase().includes(query) ||
        ward.description?.toLowerCase().includes(query) ||
        ward.room_number.toLowerCase().includes(query)
    );
  }, [wards, searchQuery]);

  const handleCreateWard = async () => {
    setFormError("");
    if (!createForm.name || !createForm.code || !selectedDepartment) {
      setFormError("Name, code, and department are required.");
      return;
    }

    setIsBusy(true);
    try {
      await createWard({
        ...createForm,
        department: selectedDepartment,
      });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to create ward.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEditWard = async () => {
    if (!selectedWard) return;
    setFormError("");
    setIsBusy(true);
    try {
      await updateWard(selectedWard.id, editForm);
      setShowEditModal(false);
      setSelectedWard(null);
      setEditForm({});
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to update ward.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteWard = async () => {
    if (!selectedWard) return;
    setIsBusy(true);
    try {
      await deleteWard(selectedWard.id);
      setShowDeleteModal(false);
      setSelectedWard(null);
    } catch (err) {
      const details = interpretServerError(err);
      setFormError(details[0] || "Failed to delete ward.");
    } finally {
      setIsBusy(false);
    }
  };

  const openEditModal = (ward: Ward) => {
    setSelectedWard(ward);
    setEditForm({
      name: ward.name,
      code: ward.code,
      description: ward.description,
      ward_type: ward.ward_type,
      room_number: ward.room_number,
      floor: ward.floor,
      capacity: ward.capacity,
      has_bathroom: ward.has_bathroom,
      has_oxygen: ward.has_oxygen,
      has_suction: ward.has_suction,
      has_monitor: ward.has_monitor,
      has_ventilator: ward.has_ventilator,
      is_isolation_capable: ward.is_isolation_capable,
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
              placeholder="Search wards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setCreateForm({ ...emptyCreateForm, department: selectedDepartment });
            setShowCreateModal(true);
          }}
          disabled={!selectedDepartment}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Ward
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-medium text-slate-600 uppercase">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Room</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Capacity</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {filteredWards.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            {searchQuery ? "No wards match your search." : "No wards found. Create one to get started."}
          </div>
        ) : (
          filteredWards.map((ward) => (
            <div
              key={ward.id}
              className="grid grid-cols-12 border-b border-slate-100 px-6 py-4 text-sm hover:bg-slate-50"
            >
              <div className="col-span-3 font-medium text-slate-900">{ward.name}</div>
              <div className="col-span-2 text-slate-600">{ward.code}</div>
              <div className="col-span-2 text-slate-600">{ward.room_number}</div>
              <div className="col-span-2 text-slate-600">{formatWardType(ward.ward_type)}</div>
              <div className="col-span-2 text-slate-600">{ward.capacity}</div>
              <div className="col-span-1 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(ward)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedWard(ward);
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
        <Modal title="Create Ward" onClose={() => setShowCreateModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ward Name" required>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., Ward 3A"
              />
            </Field>
            <Field label="Ward Code" required>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-600"
                placeholder="e.g., 3A"
              />
            </Field>
            <Field label="Room Number" required>
              <input
                value={createForm.room_number}
                onChange={(e) => setCreateForm((c) => ({ ...c, room_number: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., 301"
              />
            </Field>
            <Field label="Ward Type" required>
              <select
                value={createForm.ward_type}
                onChange={(e) => setCreateForm((c) => ({ ...c, ward_type: e.target.value as WardType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {WARD_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatWardType(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Floor">
              <input
                value={createForm.floor}
                onChange={(e) => setCreateForm((c) => ({ ...c, floor: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                placeholder="e.g., 3"
              />
            </Field>
            <Field label="Capacity">
              <input
                type="number"
                value={createForm.capacity}
                onChange={(e) => setCreateForm((c) => ({ ...c, capacity: Number(e.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                min="0"
              />
            </Field>
            <div className="col-span-2 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-800">Amenities & Capabilities</div>
              <div className="grid grid-cols-2 gap-3">
                <CheckboxField
                  label="Has Bathroom"
                  checked={createForm.has_bathroom || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, has_bathroom: checked }))}
                />
                <CheckboxField
                  label="Has Oxygen"
                  checked={createForm.has_oxygen || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, has_oxygen: checked }))}
                />
                <CheckboxField
                  label="Has Suction"
                  checked={createForm.has_suction || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, has_suction: checked }))}
                />
                <CheckboxField
                  label="Has Monitor"
                  checked={createForm.has_monitor || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, has_monitor: checked }))}
                />
                <CheckboxField
                  label="Has Ventilator"
                  checked={createForm.has_ventilator || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, has_ventilator: checked }))}
                />
                <CheckboxField
                  label="Isolation Capable"
                  checked={createForm.is_isolation_capable || false}
                  onChange={(checked) => setCreateForm((c) => ({ ...c, is_isolation_capable: checked }))}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((c) => ({ ...c, description: e.target.value }))}
                  className="min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="Ward description..."
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
              onClick={handleCreateWard}
              disabled={isBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Ward"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal title="Edit Ward" onClose={() => setShowEditModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ward Name" required>
              <input
                value={editForm.name || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Ward Code" required>
              <input
                value={editForm.code || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Room Number" required>
              <input
                value={editForm.room_number || ""}
                onChange={(e) => setEditForm((c) => ({ ...c, room_number: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Ward Type" required>
              <select
                value={editForm.ward_type || "multi"}
                onChange={(e) => setEditForm((c) => ({ ...c, ward_type: e.target.value as WardType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {WARD_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatWardType(type)}
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
            <Field label="Capacity">
              <input
                type="number"
                value={editForm.capacity || 0}
                onChange={(e) => setEditForm((c) => ({ ...c, capacity: Number(e.target.value) }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                min="0"
              />
            </Field>
            <div className="col-span-2 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-800">Amenities & Capabilities</div>
              <div className="grid grid-cols-2 gap-3">
                <CheckboxField
                  label="Has Bathroom"
                  checked={editForm.has_bathroom || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, has_bathroom: checked }))}
                />
                <CheckboxField
                  label="Has Oxygen"
                  checked={editForm.has_oxygen || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, has_oxygen: checked }))}
                />
                <CheckboxField
                  label="Has Suction"
                  checked={editForm.has_suction || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, has_suction: checked }))}
                />
                <CheckboxField
                  label="Has Monitor"
                  checked={editForm.has_monitor || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, has_monitor: checked }))}
                />
                <CheckboxField
                  label="Has Ventilator"
                  checked={editForm.has_ventilator || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, has_ventilator: checked }))}
                />
                <CheckboxField
                  label="Isolation Capable"
                  checked={editForm.is_isolation_capable || false}
                  onChange={(checked) => setEditForm((c) => ({ ...c, is_isolation_capable: checked }))}
                />
              </div>
            </div>
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
              onClick={handleEditWard}
              disabled={isBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showDeleteModal ? (
        <Modal title="Delete Ward" onClose={() => setShowDeleteModal(false)}>
          <div className="grid gap-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{selectedWard?.name}</strong>? This action cannot be undone.
            </p>
            {formError && <div className="text-sm text-rose-600">{formError}</div>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleDeleteWard}
                disabled={isBusy}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Ward"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {isBusy ? (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Updating wards...</span>
        </div>
      ) : null}
    </div>
  );
}
