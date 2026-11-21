import type { Lang } from './i18n';

export const PRIVACY_POLICY_EN = `Personal Finance Manager — Privacy Policy
Effective date: 21 November 2026

1. Who we are
This app is developed by Roni Riman. It is a local-first personal finance tool. There is no advertising, analytics, tracking server or backend database by default.

2. What data the app handles
• Finance data: accounts, transactions, categories, budgets, notes, reminders and settings. This data is stored on your device in IndexedDB. It is never uploaded automatically.
• Profile: the name and photo you optionally enter during setup are stored only on your device.
• Google Account: if you choose to sign in, we receive your Google name, email address and profile picture from Google. These are used only to identify your backup account inside the app and are stored on your device.
• Drive backups: if you explicitly tap “Backup now”, an encrypted backup file is written to the private appDataFolder of your own Google Drive. The encryption passphrase is never stored by the app or by us.

3. Permissions used
• Internet: only for Google sign-in and explicit Google Drive backup/restore actions.
• Notifications: only to show reminders you create. You can turn them off at any time in Settings.

4. Sharing
We do not sell, share or transmit your personal or financial data to third parties. Google is used only when you explicitly choose Google sign-in or Drive backup. Your data is not used for advertising.

5. Retention and deletion
Finance data remains on your device until you delete it or reset the app. Google account details and Drive backups can be removed from Settings → Privacy & Account → “Delete Google account data”. You can also use “Reset application” to erase all local data. Uninstalling the app removes local data stored on that device.

6. Security
Backups are encrypted with AES-256-GCM before upload. Tokens are kept in memory only and are not written to local storage. No client secret is stored in this app.

7. Children
This app is not directed to children under 13. We do not knowingly collect data from children.

8. Changes
If this policy changes, the updated version will be shown inside the app and on the published privacy policy page.

9. Contact
Questions or requests: WhatsApp https://wa.me/8801326552304 — Roni Riman.`;

export const PRIVACY_POLICY_BN = `পার্সনাল ফিন্যান্স ম্যানেজার — গোপনীয়তা নীতি
কার্যকর তারিখ: ২১ নভেম্বর ২০২৬

১. আমরা কে
এই অ্যাপটি রনি রিমান তৈরি করেছেন। এটি local-first ফিন্যান্স টুল। ডিফল্টভাবে কোনো বিজ্ঞাপন, অ্যানালিটিক্স, ট্র্যাকিং সার্ভার বা ব্যাকএন্ড ডাটাবেস নেই।

২. অ্যাপ কোন ডেটা ব্যবহার করে
• ফিন্যান্স ডেটা: অ্যাকাউন্ট, লেনদেন, ক্যাটাগরি, বাজেট, নোট, রিমাইন্ডার ও সেটিংস — সব আপনার ডিভাইসের IndexedDB-তে থাকে। স্বয়ংক্রিয়ভাবে কোথাও আপলোড হয় না।
• প্রোফাইল: আপনি ঐচ্ছিকভাবে যে নাম ও ছবি দেন, তা শুধু এই ডিভাইসে থাকে।
• Google অ্যাকাউন্ট: আপনি সাইন ইন করলে Google থেকে নাম, ইমেইল ও প্রোফাইল ছবি নেওয়া হয়। শুধু অ্যাপের ভেতরে ব্যাকআপ অ্যাকাউন্ট চেনার জন্য ব্যবহার হয়।
• Drive ব্যাকআপ: আপনি নিজে “এখন ব্যাকআপ” চাপলে এনক্রিপ্ট করা ফাইল আপনার নিজের Google Drive-এর private appDataFolder-এ যায়। পাসফ্রেজ অ্যাপ বা আমরা কখনো সংরক্ষণ করি না।

৩. অনুমতি
• ইন্টারনেট: শুধু Google সাইন-ইন ও স্পষ্ট ব্যাকআপ/রিস্টোরের জন্য।
• বিজ্ঞপ্তি: শুধু আপনি তৈরি করা রিমাইন্ডার দেখাতে। Settings থেকে বন্ধ করা যায়।

৪. শেয়ারিং
আপনার ব্যক্তিগত বা ফিন্যান্স ডেটা আমরা বেচি বা তৃতীয় পক্ষের সাথে শেয়ার করি না। Google শুধু আপনার নির্বাচিত সাইন-ইন/ব্যাকআপের জন্য ব্যবহৃত হয়।

৫. সংরক্ষণ ও মুছে ফেলা
ফিন্যান্স ডেটা আপনি না মোছা পর্যন্ত ডিভাইসেই থাকে। Google অ্যাকাউন্ট ডেটা ও Drive ব্যাকআপ Settings → Privacy & Account → “Delete Google account data” থেকে মুছে ফেলা যায়। সব লোকাল ডেটা মুছতে “Reset application” ব্যবহার করুন।

৬. নিরাপত্তা
ব্যাকআপ আপলোডের আগে AES-256-GCM দিয়ে এনক্রিপ্ট হয়। টোকেন শুধু মেমোরিতে থাকে। অ্যাপে কোনো client secret নেই।

৭. শিশু
এই অ্যাপ ১৩ বছরের কম বয়সী শিশুদের জন্য নয়।

৮. পরিবর্তন
নীতি বদলালে অ্যাপের ভেতরে ও প্রকাশিত পেইজে নতুন সংস্করণ দেখানো হবে।

৯. যোগাযোগ
প্রশ্ন বা অনুরোধ: WhatsApp https://wa.me/8801326552304 — রনি রিমান।`;

export function privacyPolicy(lang: Lang) {
  return lang === 'bn' ? PRIVACY_POLICY_BN : PRIVACY_POLICY_EN;
}
