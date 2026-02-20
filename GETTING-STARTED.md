# 🚀 Getting Started - Dev Mode Login (60 seconds)

## Step 1️⃣ (15 seconds)

```bash
npm run dev
```

**Expected Output:**
```
  VITE v7.3.1 ready in 1036 ms
  ➜  Local:   http://localhost:8080/
  ➜  Network: http://10.0.0.213:8080/
```

✅ Dev server is running!

---

## Step 2️⃣ (5 seconds)

Open your browser and visit:

```
http://localhost:8080/?devMode=true
```

Or copy-paste this if easier:
```
localhost:8080/?devMode=true
```

**Expected Behavior:**
- Page loads
- You see: "🔐 Dev Mode: Attempting auto-login..." in console
- Page redirects to `/home` or `/onboarding`
- URL auto-cleans to: `http://localhost:8080/`

✅ You're logged in!

---

## Step 3️⃣ (40 seconds)

**Test some features:**

- 🔍 Click "Analyze a Product"
- 📊 Enter a product name
- 🧪 Click "Analyze"
- See the EPIQ score and ingredient analysis
- ✅ Feature works!

---

## 🎉 Done!

You've successfully:
1. ✅ Verified database is `mzprefkjpyavwbtkebqj`
2. ✅ Set up dev mode auto-login
3. ✅ Tested it works
4. ✅ Can now test features instantly

---

## 🔄 Next Time (Even Faster)

Just keep using this URL:
```
http://localhost:8080/?devMode=true
```

Each time you want to test, just:
1. Open the URL in browser (bookmark it!)
2. You're instantly logged in
3. Start testing immediately

---

## 🧑‍💻 If You Want to Try Different Users

Use this format:
```
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com
```

Change the email to test different users!

---

## 📚 Need More Info?

- Quick reference? → `QUICK-REFERENCE.md`
- Real examples? → `DEV-MODE-EXAMPLES.md`  
- Full guide? → `DEV-MODE-LOGIN-GUIDE.md`
- All details? → `SETUP-COMPLETE.md`

---

## 🆘 Troubleshooting (30 seconds)

**"Dev mode not working?"**

Check:
1. Are you using `npm run dev`? (not `npm run preview`)
2. Is the URL format correct? (`http://localhost:8080/?devMode=true`)
3. Open browser console (F12) → Console tab
4. Look for error messages
5. If stuck, check `DEV-MODE-LOGIN-GUIDE.md` troubleshooting section

---

**That's it! You're ready to test SkinLytix! 🎊**
