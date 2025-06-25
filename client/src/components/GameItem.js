import React from 'react';

function GameItem({ game, onOpenCheckInModal }) {
  // Default to 'Unknown' if status is not providing a valid image name
  const

statusImage = `/img/${game.status || 'Unknown'}.png`;
  const altText = game.displayText || 'Status Unknown';

  // The onclick in pug was: onclick="checkInPop('" + game.NodeName + "','" + game.displayText +"','" + game.gameDate + "')"
  // We'll pass an object with this info to the modal opener.
  const handleCheckInClick = () => {
    if (onOpenCheckInModal) {
      onOpenCheckInModal({
        nodeName: game.NodeName,
        displayText: game.displayText,
        gameDate: game.gameDate // Or a more structured game description
      });
    }
  };

  // Calendar link construction
  const calendarLink = `/twinrinks/CalendarItem.ashx?gameDate=${encodeURIComponent(game.gameDate)}&home=${encodeURIComponent(game.home)}&away=${encodeURIComponent(game.away)}&rink=${encodeURIComponent(game.rink)}`;

  return (
    <li className="card">
      <div className="card-content row" style={{paddingBottom: '0px'}}> {/* Removed bottom padding from card-content to match pug closer */}
        <span className="card-title">Date: {game.gameDate}</span>
        <table style={{ border: 'none', width: '100%' }}>
          <tbody> {/* Added tbody for valid HTML structure */}
            <tr>
              <td style={{ padding: '5px' }}>
                <p>
                  <strong>Home Team: </strong>
                  {game.home}
                </p>
                <p>
                  <strong>Away Team: </strong>
                  {game.away}
                </p>
                <p>
                  <strong>Rink: </strong>
                  {game.rink}
                </p>
                {/* Conditional rendering for SubInfo based on Pug's p(class=game.teamOrSub) */}
                {game.SubInfo && (
                  <p className={game.teamOrSub === "Sub" ? "red-text" : ""}> {/* Example class, adjust as needed */}
                    <strong>Sub Info: </strong>
                    {game.SubInfo}
                  </p>
                )}
                <a href={calendarLink} target="_self" className="blue-text text-darken-2">
                  Add to calendar
                </a>
              </td>
              <td align="right" valign="middle" style={{ textAlign: 'right', padding: '5px' }}>
                <img
                  id={game.NodeName}
                  className="responsive-img status-image halfway-fab" // halfway-fab might need specific parent styling
                  src={statusImage}
                  alt={altText}
                  title={altText}
                  onClick={handleCheckInClick}
                  style={{cursor: 'pointer', maxHeight: '100px'}} // From inline pug style
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </li>
  );
}

export default GameItem;
