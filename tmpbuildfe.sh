cd /home/speed4you/projects/_work/speed4you/speed4you/frontend
ls src/services/adminService.js src/app/router.jsx src/layouts/AdminLayout.jsx src/pages/admin/ 2>/dev/null
echo SEP
npm run build 2>&1 | tail -10
echo SEP
ls dist/ 2>/dev/null | head -10
