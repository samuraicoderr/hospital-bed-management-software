"use client";

import React, { useState, useEffect } from "react";
import LoadingScreen from "../../components/loading/LoadingScreen";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
import { ProtectedRoute } from "@/lib/api/auth/authContext";
import { admissionService } from "@/lib/api/services";
import { Patient } from "@/lib/api/types";
import {
  Users,
  Search,
  User,
  Phone,
  Bed,
  AlertCircle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import FrontendRoutes from "@/lib/api/FrontendRoutes";

const HOSPITAL_ID = "123e4567-e89b-12d3-a456-426614174000";

function PatientCard({ patient }: { patient: Patient }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`${FrontendRoutes.patients.root}/${patient.id}`)}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0F6E56]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[#0F6E56]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User size={14} />
                {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : "Other"}
              </span>
              <span>
                {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years
              </span>
            </div>
          </div>
        </div>
        {patient.is_currently_admitted ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
            <Bed size={12} />
            Admitted
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Not Admitted
          </span>
        )}
      </div>

      {patient.current_bed && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <Bed className="w-4 h-4 text-[#0F6E56]" />
            <span className="text-gray-600">Current Bed:</span>
            <span className="font-medium text-gray-900">{patient.current_bed.code}</span>
            <span className="text-gray-400">({patient.current_bed.ward})</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

function PatientsContent() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const response = await admissionService.getPatients({
        hospital: HOSPITAL_ID,
        page_size: 50,
      });
      setPatients(response.results);
    } catch (error) {
      console.error("Failed to load patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: patients.length,
    admitted: patients.filter((p) => p.is_currently_admitted).length,
    notAdmitted: patients.filter((p) => !p.is_currently_admitted).length,
  };

  if (isLoading) {
    return <LoadingScreen minDuration={500} />;
  }

  return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
              <p className="text-gray-500 mt-1">View and manage patient records</p>
            </div>
            <button
              onClick={() => router.push(FrontendRoutes.patients.new)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0a5a44] transition-colors"
            >
              <Plus size={18} />
              New Patient
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-[#0F6E56]" />
                <span className="text-sm text-gray-600">Total Patients</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bed className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Currently Admitted</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.admitted}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-600">Not Admitted</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.notAdmitted}</p>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] outline-none"
            />
          </div>

          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No patients match your search" : "No patients found"}
              </p>
            </div>
          )}
        </div>
      </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedRoute fallback={<LoadingScreen minDuration={700} />}>
      <PatientsContent />
    </ProtectedRoute>
  );
}
