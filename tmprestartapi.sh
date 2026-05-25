pkill -f "src/index.js" 2>/dev/null
sleep 5
ps aux | grep "index.js" | grep -v grep | head -3
echo RESTARTED
