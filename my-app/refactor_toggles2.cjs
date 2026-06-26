const fs = require('fs');
const files = [
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminSettings.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminUserControlPanel.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminUsers.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminAttendance.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/user/UserTeam.jsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Replace the button style
  let modified = content.replace(/style=\{\{\s*width:\s*'44px',\s*height:\s*'24px',\s*borderRadius:\s*'12px',\s*(?:background|backgroundColor):\s*([^?]+)\s*\?\s*['"]#[A-Za-z0-9]+['"]\s*:\s*['"]#[A-Za-z0-9]+['"],\s*border:\s*'none',\s*position:\s*'relative',\s*cursor:\s*'pointer',\s*transition:\s*'background 0\.3s'\s*\}\}/g, 
  (match, p1) => {
    return `style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px', borderRadius: '14px', padding: 0, background: ${p1} ? 'var(--apple-accent-blue)' : 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}`;
  });

  // Replace the inner div
  modified = modified.replace(/<div style=\{\{\s*width:\s*'18px',\s*height:\s*'18px',\s*borderRadius:\s*'50%',\s*background:\s*'#fff',\s*position:\s*'absolute',\s*top:\s*'3px',\s*left:\s*([^?]+)\s*\?\s*'23px'\s*:\s*'3px',\s*transition:\s*'left 0\.3s'\s*\}\}\s*\/>/g,
  (match, p1) => {
    return `<div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: ${p1} ? '16px' : '0px', transition: 'left 150ms ease' }} />`;
  });

  if (content !== modified) {
    fs.writeFileSync(f, modified, 'utf8');
    console.log('Updated ' + f);
  }
});
