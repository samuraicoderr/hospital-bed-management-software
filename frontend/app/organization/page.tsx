"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { organizationService } from "@/lib/api/services/OrganizationService";
import { interpretServerError } from "@/lib/utils";
import type {
  Building,
  Department,
  DepartmentType,
  Hospital,
  HospitalStaff,
  HospitalStaffInvitation,
  HospitalStaffRole,
  Ward,
} from "@/lib/api/types/organizations.types";
import { Building2, Hospital as HospitalIcon, Layers, ShieldCheck, UserPlus, Users } from "lucide-react";

const STAFF_ROLES: HospitalStaffRole[] = [
  "owner",
  "system_administrator",
  "bed_manager",
  "nurse_supervisor",
  "admission_staff",
  "housekeeping_staff",
  "executive_viewer",
  "clinical_staff",
  "ward_clerk",
];

function roleLabel(value: HospitalStaffRole) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (s) => s.toUpperCase());
}

function ManagementConsole() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [staff, setStaff] = useState<HospitalStaff[]>([]);
  const [pendingInvites, setPendingInvites] = useState<HospitalStaffInvitation[]>([]);
  const [myInvites, setMyInvites] = useState<HospitalStaffInvitation[]>([]);

  const [buildingName, setBuildingName] = useState("");
  const [buildingCode, setBuildingCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentType, setDepartmentType] = useState("general_medicine");
  const [wardDepartment, setWardDepartment] = useState("");
  const [wardName, setWardName] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [wardRoom, setWardRoom] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HospitalStaffRole>("admission_staff");
  const [inviteDepartmentId, setInviteDepartmentId] = useState("");

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.id === selectedHospitalId) ?? null,
    [hospitals, selectedHospitalId],
  );

  const canManageStructure = Boolean(selectedHospital?.can_manage_structure);
  const canManageOrg = Boolean(selectedHospital?.can_manage_organization);

  const loadHierarchy = async (hospitalId: string) => {
    const [hospitalBuildings, hospitalDepartments, hospitalStaff, invites] = await Promise.all([
      organizationService.getBuildings(hospitalId),
      organizationService.getDepartments(hospitalId),
      organizationService.getHospitalStaff(hospitalId),
      organizationService.getPendingInvites(hospitalId).catch(() => []),
    ]);

    setBuildings(hospitalBuildings);
    setDepartments(hospitalDepartments);
    setStaff(hospitalStaff);
    setPendingInvites(invites);
    setWardDepartment((current) => current || hospitalDepartments[0]?.id || "");

    const wardCollections = await Promise.all(
      hospitalDepartments.map((dept) => organizationService.getWards(dept.id).catch(() => [])),
    );
    setWards(wardCollections.flat());
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hospitalsPage, invitesPage] = await Promise.all([
        organizationService.getHospitals(),
        organizationService.getMyInvitations(),
      ]);
      const hospitalList = hospitalsPage.results;
      setHospitals(hospitalList);
      setMyInvites(invitesPage.results);
      const firstHospitalId = hospitalList[0]?.id || "";
      setSelectedHospitalId((current) => current || firstHospitalId);
      if (firstHospitalId) {
        await loadHierarchy(firstHospitalId);
      }
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Could not load organization data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedHospitalId) return;
    loadHierarchy(selectedHospitalId).catch((err) => {
      const details = interpretServerError(err);
      setError(details[0] || "Could not load hospital hierarchy.");
    });
  }, [selectedHospitalId]);

  const runAction = async (action: () => Promise<void>, okMessage: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(okMessage);
    } catch (err) {
      const details = interpretServerError(err);
      setError(details[0] || "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const createBuilding = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedHospitalId || !buildingName.trim() || !buildingCode.trim()) return;
    await runAction(async () => {
      await organizationService.createBuilding({
        hospital: selectedHospitalId,
        name: buildingName.trim(),
        code: buildingCode.trim().toUpperCase(),
        floors: 1,
      });
      setBuildingName("");
      setBuildingCode("");
      await loadHierarchy(selectedHospitalId);
    }, "Building created.");
  };

  const createDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedHospitalId || !departmentName.trim() || !departmentCode.trim()) return;
    await runAction(async () => {
      await organizationService.createDepartment({
        hospital: selectedHospitalId,
        name: departmentName.trim(),
        code: departmentCode.trim().toUpperCase(),
        department_type: departmentType as DepartmentType,
      });
      setDepartmentName("");
      setDepartmentCode("");
      await loadHierarchy(selectedHospitalId);
    }, "Department created.");
  };

  const createWard = async (event: FormEvent) => {
    event.preventDefault();
    if (!wardDepartment || !wardName.trim() || !wardCode.trim() || !wardRoom.trim()) return;
    await runAction(async () => {
      await organizationService.createWard({
        department: wardDepartment,
        name: wardName.trim(),
        code: wardCode.trim().toUpperCase(),
        ward_type: "multi",
        room_number: wardRoom.trim(),
        capacity: 1,
      });
      setWardName("");
      setWardCode("");
      setWardRoom("");
      await loadHierarchy(selectedHospitalId);
    }, "Ward created.");
  };

  const inviteStaff = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedHospitalId || !inviteEmail.trim()) return;
    await runAction(async () => {
      await organizationService.inviteStaff(selectedHospitalId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        department: inviteDepartmentId || null,
      });
      setInviteEmail("");
      await loadHierarchy(selectedHospitalId);
    }, "Invitation sent.");
  };

  const acceptInvite = async (token: string) => {
    await runAction(async () => {
      await organizationService.acceptInvitation(token);
      await loadAll();
    }, "Invitation accepted.");
  };

  const updateStaffRole = async (staffItem: HospitalStaff, role: HospitalStaffRole) => {
    await runAction(async () => {
      await organizationService.updateHospitalStaff(staffItem.id, { role });
      await loadHierarchy(selectedHospitalId);
    }, "Staff role updated.");
  };

  const removeStaff = async (staffId: string) => {
    await runAction(async () => {
      await organizationService.removeHospitalStaff(staffId);
      await loadHierarchy(selectedHospitalId);
    }, "Staff assignment removed.");
  };

  if (loading) {
    return <div className="p-8">Loading organization workspace...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="rounded-lg border bg-white p-4">
          <h1 className="text-xl font-semibold text-slate-900">Hospital Organization Management</h1>
          <p className="mt-1 text-sm text-slate-600">Manage hospitals, structures, staff roles, and invitations.</p>
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">Selected Hospital</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
            >
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name} ({hospital.code}) - {roleLabel((hospital.current_user_role || "executive_viewer") as HospitalStaffRole)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}

        {myInvites.length > 0 ? (
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-900"><ShieldCheck className="h-4 w-4" />Pending Invitations</div>
            <div className="space-y-2">
              {myInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="text-sm text-slate-700">
                    {invite.hospital_name} - {roleLabel(invite.role)}
                  </div>
                  <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white" onClick={() => acceptInvite(invite.token)} disabled={busy}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900"><Building2 className="h-4 w-4" />Buildings</h2>
            {canManageStructure ? (
              <form onSubmit={createBuilding} className="mb-3 grid gap-2 sm:grid-cols-2">
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Building name" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Code" value={buildingCode} onChange={(e) => setBuildingCode(e.target.value.toUpperCase())} />
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-2" disabled={busy}>Add Building</button>
              </form>
            ) : null}
            <div className="space-y-2">
              {buildings.map((building) => (
                <div key={building.id} className="rounded-md border p-2 text-sm">{building.name} ({building.code})</div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900"><HospitalIcon className="h-4 w-4" />Departments</h2>
            {canManageStructure ? (
              <form onSubmit={createDepartment} className="mb-3 grid gap-2 sm:grid-cols-3">
                <input className="rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Department name" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} />
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Code" value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())} />
                <select className="rounded-md border px-3 py-2 text-sm sm:col-span-2" value={departmentType} onChange={(e) => setDepartmentType(e.target.value)}>
                  <option value="general_medicine">General Medicine</option>
                  <option value="surgery">Surgery</option>
                  <option value="icu">ICU</option>
                  <option value="emergency">Emergency</option>
                  <option value="maternity">Maternity</option>
                  <option value="pediatrics">Pediatrics</option>
                </select>
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" disabled={busy}>Add Department</button>
              </form>
            ) : null}
            <div className="space-y-2">
              {departments.map((department) => (
                <div key={department.id} className="rounded-md border p-2 text-sm">{department.name} ({department.code})</div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900"><Layers className="h-4 w-4" />Wards</h2>
            {canManageStructure ? (
              <form onSubmit={createWard} className="mb-3 grid gap-2 sm:grid-cols-2">
                <select className="rounded-md border px-3 py-2 text-sm sm:col-span-2" value={wardDepartment} onChange={(e) => setWardDepartment(e.target.value)}>
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Ward name" value={wardName} onChange={(e) => setWardName(e.target.value)} />
                <input className="rounded-md border px-3 py-2 text-sm" placeholder="Code" value={wardCode} onChange={(e) => setWardCode(e.target.value.toUpperCase())} />
                <input className="rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Room number" value={wardRoom} onChange={(e) => setWardRoom(e.target.value)} />
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white sm:col-span-2" disabled={busy}>Add Ward</button>
              </form>
            ) : null}
            <div className="space-y-2">
              {wards.map((ward) => (
                <div key={ward.id} className="rounded-md border p-2 text-sm">{ward.name} - Room {ward.room_number}</div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900"><Users className="h-4 w-4" />Staff</h2>
            <div className="space-y-2">
              {staff.map((staffItem) => (
                <div key={staffItem.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">{staffItem.user_name || staffItem.user_email}</div>
                    <div className="text-slate-600">{staffItem.user_email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageOrg && !staffItem.is_me ? (
                      <>
                        <select
                          className="rounded-md border px-2 py-1 text-sm"
                          value={staffItem.role}
                          onChange={(e) => updateStaffRole(staffItem, e.target.value as HospitalStaffRole)}
                        >
                          {STAFF_ROLES.map((role) => (
                            <option key={role} value={role}>{roleLabel(role)}</option>
                          ))}
                        </select>
                        {staffItem.role !== "owner" ? (
                          <button className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-700" onClick={() => removeStaff(staffItem.id)} disabled={busy}>
                            Remove
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-sm text-slate-600">{roleLabel(staffItem.role)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {canManageOrg ? (
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900"><UserPlus className="h-4 w-4" />Invite Staff</h2>
            <form onSubmit={inviteStaff} className="grid gap-2 sm:grid-cols-4">
              <input className="rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select className="rounded-md border px-3 py-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as HospitalStaffRole)}>
                {STAFF_ROLES.filter((role) => role !== "owner").map((role) => (
                  <option key={role} value={role}>{roleLabel(role)}</option>
                ))}
              </select>
              <select className="rounded-md border px-3 py-2 text-sm" value={inviteDepartmentId} onChange={(e) => setInviteDepartmentId(e.target.value)}>
                <option value="">No Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white sm:col-span-4" disabled={busy}>Send Invitation</button>
            </form>

            {pendingInvites.length > 0 ? (
              <div className="mt-4 space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="rounded-md border p-2 text-sm text-slate-700">
                    {invite.email} - {roleLabel(invite.role)} - Token: <span className="font-mono">{invite.token}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <ManagementConsole />
    </ProtectedRoute>
  );
}
