import React from 'react';

// Helper to get team names string for calendar link
const getTeamNamesForCalendar = (teams) => {
  if (!teams || teams.length === 0) return "All Teams"; // Default or handle as needed
  return teams.map(t => t.value).join(',');
};

function Controls({
  onOpenNewsModal,
  onOpenUserModal,
  onOpenClearCookiesModal,
  selectedLeague, // The league *label* (e.g., "leisure")
  selectedTeams   // Array of team objects from react-select, e.g. [{value: "TeamA", label: "TeamA"}]
}) {

  const teamNamesString = getTeamNamesForCalendar(selectedTeams);
  const showCalendarButton = selectedLeague && teamNamesString && teamNamesString !== "All Teams";
  // The calendar link in Pug uses `team` which seems to be the selected team string.
  // If multiple teams are selected, the Pug `#{team}` would display that string.
  // For React, we can display the count or a generic "Team(s) Calendar".
  // Let's use the first selected team name for the button if available, or a generic label.
  const calendarButtonLabel = selectedTeams.length > 0 ? selectedTeams[0].label : "Calendar";


  return (
    <div className="row">
      <button
        className="waves-effect waves-light btn-small grey"
        onClick={onOpenNewsModal}
        style={{marginRight: '5px'}} // Added margin for spacing like in original
      >
        News <i className="material-icons right">info</i>
      </button>
      <button
        className="waves-effect waves-light btn-small blue"
        onClick={onOpenUserModal}
        style={{marginRight: '5px'}}
      >
        Setup <i className="material-icons right">settings</i>
      </button>
      <button
        className="waves-effect waves-light btn-small red"
        onClick={onOpenClearCookiesModal}
        style={{marginRight: '5px'}}
      >
        Clear <i className="material-icons right">delete</i>
      </button>

      {showCalendarButton && (
        <a
          href={`/twinrinks/CalendarItem.ashx?league=${selectedLeague}&team=${teamNamesString}`}
          target="_self" // was _self in Pug, can also be _blank
          className="waves-effect waves-light btn-small green"
        >
          {calendarButtonLabel} <i className="material-icons right">event</i>
        </a>
      )}
    </div>
  );
}

export default Controls;
