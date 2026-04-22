import { apiClient } from "../ApiClient";
import { BackendRoutes } from "../BackendRoutes";

/* -------------------- TYPES -------------------- */

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  date_joined: string;
  kyc_status?: string;
  avatar?: string;
  [key: string]: any;
}

export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserProfile[];
}

/* -------------------- SERVICE -------------------- */

export class UserService {
  /** Fetch paginated user list (admin) */
  static async getUsers(params?: Record<string, any>): Promise<PaginatedUsers> {
    const res = await apiClient.get<PaginatedUsers>(BackendRoutes.getUsers, {
      requiresAuth: true,
      params,
    });
    return res.data;
  }

  /** Fetch current user's profile */
  static async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>(BackendRoutes.me, {
      requiresAuth: true,
    });
    return res.data;
  }

  /** Update a user by ID */
  static async updateUser(id: string | number, data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await apiClient.put<UserProfile>(BackendRoutes.getUser(String(id)), data, {
      requiresAuth: true,
    });
    return res.data;
  }

  /** Patch a user by ID */
  static async patchUser(id: string | number, data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await apiClient.patch<UserProfile>(BackendRoutes.getUser(String(id)), data, {
      requiresAuth: true,
    });
    return res.data;
  }
}

export default UserService;
