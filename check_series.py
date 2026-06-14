import sys, json
data = json.load(sys.stdin)
items = data.get("items", data.get("data", data.get("results", [])))
found = [i for i in items if "mother" in i.get("title","").lower()]
if found:
  for i in found:
    print(f"  ID: {i['id']} - {i['title']} ({i.get('year','')})  Seasons: {len(i.get('seasons',[]))}  Status: {i.get('status','?')}  Published: {i.get('published','?')}")
else:
  print("NOT FOUND in results - checking all items...")
  for i in items[:5]:
    print(f"  Sample: {i.get('id')} - {i.get('title','?')} ({i.get('type','?')})")
  print(f"  Total items returned: {len(items)}")
