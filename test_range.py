import urllib.request
url = "https://speed4you.net/media/TV_Series/TV_Web_Series-0-9_A-E/Crashh/Season%2001%20(2021)%20%5BHindi%5D/Crashh%202021%20Hindi%20S01E01.mp4"

# Test 1: Full request for first 2KB
req = urllib.request.Request(url)
req.add_header("Range", "bytes=0-2047")
r = urllib.request.urlopen(req, timeout=10)
print("=== Range 0-2047 ===")
print("Status:", r.status)
print("Content-Range:", r.headers.get("Content-Range"))
print("Content-Length:", r.headers.get("Content-Length"))
body = r.read()
print("Bytes received:", len(body))
print()

# Test 2: Range starting at 1MB
req2 = urllib.request.Request(url)
req2.add_header("Range", "bytes=1048576-1049575")
r2 = urllib.request.urlopen(req2, timeout=10)
print("=== Range 1048576-1049575 ===")
print("Status:", r2.status)
print("Content-Range:", r2.headers.get("Content-Range"))
print("Content-Length:", r2.headers.get("Content-Length"))
body2 = r2.read()
print("Bytes received:", len(body2))
print()

# Test 3: Check full Content-Type and headers
req3 = urllib.request.Request(url)
req3.add_header("Range", "bytes=0-1")
r3 = urllib.request.urlopen(req3, timeout=10)
print("=== General headers ===")
print("Status:", r3.status)
print("Accept-Ranges:", r3.headers.get("Accept-Ranges"))
print("Content-Type:", r3.headers.get("Content-Type"))
