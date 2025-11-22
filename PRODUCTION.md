# Friendle - Production Deployment

## 🎉 Your app is LIVE!

**Production URL:** https://friendle-7uodhx90w-milnershay-8540s-projects.vercel.app

## What's Been Deployed

✅ **All Features:**
- Multiplayer Wordle game with real-time sync
- English and Hebrew language support with RTL
- Room creation and joining
- Leaderboard with rankings
- Host controls (start, skip, reset, clear scores)
- Leave room functionality
- Custom word queue support

✅ **Security:**
- Firebase Realtime Database with security rules
- Admin panel password authentication (default: `friendle_admin_2024`)
- Input validation and sanitization
- Rate limiting (5 rooms/minute)
- Security headers (XSS protection, frame denial, etc.)

✅ **Bug Fixes:**
- Fixed guesses persistence on mobile devices (now stored as JSON strings)
- Fixed Firebase initialization
- Fixed mobile UI issues

## Admin Panel

Access the admin panel at: https://friendle-7uodhx90w-milnershay-8540s-projects.vercel.app/admin

**Default Password:** `friendle_admin_2024`

**To change the admin password:**
1. Go to Vercel Dashboard: https://vercel.com/milnershay-8540s-projects/friendle
2. Settings → Environment Variables
3. Add `NEXT_PUBLIC_ADMIN_PASSWORD` with your custom password
4. Redeploy: `vercel --prod`

## Custom Domain Setup

To add a custom domain (e.g., friendle.com):

1. Go to Vercel Dashboard
2. Project Settings → Domains
3. Add your domain
4. Update your DNS records as shown
5. Vercel will automatically provision SSL

## Monitoring & Management

### Vercel Dashboard
https://vercel.com/milnershay-8540s-projects/friendle

- View deployment history
- Check analytics
- Monitor errors
- Manage environment variables
- Configure domains

### Firebase Console
https://console.firebase.google.com/project/friendle-100

- Monitor database usage
- View realtime data
- Check security rules
- Set up budget alerts

## Deployment Commands

```bash
# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Pull environment variables
vercel env pull
```

## Environment Variables

All Firebase credentials are configured in Vercel:
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- ✅ NEXT_PUBLIC_FIREBASE_DATABASE_URL
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID

## Testing Checklist

Test these features on your production URL:

- [ ] Create a room from your iPhone
- [ ] Join the room from another device
- [ ] Play a game and verify guesses persist
- [ ] Test both English and Hebrew languages
- [ ] Test host controls (start game, skip word, reset)
- [ ] Test leave room functionality
- [ ] Test leaderboard rankings
- [ ] Test admin panel (password login)

## Firebase Database Rules

✅ Deployed and active

Rules validate:
- Room structure
- Player data
- Score ranges (≥ 0)
- Word lengths (4-6)
- Languages (en, he)
- Usernames (1-30 characters)

## Performance Expectations

**Firebase Free Tier:**
- 100 simultaneous connections
- 1 GB storage
- 10 GB/month bandwidth

**Vercel Hobby Tier:**
- Unlimited deployments
- 100 GB bandwidth
- Automatic HTTPS
- Global CDN

Should handle hundreds of concurrent players without issues.

## Next Steps (Optional)

1. **Set up monitoring:**
   - Add Vercel Analytics
   - Set up Firebase budget alerts
   - Add error tracking (Sentry)

2. **Custom domain:**
   - Purchase domain
   - Configure in Vercel
   - Update DNS

3. **Automated room cleanup:**
   - Set up Firebase Cloud Function
   - Schedule to run daily
   - Clean rooms older than 24 hours

4. **Enhanced security:**
   - Change admin password
   - Add Firebase App Check
   - Set up proper admin authentication

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Next.js Docs:** https://nextjs.org/docs

## Git Repository

Your code is linked to: https://github.com/milnershay/friendle-app

Any push to main branch will automatically deploy to Vercel.

---

**Built with ❤️ using Next.js, Firebase, and Vercel**

Last deployed: November 22, 2024
