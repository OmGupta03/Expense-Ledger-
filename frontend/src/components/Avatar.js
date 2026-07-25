import React from 'react';
import UIAvatar from './ui/Avatar';

function Avatar({ name = 'Anonymous', size = 36, src = null }) {
  return <UIAvatar name={name} size={size} src={src} />;
}

export default Avatar;
