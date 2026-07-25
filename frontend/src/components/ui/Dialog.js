import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function Dialog({
  isOpen,
  onClose,
  title = 'Are you sure?',
  message,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'primary' | 'danger'
  loading = false,
  ...props
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm" {...props}>
      <div className="flex flex-col gap-4 text-left">
        {message && (
          <p className="text-xs text-text-secondary leading-relaxed font-semibold">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            loading={loading}
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
