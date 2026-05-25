import struct, sys
f=open("/var/www/html/Extra_Storage/portal-media-cache/movie-5195-s1-e1.mp4","rb")
i=0
while i<30:
    h=f.read(8)
    if len(h)<8: break
    size=struct.unpack(">I",h[:4])[0]
    typ=h[4:8].decode("latin-1")
    print(f"offset={f.tell()-8:08x} size={size:>10} type={typ}")
    if typ=="mdat" and size>100000:
        f.seek(size-8,1)
    else:
        f.seek(size-8,1)
    i+=1
f.close()
