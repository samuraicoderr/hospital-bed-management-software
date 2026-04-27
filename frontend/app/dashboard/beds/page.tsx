"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { admissionService, bedService, organizationService } from "@/lib/api/services";
import type {
  Admission,
  AdmissionRequest,
  Bed,
  BedAnalytics,
  BedGridFilter,
  BedListItem,
  BedMaintenanceRecord,
  BedStatusHistory,
  CreateBedRequest,
  Department,
  EquipmentTag,
  GenderRestriction,
  Hospital,
  Ward,
} from "@/lib/api/types";
import { BedType } from "@/lib/api/types";
import { cn, interpretServerError } from "@/lib/utils";

type TabKey = "inventory" | "maintenance" | "equipment" | "analytics";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  occupied: "bg-indigo-50 text-indigo-700 border-indigo-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
  cleaning_required: "bg-orange-50 text-orange-700 border-orange-200",
  cleaning_in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  under_maintenance: "bg-slate-100 text-slate-700 border-slate-200",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
};

const BED_TYPE_OPTIONS = Object.values(BedType);
const GENDER_OPTIONS: GenderRestriction[] = ["none", "male_only", "female_only"];
const TAB_LABELS: Record<TabKey, string> = {
  inventory: "Inventory",
  maintenance: "Maintenance",
  equipment: "Equipment",
  analytics: "Analytics",
};

