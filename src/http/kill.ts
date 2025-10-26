import { DatabaseManager } from "../database/manager"
import { SummaryReportProcessor } from "../reports/summary"

export class KillHandler {
    static async createKill(request: Request): Promise<Response> {
        const body = await parseAndValidate<{ 
            token: string, 
            killId: string, 
            name: string }>(request)

        if (!await DatabaseManager.shared.verifyToken(body.token)) return ErrorResponse.NOT_AUTHORIZED

        const userId = await DatabaseManager.shared.getUserIdFromToken(body.token)
        if (!userId) return ErrorResponse.NOT_AUTHORIZED

        const kill = await DatabaseManager.shared.createKill(userId, body.killId.toUpperCase(), body.name)
        
        if (kill instanceof Response) return kill
        return new Response(JSON.stringify(kill))
    }

    static async listKills(request: Request): Promise<Response> {
        const body = await parseAndValidate<{ token: string }>(request)

        const userId = await DatabaseManager.shared.getUserIdFromToken(body.token)
        if (!userId) return ErrorResponse.NOT_AUTHORIZED

        const kills = await DatabaseManager.shared.getKillsForUser(userId)
        return new Response(JSON.stringify({kills: kills}))
    }

    static async summaryReport(request: Request): Promise<Response> {
        const now = new Date()
        const body = await parseAndValidate<{ token: string, killId: string }>(request)

        const userId = await DatabaseManager.shared.getUserIdFromToken(body.token)
        if (!userId) return ErrorResponse.NOT_AUTHORIZED

        if (body.killId.toUpperCase() !== "ESPIDTEST") {
            if (!await DatabaseManager.shared.killBelongsToUser(body.killId.toUpperCase(), userId)) return ErrorResponse.NOT_AUTHORIZED
        }
        
        const report = await SummaryReportProcessor.shared.process(body.killId.toUpperCase())
        const end = new Date()
        console.success(`🧾 ${body.killId} - Summary report generated in ${end.getTime() - now.getTime()}ms`)
        return new Response(JSON.stringify(report))
    }
}