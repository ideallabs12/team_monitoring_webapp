import React, { useState, useEffect } from 'react';

export default function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const pullDistance = Math.max(0, currentY - startY);
  // Shorter pull threshold based on user feedback
  const threshold = 50; 
  
  // Subtle creative rubber-band effect instead of an indicator
  const translateY = isPulling ? Math.min(pullDistance * 0.25, 40) : 0;
  
  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };
  
  const handleTouchMove = (e) => {
    if (!isPulling) return;
    setCurrentY(e.touches[0].clientY);
  };
  
  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    // If they pulled past the short threshold, trigger refresh
    if (pullDistance >= threshold) {
      window.location.reload(true);
    }
    
    setStartY(0);
    setCurrentY(0);
  };
  
  useEffect(() => {
    const handleNativeTouchMove = (e) => {
      if (isPulling && currentY > startY && window.scrollY <= 0) {
        if (e.cancelable) e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleNativeTouchMove);
  }, [isPulling, currentY, startY]);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        minHeight: '100vh', 
        width: '100%',
        transform: `translateY(${translateY}px)`,
        transition: isPulling ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', // Smooth snap back
      }}
    >
      {children}
    </div>
  );
}
