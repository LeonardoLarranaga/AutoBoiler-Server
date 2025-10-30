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

    public async process(killId: string, dateInterval: "hour" | "day" | "week" | "month" | "year" | "range", type: "temperature" | "power" | "water-flow", currentTimestamp: Date, direction: "forward" | "backward", startDate?: Date, endDate?: Date): Promise<ReportDetailResult> {
        if (dateInterval === "range") {
            if (!startDate || !endDate) throw ErrorResponse.MISSING_PARAMETERS
        }

        let dataPoints: DataPoint[] = []
        switch (dateInterval) {
            case "hour": 
                dataPoints = await this.getHourlyDataPoints(killId, currentTimestamp, direction, type)
                break
            case "day": 
                dataPoints = await this.getDailyDataPoints(killId, currentTimestamp, direction, type)
                break
            case "week":
                dataPoints = await this.getWeeklyDataPoints(killId, currentTimestamp, direction, type)
                break
            case "month":
                dataPoints = await this.getMonthlyDataPoints(killId, currentTimestamp, direction, type)
                break
            case "year":
                dataPoints = await this.getYearlyDataPoints(killId, currentTimestamp, direction, type)
                break
            case "range":
                break
        }

        return {
            dataPoints: dataPoints,
            average: dataPoints.reduce((acc, curr) => acc + curr.value, 0) / dataPoints.length,
        }
    }

    private async getHourlyDataPoints(killId: string, currentTimestamp: Date | string, direction: "forward" | "backward", type: "temperature" | "power" | "water-flow"): Promise<DataPoint[]> {
        let startDate = new Date(currentTimestamp)
        let endDate = new Date(startDate)

        startDate.setMinutes(0, 0, 0)
        endDate.setMinutes(59, 59, 999)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
        
        if (states.length === 0) {
            let newStateDate: Date | null = null
            if (direction === "backward") {
                newStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, startDate)
            } else {
                newStateDate = await DatabaseManager.shared.getNextKillStateDateAfterTimestamp(killId, endDate)
            }
            if (!newStateDate) return []
            startDate = new Date(newStateDate)
            endDate = new Date(startDate)
            startDate.setMinutes(0, 0, 0)
            endDate.setMinutes(59, 59, 999)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
            if (states.length === 0) return []
        }

        return this.mapDataPoints(states, type)
    }

    private async getDailyDataPoints(killId: string, currentTimestamp: Date | string, direction: "forward" | "backward", type: "temperature" | "power" | "water-flow"): Promise<DataPoint[]> {
        let startDate = new Date(currentTimestamp)
        let endDate = new Date(startDate)
        
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        // If no data is found, look for data in the appropriate direction
        if (states.length === 0) {
            let newStateDate: Date | null = null
            if (direction === "backward") {
                newStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, startDate)
            } else {
                newStateDate = await DatabaseManager.shared.getNextKillStateDateAfterTimestamp(killId, endDate)
            }
            if (!newStateDate) return []
            startDate = new Date(newStateDate)
            endDate = new Date(startDate)
            startDate.setHours(0, 0, 0, 0)
            endDate.setHours(23, 59, 59, 999)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
            if (states.length === 0) return []
        }

        return this.groupBy("hour", this.mapDataPoints(states, type))
    }

    private async getWeeklyDataPoints(killId: string, currentTimestamp: Date | string, direction: "forward" | "backward", type: "temperature" | "power" | "water-flow"): Promise<DataPoint[]> {
        let startDate = new Date(currentTimestamp)
        let endDate = new Date(startDate)
        
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        if (states.length === 0) {
            let newStateDate: Date | null = null
            if (direction === "backward") {
                newStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, startDate)
            } else {
                newStateDate = await DatabaseManager.shared.getNextKillStateDateAfterTimestamp(killId, endDate)
            }
            if (!newStateDate) return []
            startDate = new Date(newStateDate)
            endDate = new Date(startDate)
            startDate.setDate(startDate.getDate() - 7)
            startDate.setHours(0, 0, 0, 0)
            endDate.setHours(23, 59, 59, 999)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
            if (states.length === 0) return []
        }

        return this.groupBy("day", this.mapDataPoints(states, type))
    }

    private async getMonthlyDataPoints(killId: string, currentTimestamp: Date | string, direction: "forward" | "backward", type: "temperature" | "power" | "water-flow"): Promise<DataPoint[]> {
        let startDate = new Date(currentTimestamp)
        let endDate = new Date(startDate)

        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        if (states.length === 0) {
            let newStateDate: Date | null = null
            if (direction === "backward") {
                newStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, startDate)
            } else {
                newStateDate = await DatabaseManager.shared.getNextKillStateDateAfterTimestamp(killId, endDate)
            }
            if (!newStateDate) return []
            startDate = new Date(newStateDate)
            endDate = new Date(startDate)
            startDate.setDate(1)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
            if (states.length === 0) return []
        }

        return this.groupBy("day", this.mapDataPoints(states, type))
    }

    private async getYearlyDataPoints(killId: string, currentTimestamp: Date | string, direction: "forward" | "backward", type: "temperature" | "power" | "water-flow"): Promise<DataPoint[]> {
        let startDate = new Date(currentTimestamp)
        let endDate = new Date(startDate)

        startDate = new Date(startDate.getFullYear(), 0, 1, 0, 0, 0, 0)
        endDate = new Date(startDate.getFullYear(), 11, 31, 23, 59, 59, 999)

        let states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)

        if (states.length === 0) {
            let newStateDate: Date | null = null
            if (direction === "backward") {
                newStateDate = await DatabaseManager.shared.getLastKillStateDateBeforeTimestamp(killId, startDate)
            } else {
                newStateDate = await DatabaseManager.shared.getNextKillStateDateAfterTimestamp(killId, endDate)
            }
            if (!newStateDate) return []
            startDate = new Date(newStateDate)
            endDate = new Date(startDate)
            startDate = new Date(startDate.getFullYear(), 0, 1, 0, 0, 0, 0)
            endDate = new Date(startDate.getFullYear(), 11, 31, 23, 59, 59, 999)
            states = await DatabaseManager.shared.getKillStates(killId, startDate, endDate)
            if (states.length === 0) return []
        }

        return this.groupBy("month", this.mapDataPoints(states, type))
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

    private groupBy(interval: "hour" | "day" | "month", dataPoints: DataPoint[]): DataPoint[] {
        const averages = new Map<string, { sum: number, count: number, date: Date }>()

        dataPoints.forEach(point => {
            const dateKey = new Date(point.timestamp)
            if (interval === "month") dateKey.setDate(1)
            if (interval === "hour") {
                dateKey.setMinutes(0, 0, 0)
            } else {
                dateKey.setHours(0, 0, 0, 0)
            }
            
            let key: string
            if (interval === "hour") {
                key = dateKey.toISOString()
            } else if (interval === "day") {
                key = dateKey.toISOString()
            } else {
                key = `${dateKey.getFullYear()}-${dateKey.getMonth()}`
            }
            
            const existing = averages.get(key) || { sum: 0, count: 0, date: dateKey }
            averages.set(key, {
                sum: existing.sum + point.value,
                count: existing.count + 1,
                date: dateKey
            })
        })

        // Convert to DataPoint array with averages
        const points: DataPoint[] = Array.from(averages.values()).map(data => {
            return {
                timestamp: data.date,
                value: data.sum / data.count
            }
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

        return points
    }
}