import PocketBase from "pocketbase"

export class DatabaseManager {
    private pocketbase: PocketBase
    private refreshInterval?: NodeJS.Timeout
    private readonly REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes

    constructor() {
        const POCKETBASE_URL = process.env.POCKETBASE_URL
        const POCKETBASE_PORT = process.env.POCKETBASE_PORT

        if (!POCKETBASE_URL || !POCKETBASE_PORT) {
            console.error("Missing environment variables.")
            process.exit(1)
        }

        this.pocketbase = new PocketBase(`http://${POCKETBASE_URL}:${POCKETBASE_PORT}`)
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
    
}