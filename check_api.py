import urllib.request, json
r = urllib.request.urlopen("https://speed4you.net/portal-api/series/20790", timeout=10)
d = json.loads(r.read())
e = d["seasons"][0]["episodes"][0]
print("Episode keys:", list(e.keys()))
print("videoUrl:", e.get("videoUrl"))
print("Ends with .mp4:", e.get("videoUrl", "").endswith(".mp4"))
