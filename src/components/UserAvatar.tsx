import React from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackText?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  alt = 'Avatar de usuario', 
  className = '', 
  fallbackText 
}) => {
  const defaultAvatar = '/images/logo1.png';
  
  return (
    <div className={`relative inline-block overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Si la imagen falla al cargar, mostramos el yacaré por defecto
            e.currentTarget.src = defaultAvatar;
          }}
        />
      ) : fallbackText ? (
        <span className="font-bold text-primary">{fallbackText}</span>
      ) : (
        <img 
          src={defaultAvatar} 
          alt="Avatar por defecto" 
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};
