import type { RecordModel } from "pocketbase"
import { DatabaseManager } from "../database/manager"

type DataPoint = {
    timestamp: Date
    value: number
}

type ReportDetailResult = {
    dataPoints: DataPoint[]
    average: number
}

export class ReportDetailProcessor {
    public static shared: ReportDetailProcessor = new ReportDetailProcessor()

    public async process(killId: string, dateInterval: "hour" | "day" | "week" | "month" | "year" | "range", type: "temperature" | "power" | "water-flow", currentTimestamp: Date, startDate?: Date, endDate?: Date): Promise<ReportDetailResult> {
        if (dateInterval === "range") {
            if (!startDate || !endDate) throw ErrorResponse.MISSING_PARAMETERS
        }

        let dataPoints: DataPoint[] = []
        switch (dateInterval) {
            case "hour":
                dataPoints = await this.getHourlyData(killId, type, currentTimestamp)
        }

        return {
            dataPoints: dataPoints,
            average: dataPoints.reduce((acc, curr) => acc + curr.value, 0) / dataPoints.length,
        }
    }

    private async getHourlyData(killId: string, type: "temperature" | "power" | "water-flow", currentTimestamp: Date | string): Promise<DataPoint[]> {
        // Calculate start time (1 hour before current timestamp)
        let endDate = new Date(currentTimestamp)
        let startDate = new Date(endDate)
        startDate.setHours(startDate.getHours() - 1);

        // Get all states in the hour range
        console.log(startDate, endDate)
        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        // If no data is found, look for the latest state before the current timestamp
        if (states.length === 0) {
            const lastStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, endDate)
            if (!lastStateDate) return []
            
            endDate = lastStateDate
            startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        }

        // Map states to DataPoint based on type
        return this.mapDataPoints(states, type)
    }

    private mapDataPoints(states: RecordModel[], type: "temperature" | "power" | "water-flow"): DataPoint[] {
        return states.map(state => {
            let value: number
            switch (type) {
                case "temperature":
                    value = state.temperature
                    break
                case "power":
                    value = state.power
                    break
                case "water-flow":
                    value = state.water_flow
                    break
            }

            return {
                timestamp: new Date(state.created),
                value: value
            }
        })
    }
}