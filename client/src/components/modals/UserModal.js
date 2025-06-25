import React, { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Checkbox } from 'react-materialize';
import M from 'materialize-css'; // For M.updateTextFields

function UserModal({ isOpen, onClose, initialUserID, initialShowSubGames, onSave }) {
  const [currentUserID, setCurrentUserID] = useState(initialUserID || '');
  const [password, setPassword] = useState('');
  const [showSubs, setShowSubs] = useState(initialShowSubGames || false);

  useEffect(() => {
    if (isOpen) {
      setCurrentUserID(initialUserID || '');
      setShowSubs(initialShowSubGames || false);
      setPassword(''); // Clear password field each time modal opens
      // Need to make sure Materialize labels are updated if TextInput values are set programmatically
      setTimeout(() => {
        M.updateTextFields();
        // For checkboxes, react-materialize should handle the label state
      }, 0);
    }
  }, [isOpen, initialUserID, initialShowSubGames]);

  const handleSave = () => {
    if (onSave) {
      onSave({
        UserID: currentUserID,
        Password: password, // Only send password if entered
        ShowSubGames: showSubs,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      actions={[
        <Button flat modal="close" node="button" waves="grey" onClick={onClose} key="cancel-user">Cancel</Button>,
        <Button node="button" waves="green" className="blue" onClick={handleSave} key="save-user">Save</Button>
      ]}
      header="Account Info"
      open={isOpen}
      options={{
        onCloseStart: onClose,
      }}
      id="popUserID"
    >
      <div className="modal-content"> {/* Optional: react-materialize might render this structure */}
        <TextInput
          id="txtUserID"
          email // For basic validation, though type="email" is better
          label="Username"
          value={currentUserID}
          onChange={(e) => setCurrentUserID(e.target.value)}
        />
        <TextInput
          id="txtPassword"
          password
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password" // Help browser not to autofill saved password
        />
        <Checkbox
          id="txtShowSubGames"
          label="Show Sub Games"
          checked={showSubs}
          onChange={(e) => setShowSubs(e.target.checked)}
          value="showSubs" // value prop is often needed for Checkbox in react-materialize
        />
      </div>
    </Modal>
  );
}

export default UserModal;
