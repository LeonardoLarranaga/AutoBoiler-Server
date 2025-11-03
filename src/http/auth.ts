import { CertificateGenerator } from "../certificates/generator"
import { DatabaseManager } from "../database/manager"

export class AuthHandler {
 
    /**
     * Request OTP - Creates a new user account if it doesn't exist
     */
    static async requestOtp(request: Request): Promise<Response> {
        try {
            const body = await parseAndValidate<{ email: string }>(request)
            
            const email = await DatabaseManager.shared.createUser(body.email.toLowerCase())
            if (!email) return new Response(JSON.stringify({
                error: "Failed to create user"
            }))

            const result = await DatabaseManager.shared.requestOTP(email)
            return new Response(JSON.stringify(result), { status: 200 })
        } catch (error: any) {
            if (error instanceof Response) return error
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to request OTP")
        }
    }

    static async verifyOtp(request: Request): Promise<Response> {
        try {
            const body = await parseAndValidate<{ otpId: string, otpCode: string }>(request)
            const result = await DatabaseManager.shared.verifyOTP(body.otpId, body.otpCode)
            return new Response(JSON.stringify(result))
        } catch (error: any) {
            if (error instanceof Response) return error
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to verify OTP")
        }
    } 

    static async generateBrokerCertificate(request: Request): Promise<Response> {
        try {
            const body = await parseAndValidate<{ token: string, killId: string }>(request)
            
            const userId = await DatabaseManager.shared.getUserIdFromToken(body.token)
            if (!userId) return ErrorResponse.NOT_AUTHORIZED

            if (body.killId.toUpperCase() !== "ESPIDTEST") {
                if (!await DatabaseManager.shared.killBelongsToUser(body.killId.toUpperCase(), userId)) return ErrorResponse.NOT_AUTHORIZED
            }

            const certificates = await CertificateGenerator.shared.generateBrokerCertificate(body.killId)
            
            // Convert buffers to base64 strings for JSON response
            return new Response(JSON.stringify({
                clientCert: certificates.clientCert.toString('base64'),
                clientKey: certificates.clientKey.toString('base64'),
                caCert: certificates.caCert.toString('base64')
            }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        } catch (error: any) {
            if (error instanceof Response) return error
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to generate broker certificate")
        }
    }
}
