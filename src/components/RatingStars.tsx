import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  totalStars?: number;
  onRatingChange?: (newRating: number) => void;
  size?: number;
  className?: string;
  editable?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  totalStars = 5,
  onRatingChange,
  size = 4,
  className = '',
  editable = false,
}) => {
  const handleStarClick = (index: number) => {
    if (editable && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className={`flex ${className}`}>
      {[...Array(totalStars)].map((_, i) => (
        <Star
          key={i}
          className={`w-${size} h-${size} ${i < rating ? 'text-yellow-400 fill-current' : 'text-slate-200'}
            ${editable ? 'cursor-pointer hover:text-yellow-500 transition-colors' : ''}
          `}
          onClick={() => handleStarClick(i)}
        />
      ))}
    </div>
  );
};

export default RatingStars;
