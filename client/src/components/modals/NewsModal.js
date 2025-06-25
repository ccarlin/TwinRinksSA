import React from 'react';
import { Modal, Button } from 'react-materialize';

function NewsModal({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      actions={[
        <Button flat modal="close" node="button" waves="green" onClick={onClose} key="close-news">Close</Button>
      ]}
      header="News"
      open={isOpen}
      options={{
        onCloseStart: onClose, // Called when modal is dismissed by clicking outside or ESC
        // preventScrolling: true, // default
        // dismissible: true, // default
      }}
      // Removed fixedFooter prop as it's not in the original Pug structure
      // Removed explicit trigger as it's controlled by `isOpen`
      // Adding an id for potential e2e testing or specific styling, though not strictly necessary
      id="popupNews"
    >
      <div className="modal-content"> {/* react-materialize Modal might render this structure already, but good for clarity */}
        {/* Using p tags as in Pug for content */}
        <p>New Look and feed!</p>
        <p>Page has been rewritten using more modern tools.</p>
        <p><strong>Now supports checking into multiple games without issues!</strong></p> {/* Pug 'strong' is like this */}
        <p>The page is now responsive and should work on most devices.</p>
        <p>Cleaned up several first time loading issues.</p>
      </div>
    </Modal>
  );
}

export default NewsModal;
