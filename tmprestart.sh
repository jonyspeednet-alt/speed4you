sudo systemctl restart isp-portal.service 2>&1
sleep 3
sudo systemctl status isp-portal.service 2>&1 | head -10
