import React, { useEffect, useRef } from 'react';
import M from 'materialize-css';

function LeagueSelector({
  leagueList,
  selectedLeagueID, // The ID (index or unique identifier) of the selected league
  onLeagueChange,   // Handler function that takes the new league's 'value' attribute
  disabled = false
}) {
  const selectEl = useRef(null);

  useEffect(() => {
    if (selectEl.current) {
      M.FormSelect.init(selectEl.current);
    }
    // Cleanup
    return () => {
      if (selectEl.current) {
        const instance = M.FormSelect.getInstance(selectEl.current);
        if (instance) {
          instance.destroy();
        }
      }
    };
  }, [leagueList]); // Re-init if leagueList changes

  // Find the value of the currently selected league to set the defaultValue of the select
  // The selectedLeagueID from props should match one of the leagueItem.id
  const selectedLeagueValue = leagueList.find(l => l.id === selectedLeagueID)?.value || "";

  return (
    <form> {/* Form tag might not be strictly necessary if we handle change via JS */}
      <label>League Selection</label>
      <div className="input-field">
        <select
          id="leagueSelection"
          name="leagueSelection"
          ref={selectEl}
          value={selectedLeagueValue} // Controlled component via value
          onChange={(e) => onLeagueChange(e.target.value)}
          disabled={disabled}
        >
          {leagueList.map((leagueItem) => (
            <option
              key={leagueItem.id || leagueItem.value}
              value={leagueItem.value}
            >
              {leagueItem.name}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

export default LeagueSelector;
