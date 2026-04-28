"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Admission,
	AdmissionRequest,
	AdmissionSource,
	AdmissionStatus,
	AdmissionUpdatePayload,
	CreateAdmissionRequest,
	CreateTransferRequest,
	Priority,
	Transfer,
	TransferStatus,
	TransferType,
	BedListItem,
} from "@/lib/api/types";
import { useHospital, useDepartment, usePatient, useAdmission } from "@/lib/api/contexts";
import { admissionService } from "@/lib/api/services";
import { cn, interpretServerError } from "@/lib/utils";
import {
	Bed,
	CheckCircle,
	ChevronDown,
	ClipboardList,
	ClipboardCheck,
	ClipboardX,
	Clock,
	Hospital,
	Loader2,
	MoveRight,
	Plus,
	RefreshCcw,
	Search,
	ShieldCheck,
	Stethoscope,
	X,
} from "lucide-react";

type TabKey = "requests" | "admissions" | "transfers";

const PRIORITY_OPTIONS = [
	{ value: Priority.ROUTINE, label: "Routine" },
	{ value: Priority.URGENT, label: "Urgent" },
	{ value: Priority.EMERGENCY, label: "Emergency" },
	{ value: Priority.STAT, label: "STAT" },
];

const STATUS_OPTIONS = [
	{ value: AdmissionStatus.PENDING, label: "Pending" },
	{ value: AdmissionStatus.APPROVED, label: "Approved" },
	{ value: AdmissionStatus.ASSIGNED, label: "Assigned" },
	{ value: AdmissionStatus.ADMITTED, label: "Admitted" },
	{ value: AdmissionStatus.DISCHARGED, label: "Discharged" },
	{ value: AdmissionStatus.CANCELLED, label: "Cancelled" },
];

const TRANSFER_TYPES = [
	{ value: TransferType.INTRA_WARD, label: "Intra Ward" },
	{ value: TransferType.INTER_WARD, label: "Inter Ward" },
	{ value: TransferType.INTER_HOSPITAL, label: "Inter Hospital" },
];

const TRANSFER_STATUS = [
	{ value: TransferStatus.PENDING, label: "Pending" },
	{ value: TransferStatus.APPROVED, label: "Approved" },
	{ value: TransferStatus.IN_PROGRESS, label: "In Progress" },
	{ value: TransferStatus.COMPLETED, label: "Completed" },
	{ value: TransferStatus.REJECTED, label: "Rejected" },
	{ value: TransferStatus.CANCELLED, label: "Cancelled" },
];

function formatDate(value?: string | null) {
	if (!value) return "--";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "--";
	return date.toLocaleString();
}

function getWaitingMinutes(waitingSince?: string | null) {
	if (!waitingSince) return "--";
	const start = new Date(waitingSince);
	if (Number.isNaN(start.getTime())) return "--";
	const diffMs = Date.now() - start.getTime();
	const minutes = Math.max(0, Math.floor(diffMs / 60000));
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	return `${hours}h ${remainder}m`;
}

