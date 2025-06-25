import React, { useState, useEffect } from 'react';
import { Modal, Button, RadioGroup } from 'react-materialize'; // RadioGroup might not be ideal, let's see.

function CheckInModal({ isOpen, onClose, gameInfo, onSaveCheckIn, onGoToTwinRinks }) {
  const [checkInStatus, setCheckInStatus] = useState(null); // 'in', 'out', or null

  useEffect(() => {
    if (isOpen) {
      // Reset status when modal opens or gameInfo changes
      // Determine initial status based on gameInfo.displayText if possible
      if (gameInfo && gameInfo.displayText) {
        if (gameInfo.displayText.toLowerCase().includes("checked in")) {
          setCheckInStatus('in');
        } else if (gameInfo.displayText.toLowerCase().includes("checked out")) {
          setCheckInStatus('out');
        } else {
          setCheckInStatus(null); // Default or unknown
        }
      } else {
        setCheckInStatus(null);
      }
    }
  }, [isOpen, gameInfo]);

  const handleSave = () => {
    if (onSaveCheckIn && gameInfo && gameInfo.nodeName && checkInStatus !== null) {
      onSaveCheckIn(gameInfo.nodeName, checkInStatus === 'in');
    } else {
      // Maybe show a message if status isn't selected
      console.warn("Check-in status not selected or gameInfo missing.");
    }
  };

  const handleTwinRinksClick = () => {
    if (onGoToTwinRinks) {
      onGoToTwinRinks();
    }
  };

  if (!isOpen || !gameInfo) {
    return null;
  }

  // Fallback for game description
  const gameDescription = gameInfo.gameDate ? `Game: ${gameInfo.gameDate}` : "Selected Game";


  return (
    <Modal
      actions={[
        <Button
            node="button"
            waves="green"
            className="green"
            onClick={handleTwinRinksClick}
            key="twinrinks-link"
            style={{ float: 'left' }} // To position it left as in Pug
        >
            Twin <i className="material-icons right">open_in_new</i>
        </Button>,
        <Button flat modal="close" node="button" waves="grey" className="red" onClick={onClose} key="cancel-checkin">Cancel</Button>,
        <Button node="button" waves="green" className="blue" onClick={handleSave} key="save-checkin">Save</Button>
      ]}
      header="Game Check In"
      open={isOpen}
      options={{
        onCloseStart: onClose,
      }}
      id="popCheckin"
    >
      <div className="modal-content">
        <p id="gameDescription">{gameDescription}</p>
        {/* Using standard radio buttons as react-materialize RadioGroup can be tricky with dynamic options */}
        <p>
          <label>
            <input
              type="radio"
              id="checkInRadio" // Changed id to avoid conflict with pug if it still exists
              name="gameCheckInStatus"
              value="in"
              checked={checkInStatus === 'in'}
              onChange={() => setCheckInStatus('in')}
            />
            <span>Check In</span>
          </label>
        </p>
        <p>
          <label>
            <input
              type="radio"
              id="checkOutRadio" // Changed id
              name="gameCheckInStatus"
              value="out"
              checked={checkInStatus === 'out'}
              onChange={() => setCheckInStatus('out')}
            />
            <span>Check Out</span>
          </label>
        </p>
      </div>
    </Modal>
  );
}

export default CheckInModal;
