import React from 'react';
import Select from 'react-select'; // Using react-select

// Helper to transform team list from server to react-select format
const transformTeamListForSelect = (serverTeamList) => {
  if (!serverTeamList || !Array.isArray(serverTeamList)) return [];
  return serverTeamList.map(team => ({
    value: team.teamName,
    label: team.teamName
  }));
};

function TeamSelector({
  serverTeamList,     // Original team list from the server
  selectedTeams,      // Current selected teams (already in react-select format {value, label})
  onTeamChange,
  disabled = false
}) {

  const options = transformTeamListForSelect(serverTeamList);

  // Custom styles for react-select to somewhat match Materialize
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      border: 'none',
      borderBottom: state.isFocused ? '2px solid #26a69a' : '1px solid #9e9e9e', // Materialize focus and normal color
      boxShadow: state.isFocused ? '0 1px 0 0 #26a69a' : 'none', // Materialize focus shadow
      borderRadius: 0,
      '&:hover': {
        borderBottom: state.isFocused ? '2px solid #26a69a' : '1px solid #9e9e9e',
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9e9e9e' // Materialize placeholder color
    }),
    // You might need to add more styles for dropdown menu, options etc.
  };

  return (
    <div> {/* div.input-field might not be directly applicable, react-select handles its own structure */}
      <label htmlFor="teamSelection">Team List</label> {/* react-select needs id on its input for this to work */}
      <Select
        id="teamSelection"
        isMulti
        name="lblTeamList" // Corresponds to backend expectation
        options={options}
        className="basic-multi-select" // You can add custom class for further styling
        classNamePrefix="select"
        value={selectedTeams}
        onChange={onTeamChange}
        placeholder="Select Teams..."
        isDisabled={disabled}
        styles={customStyles} // Apply custom styles
      />
    </div>
  );
}

export default TeamSelector;
