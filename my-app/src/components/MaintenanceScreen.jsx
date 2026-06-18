import React, { useEffect, useRef } from 'react';
import { Settings, Server, Shield, Activity } from 'lucide-react';

export default function MaintenanceScreen() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    
    // Resize canvas
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Mouse interaction
    let mouse = { x: null, y: null, radius: 150 };
    const handleMouseMove = (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseout', handleMouseLeave);

    // Particle class
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.5 + 0.5;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
        this.color = `hsla(${Math.random() * 60 + 200}, 100%, 70%, ${Math.random() * 0.5 + 0.3})`;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        if (mouse.x != null && mouse.y != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          let forceDirectionX = dx / distance;
          let forceDirectionY = dy / distance;
          let maxDistance = mouse.radius;
          let force = (maxDistance - distance) / maxDistance;
          let directionX = forceDirectionX * force * this.density;
          let directionY = forceDirectionY * force * this.density;

          if (distance < mouse.radius) {
            this.x -= directionX;
            this.y -= directionY;
          } else {
            if (this.x !== this.baseX) {
              let dx = this.x - this.baseX;
              this.x -= dx / 10;
            }
            if (this.y !== this.baseY) {
              let dy = this.y - this.baseY;
              this.y -= dy / 10;
            }
          }
        } else {
          // Return to base slowly if no mouse
          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx / 20;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy / 20;
          }
        }
        
        // Add tiny random float
        this.x += (Math.random() - 0.5) * 0.5;
        this.y += (Math.random() - 0.5) * 0.5;
        
        this.draw();
      }
    }

    // Init particles
    const init = () => {
      particles = [];
      const numberOfParticles = (canvas.width * canvas.height) / 6000;
      for (let i = 0; i < numberOfParticles; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        particles.push(new Particle(x, y));
      }
    };
    init();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      
      // Draw lines between close particles
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let dx = particles[a].x - particles[b].x;
          let dy = particles[a].y - particles[b].y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 60) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.1 - distance/600})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #1e1e2f 0%, #0b0b12 100%)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* Interactive Particle Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
      />

      {/* Glowing Orbs Behind */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 113, 227, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        animation: 'floatOrb 10s ease-in-out infinite alternate'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(48, 213, 200, 0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0,
        animation: 'floatOrb2 12s ease-in-out infinite alternate-reverse'
      }} />

      <style>
        {`
          @keyframes floatOrb {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(50px, 50px) scale(1.2); }
          }
          @keyframes floatOrb2 {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(-60px, -40px) scale(1.1); }
          }
          @keyframes pulseGear {
            0% { transform: rotate(0deg) scale(1); opacity: 0.8; }
            50% { transform: rotate(180deg) scale(1.1); opacity: 1; text-shadow: 0 0 20px rgba(0, 113, 227, 0.8); }
            100% { transform: rotate(360deg) scale(1); opacity: 0.8; }
          }
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}
      </style>

      {/* Main Glassmorphic Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(20, 20, 25, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '60px 40px',
        maxWidth: '600px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>
        
        {/* Subtle Scanline effect over the card */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.02) 51%, transparent 51%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          opacity: 0.5,
          zIndex: 1
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'rgba(0, 113, 227, 0.1)', 
            border: '1px solid rgba(0, 113, 227, 0.3)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 0 30px rgba(0, 113, 227, 0.2)'
          }}>
            <Settings 
              size={48} 
              style={{ color: '#38bdf8', animation: 'pulseGear 8s linear infinite' }} 
            />
          </div>

          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            letterSpacing: '-0.03em', 
            marginBottom: '16px',
            background: 'linear-gradient(to right, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            System Optimization
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#94a3b8', 
            lineHeight: '1.6', 
            marginBottom: '40px',
            fontWeight: '400'
          }}>
            We are currently upgrading the platform infrastructure to enhance performance, security, and reliability. 
            <br/><br/>
            Please interact with the particles while you wait. We'll be back online momentarily.
          </p>

          {/* Diagnostic Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '32px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Server size={20} style={{ color: '#4ade80' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core API</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>Upgrading</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} style={{ color: '#f59e0b' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Security</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>Enhancing</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} style={{ color: '#a78bfa' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Database</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '500' }}>Optimizing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
