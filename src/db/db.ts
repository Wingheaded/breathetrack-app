// src/db/db.ts - Version 4: Added hasCOPD field to WalkTestResult
import Dexie, { Table } from 'dexie';

// 1. Define LogEntry structure (No changes)
export interface LogEntry {
  id?: number;
  timestamp: number;
  spo2?: number;
  pulse?: number;
  oxygenOn: boolean;
  oxygenFlow?: number;
  borg?: number;
  symptoms?: string[];
  notes?: string;
}

// 2. Define WalkTestResult structure - ADDED hasCOPD FIELD
export interface WalkTestResult {
  id?: number;          // Primary key
  testTimestamp: number; // ms since epoch
  hasCOPD?: boolean;     // NEW: Does the user have COPD?
  oxygenOn?: boolean;
  oxygenFlow?: number;
  preTestSpo2?: number;
  preTestPulse?: number;
  midpointSpo2?: number;
  midpointPulse?: number;
  postTestSpo2?: number;
  postTestPulse?: number;
  recoverySpo2?: number;
  recoveryPulse?: number;
  distance?: number;
  distanceUnit?: 'meters' | 'feet';
}


// 3. Create the Dexie database class
export class AppDB extends Dexie {
  logEntries!: Table<LogEntry, number>;
  walkTestResults!: Table<WalkTestResult, number>;

  constructor() {
    super('BreatheTrackDB'); // Keep the same DB name

    // Define version 1 schema
    this.version(1).stores({
        logEntries: '++id, timestamp',
    });

    // Define version 2 schema (added walkTestResults table)
    this.version(2).stores({
        walkTestResults: '++id, testTimestamp'
    }).upgrade(tx => {
        console.log("Upgrading schema from v1 to v2");
    });

    // Define version 3 schema (added oxygen fields implicitly, indexed oxygenOn)
    this.version(3).stores({
        walkTestResults: '++id, testTimestamp, oxygenOn' // Added oxygenOn index
    }).upgrade(tx => {
        console.log("Upgrading schema from v2 to v3");
    });

    // *** INCREMENTED VERSION TO 4 ***
    // Define version 4 schema (adding hasCOPD field/index)
    this.version(4).stores({
        // logEntries schema remains the same
        // walkTestResults schema adds hasCOPD index
        walkTestResults: '++id, testTimestamp, oxygenOn, hasCOPD' // Keep existing indices, add hasCOPD
    }).upgrade(tx => {
        // This upgrade runs if the user has version 3 and needs to get to version 4
        console.log("Upgrading schema from v3 to v4 (adding hasCOPD index)");
        // No data modification needed here, Dexie adds the field/index.
        // If we wanted to default existing records:
        // return tx.table("walkTestResults").toCollection().modify(test => {
        //   if (test.hasCOPD === undefined) test.hasCOPD = false; // Example default
        // });
      });

  }
}

// 4. Create a single instance of the database
export const db = new AppDB();

// --- Database Interaction Functions ---

// addLogEntry remains the same
export const addLogEntry = async (entryData: Omit<LogEntry, 'id'>): Promise<number> => { /* ... no change ... */
  try {
    const newId = await db.logEntries.add({ ...entryData, timestamp: entryData.timestamp || Date.now() });
    console.log(`Log entry added with id: ${newId}`);
    return newId;
  } catch (error) { console.error("Failed to add log entry:", error); throw error; }
};

// getLogEntries remains the same
export const getLogEntries = async (startDate: Date, endDate: Date): Promise<LogEntry[]> => { /* ... no change ... */
  try {
    const entries = await db.logEntries.where('timestamp').between(startDate.getTime(), endDate.getTime(), true, true).sortBy('timestamp');
    return entries;
  } catch (error) { console.error("Failed to get log entries:", error); return []; }
};

// addWalkTestResult - No change needed here, it already spreads all properties from resultData
export const addWalkTestResult = async (resultData: Omit<WalkTestResult, 'id' & { testTimestamp?: Date | number }>): Promise<number> => { /* ... no change ... */
    try {
        const timestampInput = resultData.testTimestamp instanceof Date
            ? resultData.testTimestamp.getTime()
            : typeof resultData.testTimestamp === 'number'
            ? resultData.testTimestamp
            : Date.now();
        // Dexie 'add' saves all provided fields, including the new `hasCOPD` if present in resultData
        const id = await db.walkTestResults.add({
            ...resultData,
            testTimestamp: timestampInput
        });
        console.log(`Walk Test result added with id: ${id} (includes hasCOPD if provided)`);
        return id;
    } catch (error) {
        console.error("Failed to add Walk Test result:", error);
        throw error;
    }
};


// getWalkTestResults remains the same - it fetches the whole object including new fields
export const getWalkTestResults = async (startDate: Date, endDate: Date): Promise<WalkTestResult[]> => { /* ... no change ... */
    try {
        const results = await db.walkTestResults
            .where('testTimestamp')
            .between(startDate.getTime(), endDate.getTime(), true, true)
            .sortBy('testTimestamp');
        // Results will include `hasCOPD` field for records saved with version 4+
        return results;
    } catch (error) {
        console.error("Failed to get Walk Test results:", error);
        return [];
    }
};

// updateWalkTestDistance remains the same
export const updateWalkTestDistance = async (testId: number, distance?: number, distanceUnit?: 'meters' | 'feet'): Promise<number> => { /* ... no change ... */
    try {
        const count = await db.walkTestResults.update(testId, {
            distance: distance,
            distanceUnit: distanceUnit
        });
        console.log(`Updated distance for Walk Test result id: ${testId}. Rows updated: ${count}`);
        return count;
    } catch (error) {
        console.error("Failed to update Walk Test distance:", error);
        throw error;
    }
};