import { DatabaseManager } from "../database/manager"

export class AuthHandler {
    static async userExists(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { email: string }
            if (!body?.email) return ErrorResponse.MISSING_PARAMETERS

            const exists = await DatabaseManager.shared.exists(body.email)
            return new Response(JSON.stringify({ exists }), { status: 200 })
        } catch (error: any) {
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to check if user exists")
        }
    }

    /**
     * Request OTP - Creates a new user account if it doesn't exist
     */
    static async requestOtp(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { email: string, name: string }
            if (!body.email) return ErrorResponse.MISSING_PARAMETERS

            if (!await this.userExists(request)) {
                if (!body.name) return ErrorResponse.MISSING_PARAMETERS
            }

            const email = await DatabaseManager.shared.createUser(body.email, body.name)
            if (!email) return new Response(JSON.stringify({
                error: "Failed to create user"
            }))

            const result = await DatabaseManager.shared.requestOTP(email)
            return new Response(JSON.stringify(result), { status: 200 })
        } catch (error: any) {
            console.log("requestOtp error", error)
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to request OTP")
        }
    }

    static async verifyOtp(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { otpId: string, otpCode: string }
            if (!body.otpId || !body.otpCode) return ErrorResponse.MISSING_PARAMETERS

            const result = await DatabaseManager.shared.verifyOTP(body.otpId, body.otpCode)
            return new Response(JSON.stringify(result))
        } catch (error: any) {
            console.log("verifyOtp error", error)
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to verify OTP")
        }
    } 
}
