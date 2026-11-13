# Video backend setup (Firebase)

Your works section reads its videos from Firebase. You add, reorder and delete videos from `admin.html`, no code needed. Until you finish this setup, the site shows the starter videos in `videos.json`.

## One-time setup (about 10 minutes)

1. Go to https://console.firebase.google.com and create a project (free Spark plan is enough). Skip Google Analytics.
2. In the project, open Build > Firestore Database > Create database. Choose production mode and a region close to you.
3. Open Build > Authentication > Get started > Email/Password > enable it. Then open the Users tab and add yourself as a user with an email and password. This is your admin login.
4. Open Firestore > Rules. Replace everything with the contents of `firestore.rules`, and change `YOUR_ADMIN_EMAIL_HERE` to the exact email you used in step 3. Click Publish.
5. Open Project settings (gear icon) > General > Your apps > Web (`</>`) > register an app. Copy the `firebaseConfig` values into `firebase-config.js`.
6. Open Authentication > Settings > Authorized domains and add the domain your site runs on (for example `yourname.github.io`). `localhost` is already there.
7. Commit and push. Open `yoursite.com/admin.html`, sign in, and click "Load starter videos" to copy the six current videos into Firebase.

## Daily use

Open `/admin.html`, sign in, paste a YouTube, Vimeo or direct `.mp4` link, add a title, and save. Use Up and Down to change the order. The site updates straight away, no redeploy.

## Notes

- The config values in `firebase-config.js` are not secrets. The Firestore rules are what stop other people from editing your videos, so don't skip step 4.
- The admin page is not linked anywhere on the site and is marked noindex.
- Vimeo videos must allow embedding on your domain (Vimeo > video settings > Privacy).
- To test locally, serve the folder instead of opening the file directly: `python3 -m http.server 8000`, then visit http://localhost:8000.
