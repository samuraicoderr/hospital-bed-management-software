import { apiClient } from "../ApiClient";
import { BackendRoutes } from "../BackendRoutes";
import { UserType } from "../types/auth";


interface RegisterIn {
    password: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
}

interface RegisterOut {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture: string;
    phone_number: string;
    tier: number;
    is_email_verified: boolean;
    is_phone_number_verified: boolean;
    is_liveness_check_verified: boolean;
    is_bvn_verified: boolean;
}


interface SendEmailOTPIn {
    email: string;
}


interface SendPhoneOTPIn {
    phone_number: string;
}

interface OtpOut {
    detail: string;
    code: "otp_sent" | string;
}

interface VerifyEmailOTPIn {
    email: string;
    otp: string;
}

interface VerifyPhoneOTPIn {
    phone_number: string;
    otp: string;
}

interface EmailVerifyOTPOut {
    detail: string;
    code: "otp_verified" | string;
    need_phone_verification: boolean;
}

interface PhoneVerifyOTPOut {
    detail: string;
    code: "otp_verified" | string;
    need_email_verification: boolean;
}



class RegisterService {
    static async register(registerIn: RegisterIn): Promise<RegisterOut> {
        const res = await apiClient.post<RegisterOut>(BackendRoutes.register, registerIn, {
            requiresAuth: false,
        });

        return res.data;
    }

    static async sendEmailOTP(sendEmailOTPIn: SendEmailOTPIn): Promise<OtpOut> {
        const res = await apiClient.post<OtpOut>(BackendRoutes.sendEmailOtp, sendEmailOTPIn, {
            requiresAuth: false,
        });
        return res.data;
    }

    static async sendPhoneOTP(sendPhoneOTPIn: SendPhoneOTPIn): Promise<OtpOut> {
        const res = await apiClient.post<OtpOut>(BackendRoutes.sendPhoneOtp, sendPhoneOTPIn, {
            requiresAuth: false,
        });
        return res.data;
    }

    static async verifyEmailOTP(verifyEmailOTPIn: VerifyEmailOTPIn): Promise<EmailVerifyOTPOut> {
        const res = await apiClient.post<EmailVerifyOTPOut>(BackendRoutes.checkEmailOtp, verifyEmailOTPIn, {
            requiresAuth: false,
        });
        return res.data;
    }

    static async verifyPhoneOTP(verifyPhoneOTPIn: VerifyPhoneOTPIn): Promise<PhoneVerifyOTPOut> {
        const res = await apiClient.post<PhoneVerifyOTPOut>(BackendRoutes.checkPhoneOtp, verifyPhoneOTPIn, {
            requiresAuth: false,
        });
        return res.data;
    }

}

export default RegisterService;
