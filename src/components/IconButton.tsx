import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
  children?: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  tooltip,
  active = false,
  children
}) => {
  return (
    <button
      className={`icon-button ${active ? 'active' : ''}`}
      onClick={onClick}
      data-tooltip={tooltip}
    >
      {icon}
      {children}
    </button>
  );
}; 