kill 39086 2>/dev/null
sleep 5
ps aux | grep "src/index.js" | grep -v grep | head -3
echo DONE
