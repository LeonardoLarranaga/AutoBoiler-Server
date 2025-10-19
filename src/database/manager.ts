import PocketBase, { ClientResponseError } from "pocketbase"

export class DatabaseManager {
    public static shared: DatabaseManager = new DatabaseManager()

    private pocketbase: PocketBase
    private refreshInterval?: NodeJS.Timeout
    private readonly REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes
    private url: string

    private constructor() {
        const POCKETBASE_URL = process.env.POCKETBASE_URL
        const POCKETBASE_PORT = process.env.POCKETBASE_PORT

        if (!POCKETBASE_URL || !POCKETBASE_PORT) {
            console.error("Missing environment variables.")
            process.exit(1)
        }

        this.url = `http://${POCKETBASE_URL}:${POCKETBASE_PORT}`
        this.pocketbase = new PocketBase(this.url)
    }

    async init() {
        const POCKETBASE_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
        const POCKETBASE_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

        if (!POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD) {
            console.error("Missing admin credentials.")
            process.exit(1)
        }

        while (!this.pocketbase.authStore.isValid) {
            try {
                await this.pocketbase.collection('_superusers').authWithPassword(POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
            } catch (error) {
                console.error("Failed to authenticate with PocketBase:", error)
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        console.success("Authenticated with PocketBase as admin")

        this.refreshInterval = setInterval(async () => {
            try {
                await this.pocketbase.collection('_superusers').authRefresh()
                console.success("Auth token refreshed")
            } catch (error) {
                console.error("Failed to refresh auth token:", error)
            }
        }, this.REFRESH_INTERVAL)
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval)
        }
    }

    // MARK: - App authentication

    async exists(email: string): Promise<boolean> {
        try {
            const record = await this.pocketbase.collection('users').getOne(email)
            return record !== null
        } catch {
            return false
        }
    }

    async createUser(email: string, name: string): Promise<string | null> {
        try {
            const password = crypto.randomUUID()
            await this.pocketbase.collection('users').create({ 
                email, 
                name, 
                password,
                passwordConfirm: password    
            })
            return email
        } catch (error) {
            if (error instanceof ClientResponseError &&
                error.status === 400 &&
                error.response?.data?.email?.code === "validation_not_unique") {
                return email
            }
            console.error("Failed to create user:", error)
            return null
        }
    }

    async requestOTP(email: string) {
        try {
            const result = await this.pocketbase.collection('users').requestOTP(email)
            return { otpId: result.otpId }
        } catch (error) {
            console.error("Failed to request OTP:", error)
            throw error
        }
    }

    async verifyOTP(otpId: string, otpCode: string) {
        try {
            const authData = await this.pocketbase.collection('users').authWithOTP(otpId, otpCode)
            return { 
                token: authData.token,
                user: authData.record
            }
        } catch (error) {
            console.error("Failed to verify OTP:", error)
            throw error
        }
    }

    async verifyToken(token: string): Promise<boolean> {
        try {
            const temp = new PocketBase(this.url)
            temp.authStore.save(token)
            if (!temp.authStore.isValid) return false;
            await temp.collection('users').authRefresh()
            return true
        } catch (error) {
            return false
        }
    }
}