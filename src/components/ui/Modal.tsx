import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  large?: boolean;
}

export function Modal({ title, onClose, children, large }: ModalProps) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${large ? ' modal-lg' : ''}`}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="iconbtn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
