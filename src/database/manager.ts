import PocketBase, { ClientResponseError, type RecordModel } from "pocketbase"

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

        console.success("🔑 Authenticated with PocketBase as admin")

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

    async createUser(email: string): Promise<string | null> {
        try {
            const password = crypto.randomUUID()
            await this.pocketbase.collection('users').create({ 
                email, 
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
            const temp = new PocketBase(this.url)
            const authData = await temp.collection('users').authWithOTP(otpId, otpCode)
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
        const userId = await this.getUserIdFromToken(token)
        return userId !== null
    }

    async killBelongsToUser(killId: string, userId: string): Promise<boolean> {
        return await this.pocketbase.collection("kills").getFirstListItem(`esp_id = "${killId}" && user = "${userId}"`) !== null
    }

    async getUserIdFromToken(token: string): Promise<string | null> {
        try {
            const temp = new PocketBase(this.url)
            temp.authStore.save(token)
            if (!temp.authStore.isValid) return null
            await temp.collection('users').authRefresh()
            return temp.authStore.record?.id ?? null
        } catch (error) {
            return null
        }
    }

    // MARK: - KiLL Management

    async createKill(userId: string, killId: string, name: string): Promise<RecordModel | Response> {
        try {
            const kill = await this.pocketbase.collection("kills").create({
                user: userId,
                espId: killId,
                name
            })
            return kill
        } catch (error) {
            console.error("Failed to create kill:", error)
            return ErrorResponse.INTERNAL_SERVER_ERROR(error, "Failed to create kill")
        }
    }

    createKillState(killId: string, temperature: number, power: number, waterFlow: number) {
        this.getKillFromKillId(killId).then((kill) => {
            if (!kill) return
            this.pocketbase.collection("kills_states").create({
                kill: kill.id,
                temperature,
                power,
                water_flow: waterFlow,
            }).catch(() => {}) // Fire and forget
        }).catch(() => {})  // Fire and forget
    }

    async getKillFromKillId(killId: string): Promise<RecordModel | null> {
        return await this.pocketbase.collection("kills").getFirstListItem(`esp_id = "${killId}"`) ?? null
    }

    async getKillStates(killId: string, startDate: Date, endDate: Date): Promise<RecordModel[]> {
        const kill = await this.getKillFromKillId(killId)
        if (!kill) return []

        return await this.pocketbase.collection("kills_states").getFullList({
            filter: `kill = "${kill.id}" && created >= "${toPocketbaseDate(startDate)}" && created <= "${toPocketbaseDate(endDate)}"`,
            sort: "-created"
        })
    }

    async getKillsForUser(userId: string): Promise<RecordModel[]> {
        return await this.pocketbase.collection("kills").getFullList({
            filter: `user = "${userId}"`,
            sort: "name"
        })
    }

    async getLastKillStateDateBeforeTimestamp(killId: string, timestamp: Date): Promise<Date | null> {
        const kill = await this.getKillFromKillId(killId)
        if (!kill) return null

        try {
            const state = await this.pocketbase.collection("kills_states").getFirstListItem(`kill = "${kill.id}" && created < "${toPocketbaseDate(timestamp)}"`, {
                sort: "-created"
            })
            
            return state ? new Date(state.created) : null
        } catch (error) {
            if (error instanceof ClientResponseError && error.status === 404) {
                return null
            }
            throw error
        }
    }

    async getNextKillStateDateAfterTimestamp(killId: string, timestamp: Date): Promise<Date | null> {
        const kill = await this.getKillFromKillId(killId)
        if (!kill) return null

        try {
            const state = await this.pocketbase.collection("kills_states").getFirstListItem(`kill = "${kill.id}" && created > "${toPocketbaseDate(timestamp)}"`, {
                sort: "created"
            })
            
            return state ? new Date(state.created) : null
        } catch (error) {
            if (error instanceof ClientResponseError && error.status === 404) {
                return null
            }
            throw error
        }
    }
}