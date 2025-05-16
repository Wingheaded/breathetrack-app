// src/components/BorgScaleSelector.tsx
import React from 'react';
import './BorgScaleSelector.css'; // We'll create this CSS file next

// Define the levels and their labels for the Borg Scale
const BORG_LEVELS = [
  { value: 0, label: 'Nothing at all' },
  { value: 1, label: 'Very slight' },
  { value: 2, label: 'Slight' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Somewhat severe' },
  { value: 5, label: 'Severe' },
  { value: 6, label: 'Severe+' }, // Adjusted label for clarity if needed
  { value: 7, label: 'Very severe' },
  { value: 8, label: 'Very severe+' }, // Adjusted label for clarity if needed
  { value: 9, label: 'Almost maximum' },
  { value: 10, label: 'Maximum' },
];

// Define the types for the component's props (inputs)
interface BorgScaleSelectorProps {
    // selectedValue is the currently chosen number (or undefined if none)
    selectedValue?: number;
    // onSelect is a function passed from the parent to update the selection
    onSelect: (value: number) => void;
}

// Define the functional component
const BorgScaleSelector: React.FC<BorgScaleSelectorProps> = ({ selectedValue, onSelect }) => {
  return (
    <div className="borg-scale-container">
      {/* Map over the BORG_LEVELS array to create a button for each level */}
      {BORG_LEVELS.map((level) => (
        <button
          key={level.value} // Unique key for React's list rendering
          type="button"     // IMPORTANT: Prevent this button from submitting the form
          // Dynamically set CSS class: 'selected' if this button's value matches the selectedValue
          className={`borg-level-button ${selectedValue === level.value ? 'selected' : ''}`}
          // When clicked, call the onSelect function passed from the parent with this button's value
          onClick={() => onSelect(level.value)}
        >
          {/* Display the number value */}
          <span className="borg-value">{level.value}</span>
          {/* Display the text label */}
          <span className="borg-label">{level.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BorgScaleSelector; // Make the component available for import