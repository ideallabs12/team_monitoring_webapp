const fs = require('fs');
const files = [
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminSettings.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminUserControlPanel.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminUsers.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminAttendance.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/admin/AdminTeams.jsx',
  'c:/Users/ADMIN/Desktop/office_code/Ideallabs_automated/my-app/src/pages/user/UserTeam.jsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Regex to add minWidth and minHeight
  let modified = content.replace(/width:\s*'40px',\s*height:\s*'24px',/g, "width: '40px', minWidth: '40px', height: '24px', minHeight: '24px',");

  if (content !== modified) {
    fs.writeFileSync(f, modified, 'utf8');
    console.log('Updated ' + f);
  }
});
