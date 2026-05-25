cd /home/speed4you/projects/_work/speed4you/speed4you/frontend
npm run build 2>&1 | tail -15
echo BUILD_EXIT:$?
ls -la dist/ 2>/dev/null | head -5
