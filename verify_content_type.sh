#!/usr/bin/env python3
import urllib.request
url = "http://127.0.0.1/media/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season%2001%20(2021)%20%5BHindi%5D/Crashh%202021%20Hindi%20S01E01.mp4"
req = urllib.request.Request(url)
req.add_header("Host", "speed4you.net")
r = urllib.request.urlopen(req)
print("Status:", r.status)
print("Content-Type:", r.headers.get("Content-Type"))
print("Accept-Ranges:", r.headers.get("Accept-Ranges"))
