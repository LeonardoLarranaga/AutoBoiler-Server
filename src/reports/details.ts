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
                break
            case "day":
                dataPoints = await this.getDailyData(killId, type, currentTimestamp)
                break
            case "week":
                dataPoints = await this.getWeeklyData(killId, type, currentTimestamp)
                break
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
        startDate.setHours(startDate.getHours() - 1)

        // Get all states in the hour range
        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        // If no data is found, look for the latest state before the current timestamp
        if (states.length === 0) {
            const lastStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, endDate)
            if (!lastStateDate) return []
            
            endDate = new Date(lastStateDate)
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 1)

            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        }

        // Map states to DataPoint based on type
        return this.mapDataPoints(states, type)
    }

    private async getDailyData(killId: string, type: "temperature" | "power" | "water-flow", currentTimestamp: Date | string): Promise<DataPoint[]> {
        let endDate = new Date(currentTimestamp)
        let startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 1)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        if (states.length === 0) {
            const lastStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, endDate)
            if (!lastStateDate) return []
            
            endDate = lastStateDate
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 1)

            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        }

        let dataPoints = this.mapDataPoints(states, type)

        // Group by hour and get the average for each hour
        const hourlyAverages = new Map<number, { sum: number, count: number }>()
        
        dataPoints.forEach(point => {
            const hour = point.timestamp.getHours()
            const existing = hourlyAverages.get(hour) || { sum: 0, count: 0 }
            hourlyAverages.set(hour, {
                sum: existing.sum + point.value,
                count: existing.count + 1
            })
        })

        // Convert to DataPoint array with averages
        const hourlyDataPoints: DataPoint[] = Array.from(hourlyAverages.entries()).map(([hour, data]) => {
            const avgDate = new Date(endDate)
            avgDate.setHours(hour, 0, 0, 0)
            return {
                timestamp: avgDate,
                value: data.sum / data.count
            }
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

        return hourlyDataPoints
    }

    private async getWeeklyData(killId: string, type: "temperature" | "power" | "water-flow", currentTimestamp: Date | string): Promise<DataPoint[]> {
        let endDate = new Date(currentTimestamp)
        let startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        
        if (states.length === 0) {
            const lastStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, endDate)
            if (!lastStateDate) return []
            
            endDate = new Date(lastStateDate)
            startDate = new Date(endDate)
            startDate.setDate(startDate.getDate() - 7)

            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        }

        let dataPoints = this.mapDataPoints(states, type)

        // Group by day and get the average for each day
        const dailyAverages = new Map<string, { sum: number, count: number, date: Date }>()
        
        dataPoints.forEach(point => {
            const dateKey = new Date(point.timestamp)
            dateKey.setHours(0, 0, 0, 0)
            const key = dateKey.toISOString()
            const existing = dailyAverages.get(key) || { sum: 0, count: 0, date: dateKey }
            dailyAverages.set(key, {
                sum: existing.sum + point.value,
                count: existing.count + 1,
                date: dateKey
            })
        })

        // Convert to DataPoint array with averages
        const dailyDataPoints: DataPoint[] = Array.from(dailyAverages.values()).map(data => {
            return {
                timestamp: data.date,
                value: data.sum / data.count
            }
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

        return dailyDataPoints
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