function StatusPill({ label, tone }: { label: string; tone?: "success" | "warn" | "neutral" | "danger" }) {
	const toneClass =
		tone === "success"
			? "bg-emerald-100 text-emerald-700"
			: tone === "warn"
			? "bg-amber-100 text-amber-700"
			: tone === "danger"
			? "bg-red-100 text-red-700"
			: "bg-slate-100 text-slate-600";
	return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", toneClass)}>{label}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
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

export default function AdmissionsPage() {
	const { hospital, hospitals } = useHospital();
	const { departments, loadDepartments } = useDepartment();
	const { patients, loadPatients } = usePatient();
	const {
		admissionRequests,
		admissions,
		transfers,
		selectedRequest,
		selectedAdmission,
		selectedTransfer,
		suggestedBeds,
		isLoadingRequests,
		isLoadingAdmissions,
		isLoadingTransfers,
		error,
		loadAdmissionRequests,
		loadAdmissions,
		loadTransfers,
		createAdmissionRequest,
		approveAdmissionRequest,
		cancelAdmissionRequest,
		assignBed,
		reserveBed,
		admitPatient,
		suggestBeds,
		selectRequest,
		selectAdmission,
		selectTransfer,
		updateAdmission,
		dischargeAdmission,
		createTransfer,
		approveTransfer,
		initiateTransfer,
		completeTransfer,
		rejectTransfer,
		refreshAll,
	} = useAdmission();

	const [activeTab, setActiveTab] = useState<TabKey>("requests");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [priorityFilter, setPriorityFilter] = useState<string>("");
	const [transferStatusFilter, setTransferStatusFilter] = useState<string>("");

	const [showRequestModal, setShowRequestModal] = useState(false);
	const [showRequestDetail, setShowRequestDetail] = useState(false);
	const [showAdmissionDetail, setShowAdmissionDetail] = useState(false);
	const [showTransferModal, setShowTransferModal] = useState(false);
	const [showTransferDetail, setShowTransferDetail] = useState(false);

	const [selectedBedId, setSelectedBedId] = useState<string>("");
	const [isBusy, setIsBusy] = useState(false);

	const [requestForm, setRequestForm] = useState<CreateAdmissionRequest>({
		patient_id: "",
		hospital_id: "",
		admission_source: AdmissionSource.DIRECT_ADMISSION,
		requires_isolation: false,
		requires_icu: false,
		required_bed_type: "any",
		clinical_notes: "",
		priority: Priority.ROUTINE,
		department_id: undefined,
	});

	const [admissionUpdate, setAdmissionUpdate] = useState<AdmissionUpdatePayload>({
		diagnosis_code: "",
		diagnosis_description: "",
		clinical_notes: "",
		is_isolation: false,
		isolation_reason: "",
		expected_discharge_date: "",
		visit_number: "",
		external_visit_id: "",
	});

	const [transferForm, setTransferForm] = useState<CreateTransferRequest>({
		admission_id: "",
		transfer_type: TransferType.INTRA_WARD,
		to_hospital_id: "",
		to_department_id: "",
		to_bed_id: undefined,
		reason: "",
		transport_mode: "",
		accompanying_personnel: "",
		special_requirements: "",
	});

	const loadAll = useCallback(async () => {
		if (!hospital) return;
		try {
			await Promise.all([
				loadDepartments(hospital.id),
				loadPatients({ primary_hospital: hospital.id }),
			]);

			await Promise.all([
				loadAdmissionRequests({
					hospital: hospital.id,
					status: statusFilter as AdmissionStatus | undefined,
					priority: priorityFilter as Priority | undefined,
				}),
				loadAdmissions({
					hospital: hospital.id,
					status: statusFilter as AdmissionStatus | undefined,
				}),
				loadTransfers({
					hospital: hospital.id,
					status: transferStatusFilter as TransferStatus | undefined,
				}),
			]);
		} catch (err) {
			console.error("Failed to load data:", err);
		}
	}, [hospital, loadDepartments, loadPatients, loadAdmissionRequests, loadAdmissions, loadTransfers, statusFilter, priorityFilter, transferStatusFilter]);

	useEffect(() => {
		if (hospital) {
			setRequestForm((prev) => ({ ...prev, hospital_id: hospital.id }));
			loadAll();
		}
	}, [hospital, loadAll]);

	const filteredRequests = useMemo(() => {
		if (!searchQuery) return admissionRequests;
		const lower = searchQuery.toLowerCase();
		return admissionRequests.filter((req) =>
			`${req.patient_name || ""} ${req.patient_mrn || ""}`.toLowerCase().includes(lower)
		);
	}, [admissionRequests, searchQuery]);

	const filteredAdmissions = useMemo(() => {
		if (!searchQuery) return admissions;
		const lower = searchQuery.toLowerCase();
		return admissions.filter((adm) =>
			`${adm.patient_name || ""} ${adm.patient_mrn || ""}`.toLowerCase().includes(lower)
		);
	}, [admissions, searchQuery]);

	const filteredTransfers = useMemo(() => {
		if (!searchQuery) return transfers;
		const lower = searchQuery.toLowerCase();
		return transfers.filter((transfer) =>
			`${transfer.patient?.first_name || ""} ${transfer.patient?.last_name || ""}`
				.toLowerCase()
				.includes(lower)
		);
	}, [transfers, searchQuery]);

	const openRequestDetail = async (requestId: string) => {
		setIsBusy(true);
		try {
			const detail = await admissionService.getAdmissionRequest(requestId);
			selectRequest(detail);
			setSelectedBedId("");
			const beds = await suggestBeds(requestId);
			setShowRequestDetail(true);
		} catch (err) {
			console.error("Failed to load request detail:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const openAdmissionDetail = async (admissionId: string) => {
		setIsBusy(true);
		try {
			const admissionDetail = await admissionService.getAdmission(admissionId);
			selectAdmission(admissionDetail);
			setAdmissionUpdate({
				diagnosis_code: admissionDetail.diagnosis_code || "",
				diagnosis_description: admissionDetail.diagnosis_description || "",
				clinical_notes: admissionDetail.clinical_notes || "",
				is_isolation: admissionDetail.is_isolation || false,
				isolation_reason: admissionDetail.isolation_reason || "",
				expected_discharge_date: admissionDetail.expected_discharge_date || "",
				visit_number: admissionDetail.visit_number || "",
				external_visit_id: admissionDetail.external_visit_id || "",
			});
			setShowAdmissionDetail(true);
		} catch (err) {
			console.error("Failed to load admission detail:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleCreateRequest = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsBusy(true);
		try {
			await createAdmissionRequest(requestForm);
			setShowRequestModal(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to create request:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleAssignBed = async () => {
		if (!selectedRequest || !selectedBedId) return;
		setIsBusy(true);
		try {
			await assignBed(selectedRequest.id, selectedBedId);
			await openRequestDetail(selectedRequest.id);
			await loadAll();
		} catch (err) {
			console.error("Failed to assign bed:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleReserveBed = async () => {
		if (!selectedRequest || !selectedBedId) return;
		setIsBusy(true);
		try {
			await reserveBed(selectedRequest.id, selectedBedId);
			await openRequestDetail(selectedRequest.id);
			await loadAll();
		} catch (err) {
			console.error("Failed to reserve bed:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleApproveRequest = async () => {
		if (!selectedRequest) return;
		setIsBusy(true);
		try {
			await approveAdmissionRequest(selectedRequest.id);
			await openRequestDetail(selectedRequest.id);
			await loadAll();
		} catch (err) {
			console.error("Failed to approve request:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleCancelRequest = async () => {
		if (!selectedRequest) return;
		setIsBusy(true);
		try {
			await cancelAdmissionRequest(selectedRequest.id);
			setShowRequestDetail(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to cancel request:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleAdmit = async () => {
		if (!selectedRequest) return;
		setIsBusy(true);
		try {
			await admitPatient(selectedRequest.id);
			setShowRequestDetail(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to admit patient:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleUpdateAdmission = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedAdmission) return;
		setIsBusy(true);
		try {
			await updateAdmission(selectedAdmission.id, admissionUpdate);
			await loadAll();
			setShowAdmissionDetail(false);
		} catch (err) {
			console.error("Failed to update admission:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleDischarge = async () => {
		if (!selectedAdmission) return;
		setIsBusy(true);
		try {
			await dischargeAdmission(selectedAdmission.id);
			setShowAdmissionDetail(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to discharge admission:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleCreateTransfer = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsBusy(true);
		try {
			await createTransfer(transferForm);
			setShowTransferModal(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to create transfer:", err);
		} finally {
			setIsBusy(false);
		}
	};

	const handleTransferAction = async (action: "approve" | "initiate" | "complete" | "reject") => {
		if (!selectedTransfer) return;
		setIsBusy(true);
		try {
			if (action === "approve") {
				await approveTransfer(selectedTransfer.id);
			}
			if (action === "initiate") {
				await initiateTransfer(selectedTransfer.id);
			}
			if (action === "complete") {
				await completeTransfer(selectedTransfer.id);
			}
			if (action === "reject") {
				await rejectTransfer(selectedTransfer.id);
			}
			setShowTransferDetail(false);
			await loadAll();
		} catch (err) {
			console.error("Failed to perform transfer action:", err);
		} finally {
			setIsBusy(false);
		}
	};

	if (isLoadingRequests || isLoadingAdmissions || isLoadingTransfers) {
		return (
			<div className="flex items-center justify-center p-12">
				<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mx-auto max-w-7xl space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-slate-900">Admissions</h1>
						<p className="text-sm text-slate-500">Manage admission requests, active admissions, and transfers</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setShowRequestModal(true)}
							className="inline-flex items-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5a44]"
						>
							<Plus className="h-4 w-4" />
							New Admission Request
						</button>
						<button
							onClick={() => setShowTransferModal(true)}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							<MoveRight className="h-4 w-4" />
							New Transfer
						</button>
					</div>
				</div>

				{error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

				<div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
					<div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
						<Search className="h-4 w-4 text-slate-400" />
						<input
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search by patient name or MRN"
							className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
						/>
					</div>
					<button
						onClick={loadAll}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					>
						<RefreshCcw className="h-4 w-4" />
						Refresh
					</button>
				</div>

				<div className="flex gap-2">
					{([
						{ key: "requests", label: "Requests", icon: ClipboardList },
						{ key: "admissions", label: "Active Admissions", icon: Hospital },
						{ key: "transfers", label: "Transfers", icon: MoveRight },
					] as const).map(({ key, label, icon: Icon }) => (
						<button
							key={key}
							onClick={() => setActiveTab(key)}
							className={cn(
								"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
								activeTab === key
									? "border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]"
									: "border-slate-200 text-slate-600 hover:bg-slate-50"
							)}
						>
							<Icon className="h-4 w-4" />
							{label}
						</button>
					))}
				</div>

				{activeTab === "requests" && (
					<div className="space-y-4">
						<div className="flex flex-wrap gap-3">
							<select
								value={statusFilter}
								onChange={(event) => setStatusFilter(event.target.value)}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">All Statuses</option>
								{STATUS_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<select
								value={priorityFilter}
								onChange={(event) => setPriorityFilter(event.target.value)}
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">All Priorities</option>
								{PRIORITY_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						<div className="rounded-xl border border-slate-200 bg-white">
							<div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
								<div className="col-span-3">Patient</div>
								<div className="col-span-2">Priority</div>
								<div className="col-span-2">Status</div>
								<div className="col-span-2">Assigned Bed</div>
								<div className="col-span-2">Waiting</div>
								<div className="col-span-1"></div>
							</div>
							{filteredRequests.map((request) => (
								<div
									key={request.id}
									className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm"
								>
									<div className="col-span-3">
										<div className="font-medium text-slate-900">{request.patient_name}</div>
										<div className="text-xs text-slate-500">MRN: {request.patient_mrn}</div>
									</div>
									<div className="col-span-2">
										<StatusPill label={request.priority_display} tone="warn" />
									</div>
									<div className="col-span-2">
										<StatusPill
											label={request.status_display}
											tone={request.status === AdmissionStatus.ADMITTED ? "success" : "neutral"}
										/>
									</div>
									<div className="col-span-2 text-slate-600">
										{request.assigned_bed?.bed_code || request.assigned_bed_code || "--"}
									</div>
									<div className="col-span-2 text-slate-600">{getWaitingMinutes(request.waiting_since)}</div>
									<div className="col-span-1 text-right">
										<button
											onClick={() => openRequestDetail(request.id)}
											className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
										>
											<ChevronDown className="h-4 w-4" />
										</button>
									</div>
								</div>
							))}
							{filteredRequests.length === 0 && (
								<div className="p-6 text-center text-sm text-slate-500">No admission requests found.</div>
							)}
						</div>
					</div>
				)}

				{activeTab === "admissions" && (
					<div className="rounded-xl border border-slate-200 bg-white">
						<div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
							<div className="col-span-3">Patient</div>
							<div className="col-span-2">Bed</div>
							<div className="col-span-2">Status</div>
							<div className="col-span-3">Admitted</div>
							<div className="col-span-2"></div>
						</div>
						{filteredAdmissions.map((admission) => (
							<div key={admission.id} className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm">
								<div className="col-span-3">
									<div className="font-medium text-slate-900">{admission.patient_name}</div>
									<div className="text-xs text-slate-500">MRN: {admission.patient_mrn}</div>
								</div>
								<div className="col-span-2 text-slate-600">{admission.bed_code || "--"}</div>
								<div className="col-span-2">
									<StatusPill label={admission.status_display} tone="success" />
								</div>
								<div className="col-span-3 text-slate-600">{formatDate(admission.admitted_at)}</div>
								<div className="col-span-2 text-right">
									<button
										onClick={() => {
											setSelectedAdmission(admission);
											setAdmissionUpdate({
												diagnosis_code: admission.diagnosis_code || "",
												diagnosis_description: admission.diagnosis_description || "",
												clinical_notes: admission.clinical_notes || "",
												is_isolation: admission.is_isolation || false,
												isolation_reason: admission.isolation_reason || "",
												expected_discharge_date: admission.expected_discharge_date || "",
												visit_number: admission.visit_number || "",
												external_visit_id: admission.external_visit_id || "",
											});
											setShowAdmissionDetail(true);
										}}
										className="rounded px-2 py-1 text-xs font-medium text-[#0F6E56] hover:bg-[#E1F5EE]"
									>
										View
									</button>
								</div>
							</div>
						))}
						{filteredAdmissions.length === 0 && (
							<div className="p-6 text-center text-sm text-slate-500">No active admissions found.</div>
						)}
					</div>
				)}

				{activeTab === "transfers" && (
					<div className="space-y-4">
						<select
							value={transferStatusFilter}
							onChange={(event) => setTransferStatusFilter(event.target.value)}
							className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
						>
							<option value="">All Transfer Statuses</option>
							{TRANSFER_STATUS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<div className="rounded-xl border border-slate-200 bg-white">
							<div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
								<div className="col-span-3">Patient</div>
								<div className="col-span-3">Transfer</div>
								<div className="col-span-2">Status</div>
								<div className="col-span-3">Requested</div>
								<div className="col-span-1"></div>
							</div>
							{filteredTransfers.map((transfer) => (
								<div key={transfer.id} className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm">
									<div className="col-span-3">
										<div className="font-medium text-slate-900">
											{transfer.patient?.first_name} {transfer.patient?.last_name}
										</div>
										<div className="text-xs text-slate-500">MRN: {transfer.patient?.mrn}</div>
									</div>
									<div className="col-span-3 text-slate-600">
										{transfer.transfer_type_display}
									</div>
									<div className="col-span-2">
										<StatusPill
											label={transfer.status_display}
											tone={transfer.status === TransferStatus.COMPLETED ? "success" : "neutral"}
										/>
									</div>
									<div className="col-span-3 text-slate-600">{formatDate(transfer.requested_at)}</div>
									<div className="col-span-1 text-right">
										<button
											onClick={() => {
												setSelectedTransfer(transfer);
												setShowTransferDetail(true);
											}}
											className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
										>
											<ChevronDown className="h-4 w-4" />
										</button>
									</div>
								</div>
							))}
							{filteredTransfers.length === 0 && (
								<div className="p-6 text-center text-sm text-slate-500">No transfers found.</div>
							)}
						</div>
					</div>
				)}
			</div>

			{showRequestModal && (
				<Modal title="Create Admission Request" onClose={() => setShowRequestModal(false)}>
					<form onSubmit={handleCreateRequest} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Patient" required>
								<select
									required
									value={requestForm.patient_id}
									onChange={(event) => setRequestForm({ ...requestForm, patient_id: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="">Select patient</option>
									{patients.map((patient) => (
										<option key={patient.id} value={patient.id}>
											{patient.first_name} {patient.last_name} (MRN: {patient.mrn})
										</option>
									))}
								</select>
							</Field>
							<Field label="Admission Source" required>
								<select
									value={requestForm.admission_source}
									onChange={(event) =>
										setRequestForm({ ...requestForm, admission_source: event.target.value as AdmissionSource })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									{Object.values(AdmissionSource).map((source) => (
										<option key={source} value={source}>
											{source.replace(/_/g, " ")}
										</option>
									))}
								</select>
							</Field>
							<Field label="Priority">
								<select
									value={requestForm.priority}
									onChange={(event) => setRequestForm({ ...requestForm, priority: event.target.value as Priority })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									{PRIORITY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="Preferred Department">
								<select
									value={requestForm.department_id || ""}
									onChange={(event) => setRequestForm({ ...requestForm, department_id: event.target.value || undefined })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="">Any department</option>
									{departments.map((dept) => (
										<option key={dept.id} value={dept.id}>
											{dept.name}
										</option>
									))}
								</select>
							</Field>
							<Field label="Required Bed Type">
								<select
									value={requestForm.required_bed_type}
									onChange={(event) => setRequestForm({ ...requestForm, required_bed_type: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="any">Any Available</option>
									<option value="general">General</option>
									<option value="icu">ICU</option>
									<option value="isolation">Isolation</option>
									<option value="emergency">Emergency</option>
									<option value="maternity">Maternity</option>
								</select>
							</Field>
							<Field label="Clinical Notes">
								<textarea
									value={requestForm.clinical_notes}
									onChange={(event) => setRequestForm({ ...requestForm, clinical_notes: event.target.value })}
									rows={3}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
						</div>
						<div className="flex items-center gap-4">
							<label className="flex items-center gap-2 text-sm text-slate-600">
								<input
									type="checkbox"
									checked={requestForm.requires_isolation}
									onChange={(event) => setRequestForm({ ...requestForm, requires_isolation: event.target.checked })}
								/>
								Requires isolation
							</label>
							<label className="flex items-center gap-2 text-sm text-slate-600">
								<input
									type="checkbox"
									checked={requestForm.requires_icu}
									onChange={(event) => setRequestForm({ ...requestForm, requires_icu: event.target.checked })}
								/>
								Requires ICU
							</label>
						</div>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setShowRequestModal(false)}
								className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isBusy}
								className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5a44] disabled:opacity-50"
							>
								{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{showRequestDetail && selectedRequest && (
				<Modal title="Admission Request" onClose={() => setShowRequestDetail(false)}>
					<div className="space-y-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<div className="text-xs text-slate-500">Patient</div>
								<div className="text-sm font-medium text-slate-900">{selectedRequest.patient_name}</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">Status</div>
								<StatusPill label={selectedRequest.status_display} tone="neutral" />
							</div>
							<div>
								<div className="text-xs text-slate-500">Priority</div>
								<div className="text-sm text-slate-700">{selectedRequest.priority_display}</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">Waiting</div>
								<div className="text-sm text-slate-700">{getWaitingMinutes(selectedRequest.waiting_since)}</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">Assigned Bed</div>
								<div className="text-sm text-slate-700">{selectedRequest.assigned_bed?.bed_code || "--"}</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">Reserved Bed</div>
								<div className="text-sm text-slate-700">{selectedRequest.reserved_bed?.bed_code || "--"}</div>
							</div>
						</div>

						<div>
							<div className="text-sm font-medium text-slate-900">Suggested Beds</div>
							<div className="mt-3 space-y-2">
								{suggestedBeds.map((bed) => (
									<label
										key={bed.id}
										className={cn(
											"flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
											selectedBedId === bed.id ? "border-[#0F6E56] bg-[#E1F5EE]" : "border-slate-200"
										)}
									>
										<div>
											<div className="font-medium text-slate-900">{bed.bed_code}</div>
											<div className="text-xs text-slate-500">{bed.department_name} · {bed.ward_name}</div>
										</div>
										<input
											type="radio"
											name="bed"
											checked={selectedBedId === bed.id}
											onChange={() => setSelectedBedId(bed.id)}
										/>
									</label>
								))}
								{suggestedBeds.length === 0 && (
									<div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
										No suggested beds available.
									</div>
								)}
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								onClick={handleApproveRequest}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
							>
								<ShieldCheck className="h-4 w-4" />
								Approve
							</button>
							<button
								onClick={handleAssignBed}
								disabled={!selectedBedId}
								className="inline-flex items-center gap-2 rounded-lg bg-[#0F6E56] px-3 py-2 text-sm text-white hover:bg-[#0a5a44] disabled:opacity-50"
							>
								<Bed className="h-4 w-4" />
								Assign Bed
							</button>
							<button
								onClick={handleReserveBed}
								disabled={!selectedBedId}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							>
								<Clock className="h-4 w-4" />
								Reserve Bed
							</button>
							<button
								onClick={handleAdmit}
								className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
							>
								<ClipboardCheck className="h-4 w-4" />
								Admit
							</button>
							<button
								onClick={handleCancelRequest}
								className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
							>
								<ClipboardX className="h-4 w-4" />
								Cancel
							</button>
						</div>
					</div>
				</Modal>
			)}

			{showAdmissionDetail && selectedAdmission && (
				<Modal title="Admission Details" onClose={() => setShowAdmissionDetail(false)}>
					<form onSubmit={handleUpdateAdmission} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Diagnosis Code">
								<input
									value={admissionUpdate.diagnosis_code || ""}
									onChange={(event) => setAdmissionUpdate({ ...admissionUpdate, diagnosis_code: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Visit Number">
								<input
									value={admissionUpdate.visit_number || ""}
									onChange={(event) => setAdmissionUpdate({ ...admissionUpdate, visit_number: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Expected Discharge Date">
								<input
									type="date"
									value={admissionUpdate.expected_discharge_date || ""}
									onChange={(event) =>
										setAdmissionUpdate({ ...admissionUpdate, expected_discharge_date: event.target.value })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="External Visit ID">
								<input
									value={admissionUpdate.external_visit_id || ""}
									onChange={(event) =>
										setAdmissionUpdate({ ...admissionUpdate, external_visit_id: event.target.value })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Diagnosis Description">
								<textarea
									value={admissionUpdate.diagnosis_description || ""}
									onChange={(event) =>
										setAdmissionUpdate({ ...admissionUpdate, diagnosis_description: event.target.value })
									}
									rows={3}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Clinical Notes">
								<textarea
									value={admissionUpdate.clinical_notes || ""}
									onChange={(event) => setAdmissionUpdate({ ...admissionUpdate, clinical_notes: event.target.value })}
									rows={3}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
						</div>
						<div className="flex items-center gap-3">
							<label className="flex items-center gap-2 text-sm text-slate-600">
								<input
									type="checkbox"
									checked={admissionUpdate.is_isolation || false}
									onChange={(event) =>
										setAdmissionUpdate({ ...admissionUpdate, is_isolation: event.target.checked })
									}
								/>
								Isolation
							</label>
							<input
								placeholder="Isolation reason"
								value={admissionUpdate.isolation_reason || ""}
								onChange={(event) => setAdmissionUpdate({ ...admissionUpdate, isolation_reason: event.target.value })}
								className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
						</div>
						<div className="flex justify-between">
							<button
								type="button"
								onClick={handleDischarge}
								className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
							>
								Discharge
							</button>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setShowAdmissionDetail(false)}
									className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isBusy}
									className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5a44]"
								>
									{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
								</button>
							</div>
						</div>
					</form>
				</Modal>
			)}

			{showTransferModal && (
				<Modal title="Create Transfer" onClose={() => setShowTransferModal(false)}>
					<form onSubmit={handleCreateTransfer} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Admission" required>
								<select
									required
									value={transferForm.admission_id}
									onChange={(event) => setTransferForm({ ...transferForm, admission_id: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="">Select admission</option>
									{admissions.map((admission) => (
										<option key={admission.id} value={admission.id}>
											{admission.patient_name} · {admission.bed_code || "No bed"}
										</option>
									))}
								</select>
							</Field>
							<Field label="Transfer Type" required>
								<select
									required
									value={transferForm.transfer_type}
									onChange={(event) =>
										setTransferForm({ ...transferForm, transfer_type: event.target.value as TransferType })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									{TRANSFER_TYPES.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="To Hospital" required>
								<select
									required
									value={transferForm.to_hospital_id}
									onChange={(event) => {
										const value = event.target.value;
										setTransferForm({ ...transferForm, to_hospital_id: value, to_department_id: "" });
										if (value) {
											loadDepartments(value);
										}
									}}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="">Select hospital</option>
									{hospitals.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</Field>
							<Field label="To Department" required>
								<select
									required
									value={transferForm.to_department_id}
									onChange={(event) => setTransferForm({ ...transferForm, to_department_id: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="">Select department</option>
									{departments.map((dept) => (
										<option key={dept.id} value={dept.id}>
											{dept.name}
										</option>
									))}
								</select>
							</Field>
							<Field label="Reason" required>
								<textarea
									required
									value={transferForm.reason}
									onChange={(event) => setTransferForm({ ...transferForm, reason: event.target.value })}
									rows={3}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Transport Mode">
								<input
									value={transferForm.transport_mode || ""}
									onChange={(event) => setTransferForm({ ...transferForm, transport_mode: event.target.value })}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Accompanying Personnel">
								<input
									value={transferForm.accompanying_personnel || ""}
									onChange={(event) =>
										setTransferForm({ ...transferForm, accompanying_personnel: event.target.value })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
							<Field label="Special Requirements">
								<input
									value={transferForm.special_requirements || ""}
									onChange={(event) =>
										setTransferForm({ ...transferForm, special_requirements: event.target.value })
									}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								/>
							</Field>
						</div>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setShowTransferModal(false)}
								className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isBusy}
								className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a5a44]"
							>
								{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Transfer"}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{showTransferDetail && selectedTransfer && (
				<Modal title="Transfer Details" onClose={() => setShowTransferDetail(false)}>
					<div className="space-y-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<div className="text-xs text-slate-500">Patient</div>
								<div className="text-sm font-medium text-slate-900">
									{selectedTransfer.patient.first_name} {selectedTransfer.patient.last_name}
								</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">Status</div>
								<StatusPill label={selectedTransfer.status_display} tone="neutral" />
							</div>
							<div>
								<div className="text-xs text-slate-500">From</div>
								<div className="text-sm text-slate-700">
									{selectedTransfer.from_department.name} · {selectedTransfer.from_hospital.name}
								</div>
							</div>
							<div>
								<div className="text-xs text-slate-500">To</div>
								<div className="text-sm text-slate-700">
									{selectedTransfer.to_department.name} · {selectedTransfer.to_hospital.name}
								</div>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								onClick={() => handleTransferAction("approve")}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
							>
								<ShieldCheck className="h-4 w-4" />
								Approve
							</button>
							<button
								onClick={() => handleTransferAction("initiate")}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
							>
								<Stethoscope className="h-4 w-4" />
								Initiate
							</button>
							<button
								onClick={() => handleTransferAction("complete")}
								className="inline-flex items-center gap-2 rounded-lg bg-[#0F6E56] px-3 py-2 text-sm text-white hover:bg-[#0a5a44]"
							>
								<CheckCircle className="h-4 w-4" />
								Complete
							</button>
							<button
								onClick={() => handleTransferAction("reject")}
								className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
							>
								<ClipboardX className="h-4 w-4" />
								Reject
							</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
