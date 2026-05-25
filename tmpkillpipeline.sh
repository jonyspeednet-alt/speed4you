kill $(pgrep -f pipeline-runner) 2>/dev/null
sleep 1
pgrep -f pipeline-runner && echo still running || echo pipeline killed