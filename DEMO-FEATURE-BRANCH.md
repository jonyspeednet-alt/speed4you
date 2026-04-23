# Demo Feature Branch Example

এই branch টি দেখাতে যে Git কিভাবে কাজ করে:

✅ **Original main branch safe**
✅ নতুন feature test করা যায়
✅ সমস্যা হলে main এ ফিরে যাওয়া সহজ

**Test করুন:**
```
git status
git branch -a
```

**Merge করতে:**
```
git checkout main
git merge demo-feature-branch
```

**Delete করতে (যদি not needed):**
```
git branch -D demo-feature-branch
```

