// src/pages/HistoryPage.tsx - New Detailed SpO2 Coloring Logic
import React, { useState, useEffect } from 'react';
import { getLogEntries, LogEntry, getWalkTestResults, WalkTestResult } from '../db/db';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subHours, format } from 'date-fns';
import HistoryChart from '../components/HistoryChart';
import './HistoryPage.css';

type TimeRangeOption = 'day' | 'week' | 'month';

// --- Alert Check Functions ---
const checkLowSpo2Alert = (data: LogEntry[]): string | null => { const lowReadings = data.filter(entry => entry.spo2 !== undefined && entry.spo2 < 88); if (lowReadings.length >= 3) { return `Multiple low SpO₂ readings (<88%) detected recently (${lowReadings.length} times). Consider contacting your provider.`; } return null; };
const checkPulseAlert = (data: LogEntry[]): string | null => { const recentPulseEntries = data.filter(entry => entry.pulse !== undefined).slice(-3); if (recentPulseEntries.length < 3) return null; const allHigh = recentPulseEntries.every(entry => entry.pulse! > 110); const allLow = recentPulseEntries.every(entry => entry.pulse! < 50); if (allHigh) { return "Pulse rate has been consistently high (>110 bpm) in recent readings. Please review."; } if (allLow) { return "Pulse rate has been consistently low (<50 bpm) in recent readings. Please review."; } return null; };
const checkCo2RetentionAlert = (data: LogEntry[]): string | null => { const recentOxygenEntries = data.filter(entry => entry.oxygenOn === true && entry.spo2 !== undefined).slice(-3); if (recentOxygenEntries.length < 3) return null; const allHighOnOxygen = recentOxygenEntries.every(entry => entry.spo2! > 94); if (allHighOnOxygen) { return "Warning: SpO₂ consistently >94% while using oxygen. Discuss with your doctor if this could indicate CO₂ retention."; } return null; };

