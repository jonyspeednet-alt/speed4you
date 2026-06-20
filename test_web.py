import urllib.request
url = "https://speed4you.net/media/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season%2001%20(2021)%20%5BHindi%5D/Crashh%202021%20Hindi%20S01E01.mp4"

req = urllib.request.Request(url)
req.add_header("Range", "bytes=0-2047")
r = urllib.request.urlopen(req, timeout=10)
print("Status:", r.status)
print("Content-Type:", r.headers.get("Content-Type"))
print("Content-Range:", r.headers.get("Content-Range"))
body = r.read()
print("First bytes:", body[:16].hex())
print("Bytes received:", len(body))

# Also verify API still returns MP4 paths
api_req = urllib.request.Request("https://speed4you.net/portal-api/series/20790")
api_r = urllib.request.urlopen(api_req, timeout=10)
import json
data = json.loads(api_r.read())
ep1_videoUrl = data['data']['seasons'][0]['episodes'][0]['videoUrl']
print("\nAPI episode videoUrl:", ep1_videoUrl)
print("Ends with .mp4?", ep1_videoUrl.endswith('.mp4'))
