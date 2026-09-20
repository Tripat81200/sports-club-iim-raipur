# 100% Free 24/7 Cloud Hosting Guide: Sports Club IIM Raipur

Follow these simple steps to put **Sports Club IIM Raipur** online 24/7 on the internet for free, so fans and students across campus can access it anytime from any phone without depending on your laptop.

---

## Option 1: Free 1-Click Hosting on Render.com (Recommended)

Render gives you free hosting for Node.js full-stack web applications with automatic SSL (`https://...`).

### Step 1: Push your code to a Free GitHub repository
1. Open [github.com](https://github.com) and create a free account (if you don't have one).
2. Click **New Repository** and name it `sports-club-iim-raipur` (set it to Public or Private).
3. In your project folder on your laptop, initialize git and push:
   ```bash
   git init
   git add .
   git commit -m "Sports Club IIM Raipur Release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sports-club-iim-raipur.git
   git push -u origin main
   ```

### Step 2: Connect to Render (Free)
1. Go to [render.com](https://render.com) and sign up with your GitHub account.
2. Click **New +** &rarr; select **Web Service**.
3. Choose your `sports-club-iim-raipur` repository from the list.
4. Render will automatically detect the settings from our `render.yaml` file:
   - **Name**: `sportsclub-iimraipur`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server/index.js`
   - **Plan**: Select **Free** ($0/month)
5. Click **Deploy Web Service**!

Within 2 minutes, Render will give you a permanent live public URL like:
👉 `https://sportsclub-iimraipur.onrender.com`

---

## Option 2: Instant 60-Second Temporary Public Link (Localtunnel / Cloudflare Tunnel)

If you want to test sharing a live link with someone on campus right this second without signing up anywhere:
Run this single command in PowerShell in your project directory:
```bash
npx localtunnel --port 3001
```
This will instantly generate a live public URL (like `https://sportsclub-iimr.loca.lt`) that anyone on the internet can open!

---

## 🔒 Securing Your Live Tournament

Once your site is live on the cloud:
1. **Share this link with students / WhatsApp groups**:
   `https://your-app-name.onrender.com/?mode=fan`
   *(In fan mode, the admin controls are hidden so students only see live scores, standings, and rosters)*.
2. **Accessing the Admin Portal as a Committee Coordinator**:
   Click the **Admin** button and enter your committee PIN (`iimr2026`). You can update the PIN anytime from the admin portal.

---

Regards,  
**Sports Club IIM Raipur**
