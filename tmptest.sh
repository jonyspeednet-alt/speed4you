echo hello world
pkill -f "src/index.js"
echo killed
sleep 5
ps aux | grep "index.js" | grep -v grep | head -3
echo done
