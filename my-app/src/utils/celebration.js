const EMOJI_URLS = [
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20with%20Wings.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Dollar%20Banknote.png'
];

export function fire3DRevenueCelebration() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '99999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const createCannon = (originX, originY, angleDeg, pCount) => {
    const particles = [];
    const rad = (angleDeg * Math.PI) / 180;
    
    for (let i = 0; i < pCount; i++) {
      const img = document.createElement('img');
      img.src = EMOJI_URLS[Math.floor(Math.random() * EMOJI_URLS.length)];
      
      const size = 30 + Math.random() * 35;
      img.style.width = `${size}px`;
      img.style.height = `${size}px`;
      img.style.position = 'absolute';
      img.style.left = '0';
      img.style.top = '0';
      
      const x = originX * window.innerWidth;
      const y = originY * window.innerHeight;
      
      // Starting velocity
      const velocity = 15 + Math.random() * 20;
      const vx = Math.cos(rad) * velocity + (Math.random() - 0.5) * 8;
      const vy = -Math.sin(rad) * velocity + (Math.random() - 0.5) * 8;
      
      const rotation = Math.random() * 360;
      const rotSpeed = (Math.random() - 0.5) * 12;
      
      particles.push({ el: img, x, y, vx, vy, rotation, rotSpeed, size });
      container.appendChild(img);
    }
    
    let animationFrame;
    const animate = () => {
      let active = false;
      particles.forEach(p => {
        p.vy += 0.4; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        
        if (p.y < window.innerHeight + 100) {
          active = true;
          p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
        } else {
           p.el.style.display = 'none'; // hide when off screen
        }
      });
      
      if (active) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(animationFrame);
      }
    };
    requestAnimationFrame(animate);
  };
  
  // Left cannon
  createCannon(0.1, 0.9, 65, 15);
  // Center cannon
  createCannon(0.5, 0.8, 90, 25);
  // Right cannon
  createCannon(0.9, 0.9, 115, 15);
  
  // Cleanup after animation finishes
  setTimeout(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }, 6000);
}
