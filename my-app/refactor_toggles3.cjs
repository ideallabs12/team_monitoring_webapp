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
  let modified = content.replace(/style=\{\{\s*width:\s*'44px',\s*height:\s*'24px',\s*borderRadius:\s*'12px',\s*(?:background|backgroundColor):\s*([^?]+)\s*\?\s*['"]#[A-Za-z0-9]+['"]\s*:\s*['"]#[A-Za-z0-9]+['"],\s*border:\s*'none',\s*position:\s*'relative',\s*cursor:\s*'pointer',\s*transition:\s*'background 0\.3s'(?:,\s*flexShrink:\s*0)?\s*\}\}/g, 
  (match, p1) => {
    return `style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px', borderRadius: '14px', padding: 0, background: ${p1} ? 'var(--apple-accent-blue)' : 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', transition: 'background 150ms ease', flexShrink: 0 }}`;
  });

  if (content !== modified) {
    fs.writeFileSync(f, modified, 'utf8');
    console.log('Updated ' + f);
  }
});
