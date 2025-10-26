import { DatabaseManager } from "../database/manager"
import type { RecordModel } from "pocketbase"

type SummaryReport = {
    boilerId: string
    lastDate: string
    temperatureReadings: number[]
    powerReadings: number[]
    waterFlowReadings: WaterFlowReading[]
}

type WaterFlowReading = {
    day: number
    flows: number[]
}

export class SummaryReportProcessor {
    public static shared: SummaryReportProcessor = new SummaryReportProcessor()

    public async process(boilerId: string): Promise<SummaryReport> {
        // Get data for last 7 days
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        const endDate = new Date()

        const states = await DatabaseManager.shared.getKillStates(boilerId, startDate, endDate)

        const lastDate = this.getLastDate(states)
        const temperatureReadings = this.getTemperatureReadings(states)
        const powerReadings = this.getPowerReadings(states)
        const waterFlowReadings = this.getWaterFlowReadings(states)

        const report: SummaryReport = {
            boilerId,
            lastDate: lastDate.toISOString(),
            temperatureReadings,
            powerReadings,
            waterFlowReadings,
        }

        return report
    }

    /**
     * Get the last temperature date from the states
     */
    private getLastDate(states: RecordModel[]): Date {
        return new Date(states?.[0]?.created ?? Date.now())
    }

    /**
     * Get the last (up to) six temperature readings from the states
     */
    private getTemperatureReadings(states: RecordModel[]): number[] {
        if (!states || states.length === 0) return []
        return states.slice(0, Math.min(6, states.length)).map((state) => state.temperature)
    }

    /**
     * Calculates average power for the last 7 days
     * Groups by day and calculates the average power for each day
     * If there are less than 7 days, it will return the average power for the available days
     */
    private getPowerReadings(states: RecordModel[]): number[] {
        if (!states || states.length === 0) return []

        // Group by day
        const dailySums: Record<string, { total: number; count: number }> = {};
        for (const state of states) {
            const day = new Date(state.created).toISOString().split("T")[0];
            if (!day) continue
            if (!dailySums[day]) {
                dailySums[day] = { total: 0, count: 0 };
            }
            if (typeof state.power === "number") {
                dailySums[day].total += state.power;
                dailySums[day].count++;
            }
        }

        // Calculate average power for each day
        const dailyAverages: number[] = []
        for (const day in dailySums) {
            if (!dailySums[day]) continue
            dailyAverages.push(dailySums[day].total / dailySums[day].count)
        }

        return dailyAverages.slice(0, Math.min(7, dailyAverages.length)).reverse()
    }

    /**
     * Group all (up to 4 random) water flow readings by day
     * Returns an array of [int, double[]]
     * The first element is the number of the day (0-6)
     * The second element is an array of 4 random water flow readings for that day
     */
    private getWaterFlowReadings(states: RecordModel[]): WaterFlowReading[] {
        if (!states || states.length === 0) return []

        // Group by day
        const dailyReadings: Record<string, number[]> = {};
        for (const state of states) {
            const day = new Date(state.created).toISOString().split("T")[0];
            if (!day) continue
            if (!dailyReadings[day]) {
                dailyReadings[day] = [];
            }
            if (typeof state.water_flow === "number") {
                dailyReadings[day].push(state.water_flow);
            }
        }

        // Sort days chronologically
        const sortedDays = Object.keys(dailyReadings).sort();

        // Create result with day numbers (0-6) and up to 4 random readings per day
        const result: WaterFlowReading[] = [];
        for (let i = 0; i < sortedDays.length && i < 7; i++) {
            const day = sortedDays[i];
            if (!day) continue
            const readings = dailyReadings[day];
            if (!readings) continue
            
            // Select up to 4 random readings
            const selectedReadings = this.selectRandomReadings(readings, 4);
            result.push({ day: i, flows: selectedReadings });
        }

        return result;
    }

    /**
     * Randomly select up to count readings from the array
     */
    private selectRandomReadings(readings: number[], count: number): number[] {
        if (readings.length <= count) {
            return readings;
        }

        const shuffled = [...readings];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i];
            shuffled[i] = shuffled[j]!;
            shuffled[j] = temp!;
        }

        return shuffled.slice(0, count);
    }
}