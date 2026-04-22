import { apiClient } from "../ApiClient";
import { BackendRoutes } from "../BackendRoutes";

/* -------------------- TYPES -------------------- */

export interface SettingsProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  [key: string]: any;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface Verify2FAPayload {
  otp: string;
}

export interface QRCodeResponse {
  qr_image?: string;
  [key: string]: any;
}

/* -------------------- SERVICE -------------------- */

export class SettingsService {
  /** Fetch current user profile */
  static async getProfile(): Promise<SettingsProfile> {
    const res = await apiClient.get<SettingsProfile>(BackendRoutes.me, {
      requiresAuth: true,
    });
    return res.data;
  }

  /** Update the user profile */
  static async updateProfile(id: number, body: Partial<SettingsProfile>): Promise<SettingsProfile> {
    const res = await apiClient.put<SettingsProfile>(
      BackendRoutes.getUser(String(id)),
      body,
      { requiresAuth: true }
    );
    return res.data;
  }

  /** Change password */
  static async changePassword(body: ChangePasswordPayload): Promise<any> {
    const res = await apiClient.put(BackendRoutes.updatePassword, body, {
      requiresAuth: true,
    });
    return res.data;
  }

  /** Request QR code for 2FA setup */
  static async requestQRCode(): Promise<QRCodeResponse> {
    const res = await apiClient.post<QRCodeResponse>(
      BackendRoutes.requestQrCode,
      { channel: "app" },
      { requiresAuth: true }
    );
    return res.data;
  }

  /** Verify 2FA OTP */
  static async verify2FA(body: Verify2FAPayload): Promise<any> {
    const res = await apiClient.post(BackendRoutes.check2faOtp, body, {
      requiresAuth: true,
    });
    return res.data;
  }
}

export default SettingsService;