// --- CSV Helper Functions ---
const escapeCsvField = (field: any): string => { if (field === undefined || field === null) { return ''; } const stringField = String(field); if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) { return `"${stringField.replace(/"/g, '""')}"`; } return stringField; };
const generateCsvContent = (data: LogEntry[]): string => { if (!Array.isArray(data) || data.length === 0) { return ''; } const headers = [ 'Timestamp', 'DateTime', 'SpO2', 'Pulse', 'OxygenOn', 'OxygenFlowLPM', 'Borg', 'Symptoms', 'Notes' ]; const headerRow = headers.map(escapeCsvField).join(','); const dataRows = data.map(entry => { const readableDateTime = entry.timestamp ? format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss') : ''; const symptomsString = Array.isArray(entry.symptoms) ? entry.symptoms.join(' | ') : ''; const row = [ entry.timestamp, readableDateTime, entry.spo2, entry.pulse, entry.oxygenOn, entry.oxygenFlow, entry.borg, symptomsString, entry.notes ]; return row.map(escapeCsvField).join(','); }); return [headerRow, ...dataRows].join('\n'); };
const downloadCsv = (csvContent: string, filename: string) => { if (!csvContent) return; const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } else { alert("CSV Download is not supported by your browser."); } };

// *** UPDATED Helper function for SpO2 cell background class names based on new table ***
const getSpo2ClassName = (css
    spo2: number | undefined | null,
    hasCopd: boolean | undefined | null,
    oxygenOn: boolean | undefined | null,
    oxygenFlow: number | undefined | null,
    stage: 'start' | 'mid' | 'end' | 'recovery' // Stage of the test
): string => {
    if (spo2 === undefined || spo2 === null || isNaN(spo2)) {
        return ''; // Default: no specific background for N/A
    }

    const isCopdPatient = hasCopd === true;
    const isOnOxygen = oxygenOn === true;
    const flow = isOnOxygen && typeof oxygenFlow === 'number' ? oxygenFlow : 0; // Default flow to 0 if undefined but on O2

    // Healthy User (Saudável (0 L/min))
    if (!isCopdPatient && !isOnOxygen) { // Assuming healthy means no supplemental O2
        if (stage === 'start') { // Repouso
            if (spo2 < 95) return 'spo2-low';      // Vermelho: < 95%
            if (spo2 === 95) return 'spo2-caution'; // Amarelo: 95%
            return 'spo2-normal';                  // Verde: 96-99%
        }
        if (stage === 'mid') { // Nadir durante 6 MWT
            if (spo2 < 95) return 'spo2-low'; // Vermelho (from "Nadir - Vermelho < 95% ou queda...")
            return 'spo2-normal';             // Verde >= 95%
        }
        if (stage === 'end') { // Fim dos 6 min
            if (spo2 < 94) return 'spo2-low';
            // No explicit yellow, Green is 95-98. So 94 is caution.
            if (spo2 === 94) return 'spo2-caution';
            return 'spo2-normal'; // >=95%
        }
        if (stage === 'recovery') { // +1 min de recuperação - OK (aim for resting targets)
            if (spo2 < 95) return 'spo2-low';
            if (spo2 === 95) return 'spo2-caution';
            return 'spo2-normal';
        }
    }
    // COPD Patient
    else if (isCopdPatient) {
        if (stage === 'start') { // Repouso
            if (!isOnOxygen) { // COPD <br>0 L/min
                if (spo2 < 90) return 'spo2-low';
                if (spo2 <= 91) return 'spo2-caution'; // 90-91% Amarelo
                return 'spo2-normal'; // 92-96% Verde
            } else { // COPD + O2
                if (flow <= 1) { // COPD <br>1 L/min
                    if (spo2 < 88) return 'spo2-low';
                    if (spo2 <= 89) return 'spo2-caution'; // 88-89% Amarelo
                    return 'spo2-normal'; // >=90% Verde
                } else if (flow === 2) { // COPD <br>2 L/min
                    if (spo2 < 90) return 'spo2-low';
                    if (spo2 <= 91) return 'spo2-caution'; // 90-91% Amarelo
                    return 'spo2-normal'; // >=92% Verde
                } else if (flow >= 3 && flow <= 4) { // COPD <br>3-4 L/min
                    if (spo2 < 93) return 'spo2-low';
                    if (spo2 === 92) return 'spo2-caution'; // Amarelo 92%
                    return 'spo2-normal'; // >=93% Verde
                } else { // COPD <br>> 4 L/min
                    if (spo2 < 94) return 'spo2-low';
                    if (spo2 <= 94) return 'spo2-caution'; // Amarelo 93-94% (Using 94 as yellow boundary)
                    return 'spo2-normal'; // >=94% Verde (Using 94-96 as green)
                }
            }
        }
        if (stage === 'mid') { // Nadir durante 6 MWT
            if (!isOnOxygen) { // COPD <br>0 L/min
                if (spo2 < 88) return 'spo2-low';
                if (spo2 < 92) return 'spo2-caution'; // 88-91% Yellow
                return 'spo2-normal'; // >=92% Verde
            } else { // COPD + O2
                if (flow <= 1) { if (spo2 < 88) return 'spo2-low'; if (spo2 < 90) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow === 2) { if (spo2 < 90) return 'spo2-low'; if (spo2 < 92) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow >= 3 && flow <= 4) { if (spo2 < 91) return 'spo2-low'; if (spo2 < 93) return 'spo2-caution'; return 'spo2-normal'; }
                else { if (spo2 < 92) return 'spo2-low'; if (spo2 < 94) return 'spo2-caution'; return 'spo2-normal'; }
            }
        }
        if (stage === 'end') { // Fim dos 6 min
            if (!isOnOxygen) { // COPD <br>0 L/min
                if (spo2 < 88) return 'spo2-low';
                if (spo2 < 90) return 'spo2-caution'; // 88-89% Yellow
                return 'spo2-normal'; // 90-93% Verde
            } else { // COPD + O2
                if (flow <= 1) { if (spo2 < 88) return 'spo2-low'; if (spo2 < 90) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow === 2) { if (spo2 < 90) return 'spo2-low'; if (spo2 < 92) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow >= 3 && flow <= 4) { if (spo2 < 92) return 'spo2-low'; if (spo2 < 93) return 'spo2-caution'; return 'spo2-normal'; }
                else { if (spo2 < 93) return 'spo2-low'; if (spo2 < 94) return 'spo2-caution'; return 'spo2-normal'; }
            }
        }
        if (stage === 'recovery') { // +1 min de recuperação - OK (Aim for resting targets)
            // Using Repouso targets for recovery coloring
            if (!isOnOxygen) { if (spo2 < 90) return 'spo2-low'; if (spo2 <= 91) return 'spo2-caution'; return 'spo2-normal'; }
            else {
                if (flow <= 1) { if (spo2 < 88) return 'spo2-low'; if (spo2 <= 89) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow === 2) { if (spo2 < 90) return 'spo2-low'; if (spo2 <= 91) return 'spo2-caution'; return 'spo2-normal'; }
                else if (flow >= 3 && flow <= 4) { if (spo2 < 93) return 'spo2-low'; if (spo2 === 92) return 'spo2-caution'; return 'spo2-normal'; }
                else { if (spo2 < 94) return 'spo2-low'; if (spo2 <= 94) return 'spo2-caution'; return 'spo2-normal'; }
            }
        }
    }
    return ''; // Fallback
};


// Helper function for SpO2 Desaturation Indicator
interface DesaturationIndicator { symbol: string; className: string; }
const getDesaturationIndicator = (preSpo2: number | undefined, postSpo2: number | undefined, hasCopd: boolean | undefined, oxygenOn: boolean | undefined): DesaturationIndicator | null => {
    if (typeof preSpo2 !== 'number' || typeof postSpo2 !== 'number') { return null; }

    const drop = preSpo2 - postSpo2;
    const isCopdPatient = hasCopd === true;
    const isOnOxygen = oxygenOn === true; // We might use this if rules change for desat on O2

    // From your first table: "Nadir - Vermelho (Dessaturação de esforço)"
    // Saudável: "< 95 % ou queda ≥ 3 pp"
    // COPD (0 L/min): "< 88 % ou queda ≥ 4 pp"
    // For COPD on O2, the detailed table doesn't specify desaturation drop for red, only nadir values.
    // So, we'll primarily use the drop percentages for the arrow, and nadir for cell color.

    let significantDropThreshold = isCopdPatient ? 4 : 3; // 4pp for COPD, 3pp for healthy

    if (drop >= significantDropThreshold) {
        return { symbol: '▼', className: 'desaturation-significant' }; // Red
    } else if (drop > 0) { // Mild drop (1 to threshold-1 pp)
        return { symbol: '―', className: 'desaturation-mild' };      // Yellow/Neutral
    } else if (drop <= 0) { // No drop or an increase
        return { symbol: '▲', className: 'desaturation-improved' };  // Green
    }
    return null;
};

function HistoryPage() {
    const [logData, setLogData] = useState<LogEntry[]>([]);
    const [walkTests, setWalkTests] = useState<WalkTestResult[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRangeOption>('week');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true); setError(null);
        const fetchData = async () => {
            const now = new Date(); let startDate: Date; let endDate: Date = endOfDay(now);
            switch (timeRange) { case 'day': startDate = startOfDay(now); endDate = endOfDay(now); break; case 'week': startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); break; case 'month': startDate = startOfMonth(now); endDate = endOfMonth(now); break; default: startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); }
            try { const [fetchedLogData, fetchedWalkTests] = await Promise.all([ getLogEntries(startDate, endDate), getWalkTestResults(startDate, endDate) ]); console.log("Fetched Walk Tests in History:", fetchedWalkTests); setLogData(Array.isArray(fetchedLogData) ? fetchedLogData : []); setWalkTests(Array.isArray(fetchedWalkTests) ? fetchedWalkTests : []); setError(null); } catch (err) { console.error("Failed to load history data:", err); setError('Failed to load history data.'); setLogData([]); setWalkTests([]); } finally { setIsLoading(false); }
        };
        fetchData();
    }, [timeRange]);

    useEffect(() => {
        if (!isLoading && !error) { const runAlertChecks = async () => { const now = new Date(); const startTime24h = subHours(now, 24); try { const data24h = await getLogEntries(startTime24h, endOfDay(now)); if (!Array.isArray(data24h)) return; const triggeredAlerts: string[] = []; const lowSpo2 = checkLowSpo2Alert(data24h); if (lowSpo2) triggeredAlerts.push(lowSpo2); const pulseAlert = checkPulseAlert(data24h); if (pulseAlert) triggeredAlerts.push(pulseAlert); const co2Alert = checkCo2RetentionAlert(data24h); if (co2Alert) triggeredAlerts.push(co2Alert); setAlerts(triggeredAlerts); } catch (alertError) { console.error("Error checking alerts:", alertError); setAlerts([]); } }; runAlertChecks(); } else { setAlerts([]); }
    }, [isLoading, error]);

    const handleExport = async () => { setIsExporting(true); setExportError(null); try { const startDate = new Date(0); const endDate = new Date(); const allData = await getLogEntries(startDate, endDate); if (!Array.isArray(allData) || allData.length === 0) { alert("No data available to export."); setIsExporting(false); return; } const csvContent = generateCsvContent(allData); const filename = `breathetrack_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`; downloadCsv(csvContent, filename); } catch (err) { console.error("!!! Error during export:", err); setExportError("Failed to export data. Please try again."); } finally { setIsExporting(false); } };

    let averageSpo2 = 'N/A', lowestSpo2: string = 'N/A', readingsBelow88 = 0;
    let percentageBelow88 = '0', averagePulse = 'N/A', averageBorg = 'N/A';
    if (!isLoading && !error && Array.isArray(logData) && logData.length > 0) {
        const validSpo2 = logData.map(d => d.spo2).filter(val => typeof val === 'number') as number[];
        const validPulse = logData.map(d => d.pulse).filter(val => typeof val === 'number') as number[];
        const validBorg = logData.map(d => d.borg).filter(val => typeof val === 'number') as number[];
        averageSpo2 = validSpo2.length ? (validSpo2.reduce((a, b) => a + b, 0) / validSpo2.length).toFixed(1) : 'N/A';
        lowestSpo2 = validSpo2.length ? Math.min(...validSpo2).toString() : 'N/A';
        readingsBelow88 = validSpo2.filter(s => s < 88).length;
        percentageBelow88 = validSpo2.length ? ((readingsBelow88 / validSpo2.length) * 100).toFixed(0) : '0';
        averagePulse = validPulse.length ? (validPulse.reduce((a, b) => a + b, 0) / validPulse.length).toFixed(0) : 'N/A';
        averageBorg = validBorg.length ? (validBorg.reduce((a, b) => a + b, 0) / validBorg.length).toFixed(1) : 'N/A';
    }

    return (
        <div className="history-container">
            <h1>History & Trends</h1>
            {alerts.length > 0 && ( <div className="alerts-section"> <h2>Alerts / Warnings (Last 24h)</h2> <ul>{alerts.map((alertMsg, index) => (<li key={index}>{alertMsg}</li>))}</ul> </div> )}
            <div className="time-range-selector"> <button onClick={() => setTimeRange('day')} className={timeRange === 'day' ? 'active' : ''}>Day</button> <button onClick={() => setTimeRange('week')} className={timeRange === 'week' ? 'active' : ''}>Week</button> <button onClick={() => setTimeRange('month')} className={timeRange === 'month' ? 'active' : ''}>Month</button> </div>
            {isLoading && <p className="loading-message">Loading data...</p>}
            {!isLoading && error && <p className="error-message">{error}</p>}
            {!isLoading && !error && (
                <>
                    {logData.length > 0 && ( <div className="chart-area"> <HistoryChart logData={logData} /> </div> )}
                    {logData.length > 0 && ( <div className="summary-stats"> <h2>Daily Log Summary ({timeRange})</h2> <div className="stats-grid"> <p>Avg SpO₂: <strong>{averageSpo2}%</strong></p> <p>Lowest SpO₂: <strong>{lowestSpo2}%</strong></p> <p>Avg Pulse: <strong>{averagePulse} bpm</strong></p> <p>Avg Borg: <strong>{averageBorg}</strong></p> <p>SpO2 Below 88%: <strong>{readingsBelow88} ({percentageBelow88}%)</strong></p> </div> </div> )}

                    <div className="walk-test-history-section" style={{ marginTop: logData.length > 0 ? '20px' : '5px' }}>
                        <h2>6-Minute Walk Test History ({timeRange})</h2>
                        {walkTests.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date<br />& Time</th>
                                            <th>O₂<br />Status</th>
                                            <th>Start<br />SpO₂/Pulse</th>
                                            <th>Mid<br />SpO₂/Pulse</th>
                                            <th>End<br />SpO₂/Pulse</th>
                                            <th>Recovery<br />SpO₂/Pulse</th>
                                            <th>Distance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {walkTests.map((test) => {
                                            const desatIndicator = getDesaturationIndicator(test.preTestSpo2, test.postTestSpo2, test.hasCOPD, test.oxygenOn);
                                            return (
                                                <tr key={test.id}>
                                                    <td>{test.testTimestamp ? format(new Date(test.testTimestamp), 'P p') : 'N/A'}</td>
                                                    <td>
                                                        {test.oxygenOn === undefined ? 'N/A' : test.oxygenOn ? `Yes (${test.oxygenFlow ?? '?'} L/min)` : 'No'}
                                                    </td>
                                                    <td className={getSpo2ClassName(test.preTestSpo2, test.hasCOPD, test.oxygenOn, test.oxygenFlow, 'start')}>
                                                        <span>{test.preTestSpo2 ?? 'N/A'}%</span>
                                                        {desatIndicator && (
                                                            <span className={`desat-indicator ${desatIndicator.className}`}>
                                                                {desatIndicator.symbol}
                                                            </span>
                                                        )}
                                                        <br />
                                                        <span className="pulse-value">{test.preTestPulse ?? 'N/A'} bpm</span>
                                                    </td>
                                                    <td className={getSpo2ClassName(test.midpointSpo2, test.hasCOPD, test.oxygenOn, test.oxygenFlow, 'mid')}>
                                                        <span>{test.midpointSpo2 ?? 'N/A'}%</span><br />
                                                        <span className="pulse-value">{test.midpointPulse ?? 'N/A'} bpm</span>
                                                    </td>
                                                    <td className={getSpo2ClassName(test.postTestSpo2, test.hasCOPD, test.oxygenOn, test.oxygenFlow, 'end')}>
                                                        <span>{test.postTestSpo2 ?? 'N/A'}%</span><br />
                                                        <span className="pulse-value">{test.postTestPulse ?? 'N/A'} bpm</span>
                                                    </td>
                                                    <td className={getSpo2ClassName(test.recoverySpo2, test.hasCOPD, test.oxygenOn, test.oxygenFlow, 'recovery')}>
                                                        <span>{test.recoverySpo2 ?? 'N/A'}%</span><br />
                                                        <span className="pulse-value">{test.recoveryPulse ?? 'N/A'} bpm</span>
                                                    </td>
                                                    <td>
                                                        {typeof test.distance === 'number' ? `${test.distance} ${test.distanceUnit || ''}`.trim() : 'N/A'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="no-data-message">No walk tests found for the selected period.</p>
                        )}
                    </div>

                    {logData.length === 0 && walkTests.length === 0 && ( <p className="no-data-message">No data found for the selected period.</p> )}
                </>
            )}
            <div className="export-section"> <button onClick={handleExport} disabled={isExporting} className="btn btn-secondary"> {isExporting ? 'Exporting...' : 'Export All Daily Logs (CSV)'} </button> {exportError && <p className="error-message export-error">{exportError}</p>} </div>
        </div>
    );
}
export default HistoryPage;