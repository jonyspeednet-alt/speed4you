import bcrypt
hash = bcrypt.hashpw(b'***REMOVED***', bcrypt.gensalt()).decode()
print(hash)
