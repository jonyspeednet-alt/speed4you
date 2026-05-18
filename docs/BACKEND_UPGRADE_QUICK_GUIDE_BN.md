# ব্যাকএন্ড আপগ্রেড গাইড - কুইক রেফারেন্স

## 🚀 দ্রুত শুরু করুন

### Option 1: Windows ব্যবহার করলে
```bash
backend-upgrade.bat
```

### Option 2: PowerShell ব্যবহার করলে
```powershell
.\backend-upgrade.ps1
```

### Option 3: Linux/Mac ব্যবহার করলে
```bash
chmod +x backend-upgrade.sh
./backend-upgrade.sh
```

### Option 4: ম্যানুয়াল আপগ্রেড
```bash
cd backend

# ব্যাকআপ তৈরি করুন
cp package-lock.json package-lock.json.backup

# ডিপেন্ডেন্সি আপডেট করুন
npm install express@^4.21.2 \
  dotenv@^17.4.2 \
  helmet@^8.1.0 \
  joi@^18.1.2 \
  jsonwebtoken@^9.0.3 \
  --save

# টেস্ট চালান
npm test

# সার্ভার শুরু করুন
npm run dev
```

---

## 📋 আপগ্রেড করা হবে এমন প্যাকেজ

| প্যাকেজ | বর্তমান | নতুন | উদ্দেশ্য |
|---------|--------|------|---------|
| express | 4.18.2 | 4.21.2 | নতুন ফিচার এবং বাগ ফিক্স |
| dotenv | 16.3.1 | 17.4.2 | পরিবেশ ভেরিয়েবল ম্যানেজমেন্ট |
| helmet | 7.1.0 | 8.1.0 | নিরাপত্তা হেডার |
| joi | 17.11.0 | 18.1.2 | ডেটা ভ্যালিডেশন |
| jsonwebtoken | 9.0.2 | 9.0.3 | অথেন্টিকেশন টোকেন |

---

## ✅ আপগ্রেডের পরে যাচাই করুন

```bash
# সার্ভার চালু করুন
npm run dev

# নতুন টার্মিনালে, এপিআই টেস্ট করুন
curl http://localhost:3001/api/health

# সব টেস্ট চালান
npm test

# নিরাপত্তা চেক করুন
npm audit
```

---

## 🔄 সমস্যা হলে রোলব্যাক করুন

```bash
cd backend

# অপশন 1: ব্যাকআপ থেকে রিস্টোর করুন
cp package-lock.json.backup package-lock.json
rm -rf node_modules
npm install

# অপশন 2: গিট ব্যবহার করে ফিরে যান
git checkout backend/package-lock.json
rm -rf backend/node_modules
cd backend && npm install
```

---

## 📊 বর্তমান অবস্থা

- **সার্ভার**: Express.js 4.18.2
- **ডাটাবেস**: PostgreSQL
- **Node.js**: 22.x (সর্বশেষ)
- **পোর্ট**: 3001 (ডিফল্ট)

---

## 🎯 আপগ্রেডের সুবিধা

✅ নতুন নিরাপত্তা প্যাচ  
✅ পারফরম্যান্স উন্নতি  
✅ বাগ ফিক্স  
✅ নতুন ফিচার সাপোর্ট  
✅ বেটার এরর হ্যান্ডলিং  

---

## 📞 যদি সমস্যা হয়

1. **পোর্ট ব্যবহার করা আছে?**
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   ```

2. **মডিউল খুঁজে পাচ্ছে না?**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **ডাটাবেস কানেকশন সমস্যা?**
   ```bash
   # .env ফাইল চেক করুন
   cat .env
   
   # ডাটাবেস সংযোগ টেস্ট করুন
   psql -h localhost -U portal_user -d portal_db
   ```

---

## 📝 গুরুত্বপূর্ণ নোট

- আপগ্রেড করার আগে **গিট ব্র্যাঞ্চ** তৈরি করুন
- নতুন ব্র্যাঞ্চে কাজ করুন (উৎপাদন ব্র্যাঞ্চে নয়)
- প্রথমে লোকালে পরীক্ষা করুন
- তারপর স্টেজিং সার্ভারে টেস্ট করুন
- শেষে উৎপাদনে ডিপ্লয় করুন

---

**আপডেট**: এপ্রিল ২৯, ২০২৬
