## 🗓️ Progress Log

### 📅 [2025-05-06]

#### ✅ What I Did
- Backtrack to initial UI commit in v1 branch and created new dev branch
- Remove most of unwanted code
- Added certificates with **mkcert**, but next dev still uses --experimental-https 
- Got camera stream working cross device

#### 🧠 Learnings / Insights
Most important thing I learnt was the certificates and secured http. Also how actually WebRTC framework works. Because cross device had to use a free google SRUN server to share ICE candidates.

#### 🛠️ TODO / Next Steps
- clean public folder and styles
- capturing pictures
- media transfer

---

### 📅 [2025-05-26]

#### ✅ What I Did
- Whole lot of updates
- Uploaded the site to netlify and railway 
- Organized the working directory for server and client
- Now no need to use certificates for https
- media transfer and image capture is implemented

#### 🧠 Learnings / Insights
Currently learning about SEO. Project is not yet ready to be deployed but I think it will be good to have SEO in your toolbelt when the time comes. I used railway for the firstime to host backend. It was extremely easy.

#### 🛠️ TODO / Next Steps
- Make viewer automatically open when camera is connected
- Optimize WebRTC
- Media recieved show duplicates
- Media transfer is slow (probably because data channel is set to *16KB*)
- Use oracle for backend because railway is a trial.

---
