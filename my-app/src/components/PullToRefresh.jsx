import React, { useState, useEffect } from 'react';

export default function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const pullDistance = Math.max(0, currentY - startY);
  const maxPull = 80; // maximum visual pull down distance
  const threshold = 60; // distance required to trigger refresh
  
  // Calculate visual translateY (add some resistance)
  const translateY = isPulling ? Math.min(pullDistance * 0.4, maxPull) : 0;
  
  const handleTouchStart = (e) => {
    // Only allow pull-to-refresh if we are at the very top of the page
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };
  
  const handleTouchMove = (e) => {
    if (!isPulling) return;
    
    const y = e.touches[0].clientY;
    setCurrentY(y);
  };
  
  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (translateY >= threshold) {
      // Trigger refresh
      window.location.reload(true);
    }
    
    setStartY(0);
    setCurrentY(0);
  };
  
  // Also attach passive: false native event listener for touchmove to prevent default scrolling
  useEffect(() => {
    const handleNativeTouchMove = (e) => {
      if (isPulling && currentY > startY && window.scrollY <= 0) {
        // Only prevent default if pulling down
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchmove', handleNativeTouchMove);
    };
  }, [isPulling, currentY, startY]);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100vh', width: '100%' }}
    >
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.9rem',
          fontWeight: 500,
          transform: `translateY(${translateY - 60}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.9))',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))'
        }}>
          {translateY >= threshold ? 'Release to refresh' : 'Pull to refresh...'}
        </div>
      </div>
      
      <div style={{ 
        transform: `translateY(${translateY}px)`, 
        transition: isPulling ? 'none' : 'transform 0.3s ease',
        minHeight: '100vh'
      }}>
        {children}
      </div>
    </div>
  );
}
