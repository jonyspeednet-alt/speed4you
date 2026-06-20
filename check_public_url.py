import urllib.request
url = "https://speed4you.net/media/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season%2001%20(2021)%20%5BHindi%5D/Crashh%202021%20Hindi%20S01E01.mp4"
req = urllib.request.Request(url)
try:
    r = urllib.request.urlopen(req, timeout=10)
    print("Status:", r.status)
    print("Content-Type:", r.headers.get("Content-Type"))
    print("Content-Length:", r.headers.get("Content-Length"))
    print("Accept-Ranges:", r.headers.get("Accept-Ranges"))
    data = r.read(16)
    print("First bytes (hex):", data.hex())
except Exception as e:
    print("ERROR:", e)