const emptyCreateForm: CreateBedRequest = {
  ward_id: "",
  bed_number: "",
  bed_type: BedType.GENERAL,
  is_isolation: false,
  gender_restriction: "none",
  bed_size: "standard",
  max_patient_weight_kg: 150,
  equipment_tag_ids: [],
  is_active: true,
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusPill(status: string, label?: string) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status] || STATUS_STYLES.available
      )}
    >
      {label || status.replaceAll("_", " ")}
    </span>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function BedsContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wardsByDepartment, setWardsByDepartment] = useState<Record<string, Ward[]>>({});
  const [equipmentTags, setEquipmentTags] = useState<EquipmentTag[]>([]);
  const [admissionRequests, setAdmissionRequests] = useState<AdmissionRequest[]>([]);
  const [activeAdmissions, setActiveAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<BedListItem[]>([]);
  const [stats, setStats] = useState<BedAnalytics["statistics"] | null>(null);
  const [analytics, setAnalytics] = useState<BedAnalytics | null>(null);
  const [maintenance, setMaintenance] = useState<BedMaintenanceRecord[]>([]);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [history, setHistory] = useState<BedStatusHistory[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [createDepartmentId, setCreateDepartmentId] = useState("");
  const [createForm, setCreateForm] = useState<CreateBedRequest>(emptyCreateForm);
  const [maintenanceForm, setMaintenanceForm] = useState({
    bed: "",
    issue_description: "",
    maintenance_type: "repair",
    severity: "medium",
  });
  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    code: "",
    category: "monitoring",
    description: "",
  });
  const [draftFilters, setDraftFilters] = useState<BedGridFilter>({
    status: undefined,
    bed_type: undefined,
    department: undefined,
    ward: undefined,
    search: "",
    is_active: undefined,
    is_isolation: undefined,
  });
  const [appliedFilters, setAppliedFilters] = useState<BedGridFilter>({
    status: undefined,
    bed_type: undefined,
    department: undefined,
    ward: undefined,
    search: "",
    is_active: undefined,
    is_isolation: undefined,
  });

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.id === selectedHospitalId) || null,
    [hospitals, selectedHospitalId]
  );

  const availableWards = useMemo(() => {
    if (draftFilters.department) {
      return wardsByDepartment[draftFilters.department] || [];
    }
    return Object.values(wardsByDepartment).flat();
  }, [draftFilters.department, wardsByDepartment]);

  const selectedDepartmentWards = createDepartmentId
    ? wardsByDepartment[createDepartmentId] || []
    : [];

  const loadDepartmentWards = useCallback(async (departmentId: string) => {
    if (!departmentId || wardsByDepartment[departmentId]) return;
    const wards = await organizationService.getWards(departmentId);
    setWardsByDepartment((current) => ({ ...current, [departmentId]: wards }));
  }, [wardsByDepartment]);

  const getErrorMessage = useCallback((caught: unknown) => {
    const messages = interpretServerError((caught as { details?: unknown })?.details || caught);
    if (messages.length) return messages.join(" ");
    if (caught instanceof Error) return caught.message;
    return "Something went wrong while loading bed operations.";
  }, []);

  const loadHospitals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const hospitalPage = await organizationService.getHospitals();
      const items = hospitalPage.results;
      setHospitals(items);
      if (!selectedHospitalId && items.length) {
        setSelectedHospitalId(items[0].id);
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, selectedHospitalId]);

  const loadBedDetail = useCallback(async (bedId: string) => {
    try {
      const [bed, bedHistory] = await Promise.all([
        bedService.getBed(bedId),
        bedService.getStatusHistory(bedId),
      ]);
      setSelectedBed(bed);
      setHistory(bedHistory);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  }, [getErrorMessage]);

  const loadHospitalData = useCallback(async (hospitalId: string) => {
    if (!hospitalId) return;
    setIsBusy(true);
    setError(null);
    try {
      const [departmentList, tagPage, bedPage, statBlock, analyticsBlock, maintenancePage, requestPage, admissionPage] =
        await Promise.all([
          organizationService.getDepartments(hospitalId),
          bedService.getEquipmentTags({ is_active: true }),
          bedService.getBeds({ hospital: hospitalId, page_size: 100, ...appliedFilters }),
          bedService.getStatistics(hospitalId),
          bedService.getAnalytics(hospitalId),
          bedService.getMaintenanceRecords({ hospital: hospitalId, page_size: 100 }),
          admissionService.getAdmissionRequests({ hospital: hospitalId, page_size: 100 }),
          admissionService.getActiveAdmissions({ hospital: hospitalId, page: 1 }),
        ]);

      setDepartments(departmentList);
      setEquipmentTags(tagPage.results);
      setBeds(bedPage.results);
      setStats(statBlock);
      setAnalytics(analyticsBlock);
      setMaintenance(maintenancePage.results);
      setAdmissionRequests(requestPage.results);
      setActiveAdmissions(admissionPage.results);

      const wardEntries = await Promise.all(
        departmentList.map(async (department) => [department.id, await organizationService.getWards(department.id)] as const)
      );
      setWardsByDepartment(Object.fromEntries(wardEntries));

      if (selectedBed) {
        const refreshed = bedPage.results.find((bed) => bed.id === selectedBed.id);
        if (!refreshed) {
          setSelectedBed(null);
          setHistory([]);
        } else {
          await loadBedDetail(selectedBed.id);
        }
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsBusy(false);
      setIsLoading(false);
    }
  }, [appliedFilters, getErrorMessage, loadBedDetail, selectedBed]);

  const refreshEverything = useCallback(async () => {
    if (!selectedHospitalId) return;
    await loadHospitalData(selectedHospitalId);
  }, [loadHospitalData, selectedHospitalId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHospitals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadHospitals]);

  useEffect(() => {
    if (!selectedHospitalId) return;
    const timer = window.setTimeout(() => {
      void loadHospitalData(selectedHospitalId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadHospitalData, selectedHospitalId]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const handleResetFilters = () => {
    const cleared = {
      status: undefined,
      bed_type: undefined,
      department: undefined,
      ward: undefined,
      search: "",
      is_active: undefined,
      is_isolation: undefined,
    };
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
  };

  const runBedAction = async (action: () => Promise<unknown>, bedId?: string) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      await refreshEverything();
      if (bedId) {
        await loadBedDetail(bedId);
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateBed = async () => {
    await runBedAction(async () => {
      const created = await bedService.createBed(createForm);
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      setCreateDepartmentId("");
      await loadBedDetail(created.id);
    });
  };

  const handleCreateEquipmentTag = async () => {
    await runBedAction(async () => {
      await bedService.createEquipmentTag({
        ...equipmentForm,
        code: equipmentForm.code.toUpperCase(),
      });
      setShowEquipmentModal(false);
      setEquipmentForm({ name: "", code: "", category: "monitoring", description: "" });
    });
  };

  const handleCreateMaintenance = async () => {
    await runBedAction(async () => {
      await bedService.createMaintenanceRecord(maintenanceForm);
      setShowMaintenanceModal(false);
      setMaintenanceForm({
        bed: selectedBed?.id || "",
        issue_description: "",
        maintenance_type: "repair",
        severity: "medium",
      });
    }, maintenanceForm.bed);
  };

  const statCards = [
    { label: "Available", value: stats?.available || 0, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Occupied", value: stats?.occupied || 0, icon: Activity, tone: "text-indigo-600" },
    { label: "Cleaning", value: (stats?.cleaning_required || 0) + (stats?.cleaning_in_progress || 0), icon: Sparkles, tone: "text-orange-600" },
    { label: "Maintenance", value: stats?.maintenance || 0, icon: Wrench, tone: "text-slate-600" },
    { label: "Blocked", value: stats?.blocked || 0, icon: ShieldAlert, tone: "text-rose-600" },
    { label: "Occupancy", value: `${stats?.occupancy_rate || 0}%`, icon: Clock3, tone: "text-sky-600" },
  ];

  if (isLoading) {
    return <LoadingScreen minDuration={500} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar
        hospitalName={selectedHospital?.name || "Hospital"}
        hospitalCode={selectedHospital?.code || "-"}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          onMenuToggle={() => setSidebarOpen((value) => !value)}
          hospitalName={selectedHospital?.name || "Hospital"}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="grid gap-4 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid gap-2">
                  <h1 className="text-2xl font-semibold text-slate-900">Bed Operations</h1>
                  <p className="text-sm text-slate-500">
                    Live inventory, assignment safety, cleaning turnover, and maintenance in one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Field label="Hospital">
                    <select
                      value={selectedHospitalId}
                      onChange={(event) => setSelectedHospitalId(event.target.value)}
                      className="min-w-[240px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    >
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    onClick={() => void refreshEverything()}
                    className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className={cn("h-4 w-4", isBusy && "animate-spin")} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    New Bed
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {statCards.map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="grid gap-2 border border-slate-200 px-4 py-4">
                    <div className={cn("flex items-center gap-2 text-sm font-medium", tone)}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "border px-4 py-2 text-sm font-medium",
                    activeTab === tab
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {activeTab === "inventory" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid gap-6">
                  <Section
                    title="Filters"
                    description="Narrow the live bed list by location, state, and clinical constraints."
                    actions={
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleResetFilters}
                          className="border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleApplyFilters}
                          className="inline-flex items-center gap-2 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          <Filter className="h-4 w-4" />
                          Apply
                        </button>
                      </div>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Search">
                        <input
                          value={draftFilters.search || ""}
                          onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                          className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                          placeholder="Bed code, ward, department"
                        />
                      </Field>
                      <Field label="Status">
                        <select
                          value={draftFilters.status || ""}
                          onChange={(event) =>
                            setDraftFilters((current) => ({
                              ...current,
                              status: (event.target.value || undefined) as BedStatus | undefined,
                            }))
                          }
                          className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                        >
                          <option value="">All statuses</option>
                          {Object.keys(STATUS_STYLES).map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Department">
                        <select
                          value={draftFilters.department || ""}
                          onChange={(event) => {
                            const departmentId = event.target.value || undefined;
                            setDraftFilters((current) => ({
                              ...current,
                              department: departmentId,
                              ward: undefined,
                            }));
                            if (departmentId) void loadDepartmentWards(departmentId);
                          }}
                          className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                        >
                          <option value="">All departments</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Ward">
                        <select
                          value={draftFilters.ward || ""}
                          onChange={(event) =>
                            setDraftFilters((current) => ({
                              ...current,
                              ward: event.target.value || undefined,
                            }))
                          }
                          className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                        >
                          <option value="">All wards</option>
                          {availableWards.map((ward) => (
                            <option key={ward.id} value={ward.id}>
                              {ward.name} ({ward.room_number})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Bed Inventory"
                    description={`${beds.length} beds currently in view for ${selectedHospital?.name || "this hospital"}.`}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-500">
                            <th className="py-3 pr-4 font-medium">Bed</th>
                            <th className="py-3 pr-4 font-medium">Location</th>
                            <th className="py-3 pr-4 font-medium">Type</th>
                            <th className="py-3 pr-4 font-medium">Status</th>
                            <th className="py-3 pr-4 font-medium">Restrictions</th>
                            <th className="py-3 pr-4 font-medium">Tags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beds.map((bed) => (
                            <tr
                              key={bed.id}
                              onClick={() => void loadBedDetail(bed.id)}
                              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="py-3 pr-4">
                                <div className="font-medium text-slate-900">{bed.bed_code}</div>
                                <div className="text-xs text-slate-500">Bed #{bed.bed_number}</div>
                              </td>
                              <td className="py-3 pr-4">
                                <div>{bed.ward_name}</div>
                                <div className="text-xs text-slate-500">{bed.department_name}</div>
                              </td>
                              <td className="py-3 pr-4">{bed.bed_type_display}</td>
                              <td className="py-3 pr-4">{statusPill(bed.status, bed.status_display)}</td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap gap-2">
                                  {bed.is_isolation ? (
                                    <span className="border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                                      Isolation
                                    </span>
                                  ) : null}
                                  {bed.gender_restriction !== "none" ? (
                                    <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                      {bed.gender_restriction.replace("_", " ")}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">None</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap gap-1">
                                  {bed.equipment_tags.slice(0, 3).map((tag) => (
                                    <span key={tag.id} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                                      {tag.name}
                                    </span>
                                  ))}
                                  {bed.equipment_tags.length > 3 ? (
                                    <span className="text-xs text-slate-400">+{bed.equipment_tags.length - 3}</span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </div>

                <Section
                  title={selectedBed ? selectedBed.bed_code : "Bed Details"}
                  description={selectedBed ? "Live state, assignment safety, and action history." : "Select a bed from the inventory to inspect it."}
                >
                  {selectedBed ? (
                    <div className="grid gap-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusPill(selectedBed.status, selectedBed.status_display)}
                        <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                          {selectedBed.bed_type_display}
                        </span>
                        {!selectedBed.is_active ? (
                          <span className="border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                            Inactive
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600">
                        <div className="flex justify-between gap-3">
                          <span>Location</span>
                          <span className="text-right text-slate-900">
                            {selectedBed.ward.name}, {selectedBed.ward.department.name}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Changed</span>
                          <span className="text-right text-slate-900">{formatDateTime(selectedBed.status_changed_at)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Occupied since</span>
                          <span className="text-right text-slate-900">{formatDateTime(selectedBed.occupied_since)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Weight limit</span>
                          <span className="text-right text-slate-900">{selectedBed.max_patient_weight_kg} kg</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Bed size</span>
                          <span className="text-right text-slate-900">{selectedBed.bed_size}</span>
                        </div>
                      </div>

                      {selectedBed.current_patient ? (
                        <div className="grid gap-1 border border-indigo-200 bg-indigo-50 p-4 text-sm">
                          <div className="font-medium text-indigo-900">Current patient</div>
                          <div className="text-indigo-700">{selectedBed.current_patient.name}</div>
                          <div className="text-indigo-600">MRN {selectedBed.current_patient.mrn}</div>
                        </div>
                      ) : null}

                      {selectedBed.current_reservation ? (
                        <div className="grid gap-1 border border-amber-200 bg-amber-50 p-4 text-sm">
                          <div className="font-medium text-amber-900">Reserved for</div>
                          <div className="text-amber-700">{selectedBed.current_reservation.patient_name}</div>
                          <div className="text-amber-600">Until {formatDateTime(selectedBed.current_reservation.reserved_until)}</div>
                        </div>
                      ) : null}

                      <div className="grid gap-2">
                        <div className="text-sm font-medium text-slate-800">Actions</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            onClick={() => void runBedAction(() => bedService.markForCleaning(selectedBed.id, { priority: "routine" }), selectedBed.id)}
                            className="border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            Mark for cleaning
                          </button>
                          {selectedBed.status === "blocked" ? (
                            <button
                              onClick={() => void runBedAction(() => bedService.unblockBed(selectedBed.id), selectedBed.id)}
                              className="border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                            >
                              Unblock bed
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = window.prompt("Why are we blocking this bed?", "Operational hold") || "";
                                if (!reason) return;
                                void runBedAction(() => bedService.blockBed(selectedBed.id, { reason }), selectedBed.id);
                              }}
                              className="border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                            >
                              Block bed
                            </button>
                          )}
                          {selectedBed.current_admission ? (
                            <button
                              onClick={() => void runBedAction(() => bedService.releaseBed(selectedBed.id, { trigger_cleaning: true }), selectedBed.id)}
                              className="border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            >
                              Release bed
                            </button>
                          ) : null}
                          <button
                            onClick={() =>
                              void runBedAction(
                                () =>
                                  bedService.updateBed(selectedBed.id, {
                                    is_active: !selectedBed.is_active,
                                  }),
                                selectedBed.id
                              )
                            }
                            className="border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            {selectedBed.is_active ? "Deactivate" : "Activate"} bed
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="text-sm font-medium text-slate-800">Reservation and assignment</div>
                        <div className="grid gap-2">
                          <select
                            defaultValue=""
                            onChange={(event) => {
                              const admissionRequestId = event.target.value;
                              if (!admissionRequestId) return;
                              const reservedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                              void runBedAction(
                                () =>
                                  bedService.reserveBed(selectedBed.id, {
                                    admission_request_id: admissionRequestId,
                                    reserved_until: reservedUntil,
                                  }),
                                selectedBed.id
                              );
                            }}
                            className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                          >
                            <option value="">Reserve for an admission request</option>
                            {admissionRequests.map((request) => (
                              <option key={request.id} value={request.id}>
                                {request.patient_name || `${request.patient?.first_name || ""} ${request.patient?.last_name || ""}`.trim() || request.id}
                                {request.patient_mrn ? ` (${request.patient_mrn})` : request.patient?.mrn ? ` (${request.patient.mrn})` : ""}
                              </option>
                            ))}
                          </select>
                          <select
                            defaultValue=""
                            onChange={(event) => {
                              const admissionId = event.target.value;
                              if (!admissionId) return;
                              void runBedAction(
                                () => bedService.assignBed(selectedBed.id, { admission_id: admissionId }),
                                selectedBed.id
                              );
                            }}
                            className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                          >
                            <option value="">Assign to an active admission</option>
                            {activeAdmissions.map((admission) => (
                              <option key={admission.id} value={admission.id}>
                                {admission.patient_name || `${admission.patient?.first_name || ""} ${admission.patient?.last_name || ""}`.trim() || admission.id}
                                {admission.patient_mrn ? ` (${admission.patient_mrn})` : admission.patient?.mrn ? ` (${admission.patient.mrn})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="text-sm font-medium text-slate-800">Recent status history</div>
                        <div className="grid gap-2">
                          {history.slice(0, 6).map((item) => (
                            <div key={item.id} className="border border-slate-200 p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                {statusPill(item.status, item.status_display)}
                                <span className="text-xs text-slate-500">{formatDateTime(item.changed_at)}</span>
                              </div>
                              <div className="mt-2 text-slate-700">{item.reason || "No reason captured."}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.changed_by_name || "System"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[280px] place-items-center border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
                      <div className="grid gap-2">
                        <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
                        <p>Select a bed to inspect its state, patient fit, and action history.</p>
                      </div>
                    </div>
                  )}
                </Section>
              </div>
            ) : null}

            {activeTab === "maintenance" ? (
              <Section
                title="Maintenance Queue"
                description="Open and completed bed maintenance records with quick resolution handling."
                actions={
                  <button
                    onClick={() => {
                      setMaintenanceForm((current) => ({ ...current, bed: selectedBed?.id || current.bed }));
                      setShowMaintenanceModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    New maintenance record
                  </button>
                }
              >
                <div className="grid gap-3">
                  {maintenance.map((record) => (
                    <div key={record.id} className="grid gap-3 border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{record.bed_code}</span>
                          {statusPill(record.status, record.status.replace("_", " "))}
                          <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                            {record.severity}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{record.issue_description}</p>
                        <div className="text-xs text-slate-500">
                          Reported {formatDateTime(record.reported_at)} by {record.reported_by_name || "Unknown"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {record.status !== "completed" ? (
                          <button
                            onClick={() =>
                              void runBedAction(
                                () => bedService.resolveMaintenanceRecord(record.id, "Resolved from bed operations workspace"),
                                selectedBed?.id
                              )
                            }
                            className="border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                          >
                            Resolve
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {activeTab === "equipment" ? (
              <Section
                title="Equipment Tags"
                description="Reusable capability tags for filtering and allocation safety."
                actions={
                  <button
                    onClick={() => setShowEquipmentModal(true)}
                    className="inline-flex items-center gap-2 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    New tag
                  </button>
                }
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {equipmentTags.map((tag) => (
                    <div key={tag.id} className="grid gap-2 border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{tag.name}</div>
                        <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          {tag.category}
                        </span>
                      </div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">{tag.code}</div>
                      <p className="text-sm text-slate-600">{tag.description || "No description yet."}</p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {activeTab === "analytics" && analytics ? (
              <Section
                title="Operational Analytics"
                description="Utilization, turnover, isolation usage, and maintenance frequency for the selected hospital."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-3 border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-800">Utilization by type</div>
                    {analytics.utilization_by_type.map((item) => (
                      <div key={item.bed_type} className="grid gap-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize text-slate-700">{item.bed_type}</span>
                          <span className="font-medium text-slate-900">{item.occupancy_rate}%</span>
                        </div>
                        <div className="h-2 bg-slate-100">
                          <div className="h-2 bg-emerald-600" style={{ width: `${Math.min(item.occupancy_rate, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-800">Maintenance frequency</div>
                    {analytics.maintenance_frequency.map((item) => (
                      <div key={item.severity} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-700">{item.severity}</span>
                        <span className="text-slate-900">
                          {item.open} open / {item.total} total
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                      Average cleaning turnaround:{" "}
                      <span className="font-medium text-slate-900">{analytics.average_cleaning_turnaround_minutes} mins</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      Average turnover:{" "}
                      <span className="font-medium text-slate-900">{analytics.average_turnover_minutes} mins</span>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}
          </div>
        </div>
      </main>

      {showCreateModal ? (
        <Modal title="Create bed" onClose={() => setShowCreateModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Department">
              <select
                value={departments.find((department) =>
                  (wardsByDepartment[department.id] || []).some((ward) => ward.id === createForm.ward_id)
                )?.id || createDepartmentId}
                onChange={(event) => {
                  const departmentId = event.target.value;
                  void loadDepartmentWards(departmentId);
                  setCreateDepartmentId(departmentId);
                  setCreateForm((current) => ({ ...current, ward_id: "" }));
                }}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ward">
              <select
                value={createForm.ward_id}
                onChange={(event) => setCreateForm((current) => ({ ...current, ward_id: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Select ward</option>
                {selectedDepartmentWards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name} ({ward.room_number})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bed number">
              <input
                value={createForm.bed_number}
                onChange={(event) => setCreateForm((current) => ({ ...current, bed_number: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Bed type">
              <select
                value={createForm.bed_type}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, bed_type: event.target.value as BedType }))
                }
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {BED_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gender restriction">
              <select
                value={createForm.gender_restriction}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    gender_restriction: event.target.value as GenderRestriction,
                  }))
                }
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight limit (kg)">
              <input
                type="number"
                value={createForm.max_patient_weight_kg}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    max_patient_weight_kg: Number(event.target.value),
                  }))
                }
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Equipment tags">
              <select
                multiple
                value={createForm.equipment_tag_ids}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    equipment_tag_ids: Array.from(event.target.selectedOptions).map((option) => option.value),
                  }))
                }
                className="min-h-[140px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {equipmentTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowCreateModal(false)} className="border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void handleCreateBed()}
              className="bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Create bed
            </button>
          </div>
        </Modal>
      ) : null}

      {showEquipmentModal ? (
        <Modal title="Create equipment tag" onClose={() => setShowEquipmentModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <input
                value={equipmentForm.name}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, name: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Code">
              <input
                value={equipmentForm.code}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                className="border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-600"
              />
            </Field>
            <Field label="Category">
              <select
                value={equipmentForm.category}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, category: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {["life_support", "monitoring", "mobility", "respiratory", "infection_control", "furniture"].map((category) => (
                  <option key={category} value={category}>
                    {category.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <input
                value={equipmentForm.description}
                onChange={(event) => setEquipmentForm((current) => ({ ...current, description: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowEquipmentModal(false)} className="border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void handleCreateEquipmentTag()}
              className="bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create tag
            </button>
          </div>
        </Modal>
      ) : null}

      {showMaintenanceModal ? (
        <Modal title="Create maintenance record" onClose={() => setShowMaintenanceModal(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bed">
              <select
                value={maintenanceForm.bed}
                onChange={(event) => setMaintenanceForm((current) => ({ ...current, bed: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">Select bed</option>
                {beds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.bed_code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={maintenanceForm.maintenance_type}
                onChange={(event) =>
                  setMaintenanceForm((current) => ({ ...current, maintenance_type: event.target.value }))
                }
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {["repair", "preventive", "inspection", "replacement"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <select
                value={maintenanceForm.severity}
                onChange={(event) => setMaintenanceForm((current) => ({ ...current, severity: event.target.value }))}
                className="border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {["low", "medium", "high", "critical"].map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Issue description">
              <textarea
                value={maintenanceForm.issue_description}
                onChange={(event) =>
                  setMaintenanceForm((current) => ({ ...current, issue_description: event.target.value }))
                }
                className="min-h-[120px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 md:col-span-2"
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowMaintenanceModal(false)} className="border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={() => void handleCreateMaintenance()}
              className="bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create record
            </button>
          </div>
        </Modal>
      ) : null}

      {isBusy ? (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Updating bed operations...</span>
        </div>
      ) : null}
    </div>
  );
}

export default function BedsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <BedsContent />
    </ProtectedRoute>
  );
}
