import { DatabaseManager } from "../database/manager"
import { SummaryReportProcessor } from "../reports/summary"

export class KillHandler {
    static async createKill(request: Request): Promise<Response> {
        const body = await request.json() as {
            userId: string,
            token: string,
            killId: string,
            name: string
        }

        if (!body.userId || !body.token || !body.killId || !body.name) return ErrorResponse.MISSING_PARAMETERS

        if (!await DatabaseManager.shared.verifyToken(body.token)) return ErrorResponse.NOT_AUTHORIZED

        const kill = await DatabaseManager.shared.createKill(body.userId, body.killId, body.name)
        
        if (kill instanceof Response) return kill
        return new Response(JSON.stringify(kill), { status: 200 })
    }

    static async summaryReport(request: Request): Promise<Response> {
        const body = await request.json() as { token: string, killId: string }
        if (!body.token || !body.killId) return ErrorResponse.MISSING_PARAMETERS

        const userId = await DatabaseManager.shared.getUserIdFromToken(body.token)
        if (!userId) return ErrorResponse.NOT_AUTHORIZED

        if (!await DatabaseManager.shared.killBelongsToUser(body.killId, userId)) return ErrorResponse.NOT_AUTHORIZED
        
        const report = await SummaryReportProcessor.shared.process(body.killId)
        return new Response(JSON.stringify(report), { status: 200 })
    }
}