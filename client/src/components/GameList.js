import React from 'react';
import GameItem from './GameItem';

function GameList({ games, onOpenCheckInModal }) {
  if (!games || games.length === 0) {
    return <p className="center-align">No games scheduled or matching your criteria.</p>;
  }

  return (
    <ul>
      {games.map((game, index) => ( // Using index for key if game.NodeName is not unique enough or missing
        <GameItem
          key={game.NodeName || index} // Prefer a unique ID from the game object if available
          game={game}
          onOpenCheckInModal={onOpenCheckInModal}
        />
      ))}
    </ul>
  );
}

export default GameList;
