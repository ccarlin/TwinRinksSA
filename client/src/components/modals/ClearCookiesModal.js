import React, { useState, useEffect } from 'react';
import { Modal, Button, Checkbox } from 'react-materialize';

function ClearCookiesModal({ isOpen, onClose, onClear }) {
  const [resetLeagueInfo, setResetLeagueInfo] = useState(false);
  const [resetUserInfo, setResetUserInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset checkboxes when modal opens
      setResetLeagueInfo(false);
      setResetUserInfo(false);
    }
  }, [isOpen]);

  const handleClear = () => {
    if (onClear) {
      onClear({
        ResetLeague: resetLeagueInfo,
        ResetUser: resetUserInfo,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      actions={[
        <Button flat modal="close" node="button" waves="grey" onClick={onClose} key="cancel-clear">Cancel</Button>,
        <Button node="button" waves="green" className="red" onClick={handleClear} key="confirm-clear">Clear Settings</Button>
      ]}
      header="Reset your Settings"
      open={isOpen}
      options={{
        onCloseStart: onClose,
      }}
      id="popClearCookies"
    >
      <div className="modal-content">
        <p>This option is in case you are having issues with the page.</p>
        <p>It will clear specified settings and reset to the default.</p>
        <p>
          <Checkbox
            id="txtResetCookies" // Matches Pug
            label="Reset League and Team Info"
            checked={resetLeagueInfo}
            onChange={(e) => setResetLeagueInfo(e.target.checked)}
            value="resetLeague"
          />
        </p>
        <p>
          <Checkbox
            id="txtResetUser" // Matches Pug
            label="Reset User Info"
            checked={resetUserInfo}
            onChange={(e) => setResetUserInfo(e.target.checked)}
            value="resetUser"
          />
        </p>
        <p>Are you sure you want to do this?</p>
      </div>
    </Modal>
  );
}

export default ClearCookiesModal;
