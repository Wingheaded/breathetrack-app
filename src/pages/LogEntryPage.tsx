// src/pages/LogEntryPage.tsx
import React, { useState } from 'react';
import { addLogEntry } from '../db/db';
import BorgScaleSelector from '../components/BorgScaleSelector'; // *** IMPORT THE NEW COMPONENT ***

// --- Define Symptom Options ---
const SYMPTOM_OPTIONS = [
  "Increased Dyspnea (Breathlessness)", // Added clarification
  "Increased Fatigue",
  "Cough Change (Frequency/Character)", // Added clarification
  "Sputum Change (Volume/Color)",    // Added clarification
  "Wheezing",
  "Headache",
  "Ankle Swelling",
  "Confusion / Increased Drowsiness" // Added clarification
];


function LogEntryPage() {
  // --- State Variables (Keep existing ones) ---
  const [spo2, setSpo2] = useState<number | ''>('');
  const [pulse, setPulse] = useState<number | ''>('');
  const [oxygenOn, setOxygenOn] = useState(false);
  const [oxygenFlow, setOxygenFlow] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // *** ADD NEW STATE FOR BORG AND SYMPTOMS ***
  const [borg, setBorg] = useState<number | undefined>(undefined); // Holds the selected Borg value (0-10)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]); // Holds list of checked symptoms


  // --- Symptom Checkbox Handler ---
  const handleSymptomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target; // Get the symptom name (value) and if it's checked
    setSelectedSymptoms(prevSymptoms =>
      checked
        ? [...prevSymptoms, value] // If checked, add it to the array
        : prevSymptoms.filter(symptom => symptom !== value) // If unchecked, remove it
    );
  };


  // --- Submit Handler - Updated to include Borg/Symptoms ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('Saving...');

    // --- Updated Validation ---
    if (spo2 === '' && pulse === '' && borg === undefined && selectedSymptoms.length === 0 && notes.trim() === '') {
       setStatusMessage('Please enter at least one value (SpO₂, Pulse, Borg, Symptoms, or Notes).');
       setTimeout(() => setStatusMessage(''), 4000);
       return;
    }
    if (oxygenOn && oxygenFlow === '') {
        setStatusMessage('Please enter Oxygen Flow Rate when "On Oxygen" is selected.');
        setTimeout(() => setStatusMessage(''), 4000);
        return;
    }

    // --- Prepare Data - Updated ---
    const entryData = {
      timestamp: Date.now(),
      spo2: spo2 === '' ? undefined : Number(spo2),
      pulse: pulse === '' ? undefined : Number(pulse),
      oxygenOn: oxygenOn,
      oxygenFlow: oxygenOn && oxygenFlow !== '' ? Number(oxygenFlow) : undefined,
      borg: borg, // *** ADD BORG VALUE ***
      symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined, // *** ADD SYMPTOMS ARRAY (if any selected) ***
      notes: notes.trim() === '' ? undefined : notes.trim(),
    };

    try {
      await addLogEntry(entryData);
      setStatusMessage('Entry saved successfully!');

      // --- Reset Form - Updated ---
      setSpo2('');
      setPulse('');
      setOxygenOn(false);
      setOxygenFlow('');
      setNotes('');
      setBorg(undefined); // *** RESET BORG ***
      setSelectedSymptoms([]); // *** RESET SYMPTOMS ***

      setTimeout(() => setStatusMessage(''), 3000);

    } catch (error) {
      console.error("Failed to save entry:", error);
      setStatusMessage('Error saving entry. Please try again.');
       setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  // --- Render the Form - Updated ---
  return (
    <div>
      <h1>Log Daily Vitals & Symptoms</h1> {/* Updated Title */}
      <form onSubmit={handleSubmit}>
        {/* --- Vitals Section (SpO2, Pulse - unchanged) --- */}
        <div className="form-group">
          <label htmlFor="spo2">SpO₂ (%)</label>
          <input type="number" id="spo2" value={spo2} onChange={(e) => setSpo2(e.target.value === '' ? '' : parseInt(e.target.value, 10))} min="50" max="100" step="1" placeholder="e.g., 92" />
        </div>
        <div className="form-group">
          <label htmlFor="pulse">Pulse (bpm)</label>
          <input type="number" id="pulse" value={pulse} onChange={(e) => setPulse(e.target.value === '' ? '' : parseInt(e.target.value, 10))} min="30" max="220" step="1" placeholder="e.g., 75" />
        </div>

        {/* --- Oxygen Section (unchanged) --- */}
        <div className="form-group">
          <label>Oxygen Use</label>
          <div className="radio-group">
            <label><input type="radio" name="oxygenUse" checked={!oxygenOn} onChange={() => { setOxygenOn(false); setOxygenFlow(''); }} /> Off Oxygen</label>
            <label><input type="radio" name="oxygenUse" checked={oxygenOn} onChange={() => setOxygenOn(true)} /> On Oxygen</label>
          </div>
          {oxygenOn && (
            <div style={{ marginTop: '10px' }}><label htmlFor="oxygenFlow">Flow Rate (L/min)</label><input type="number" id="oxygenFlow" value={oxygenFlow} onChange={(e) => setOxygenFlow(e.target.value === '' ? '' : parseFloat(e.target.value))} min="0.5" max="15" step="0.5" placeholder="e.g., 2" required /></div>
          )}
        </div>

        {/* *** ADD BORG SCALE SECTION *** */}
        <div className="form-group">
          <label>Rate Your Breathlessness (Borg Scale 0-10)</label>
          {/* Use the component, passing the current value and the function to update it */}
          <BorgScaleSelector selectedValue={borg} onSelect={setBorg} />
        </div>

        {/* *** ADD SYMPTOMS CHECKLIST SECTION *** */}
        <div className="form-group">
          <label>Symptoms Today (Select all that apply)</label>
          <div className="symptom-checklist"> {/* Optional: Add a class for specific styling */}
            {SYMPTOM_OPTIONS.map(symptom => (
              <div key={symptom} className="checkbox-item"> {/* Wrapper for layout */}
                <label>
                  <input
                    type="checkbox"
                    value={symptom}
                    // Check the box if the symptom is in the selectedSymptoms array
                    checked={selectedSymptoms.includes(symptom)}
                    // Call handleSymptomChange when the checkbox state changes
                    onChange={handleSymptomChange}
                  /> {symptom}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* --- Notes Section (unchanged) --- */}
        <div className="form-group">
          <label htmlFor="notes">Context / Notes (Optional)</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., After shower, feeling more tired today" rows={3}/>
        </div>

        {/* --- Submit Button (unchanged) --- */}
        <button type="submit" className="btn">Save Entry</button>

        {/* --- Status Message Display (unchanged) --- */}
        {statusMessage && (
          <p className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('Please enter') ? 'error' : 'success'}`}>
            {statusMessage}
          </p>
        )}
      </form>
    </div>
  );
}

export default LogEntryPage;