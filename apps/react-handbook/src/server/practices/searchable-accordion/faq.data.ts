import type { FaqEntry } from "./faq.schema";

// Hand-written help-center content. Includes accented words, markup-like
// text and pattern characters on purpose: they are search test cases.
export const FAQ_ENTRIES: FaqEntry[] = [
  // Account
  { id: "acc-1", category: "Account", question: "How do I change my email address?", answer: "Go to Settings → Account, choose Edit next to your email, and confirm the change from the link we send to the new address." },
  { id: "acc-2", category: "Account", question: "Can I upload my résumé to my profile?", answer: "Yes. Profiles accept a résumé in PDF or DOCX up to 5 MB. Recruiters only see it when your profile is set to visible." },
  { id: "acc-3", category: "Account", question: "How do I enable two-factor authentication?", answer: "Open Settings → Security and turn on two-factor authentication. You can use an authenticator app or SMS codes as a backup." },
  { id: "acc-4", category: "Account", question: "I forgot my password", answer: "Use “Forgot password” on the sign-in page. The reset link expires after 30 minutes for your security." },
  { id: "acc-5", category: "Account", question: "Can I merge two accounts?", answer: "Accounts can't be merged automatically. Contact support from the account you want to keep and we'll move your order history." },
  { id: "acc-6", category: "Account", question: "How do I delete my account?", answer: "Deleting your account is permanent. Go to Settings → Privacy → Delete account; pending refunds are paid out first." },
  { id: "acc-7", category: "Account", question: "Why does my name show as <b>Guest</b>?", answer: "You're signed out, or your session expired. Sign in again and your display name replaces the <b>Guest</b> label." },
  // Billing
  { id: "bil-1", category: "Billing", question: "Which payment methods do you accept?", answer: "We accept Visa, Mastercard and American Express cards, PayPal, and bank transfer for business accounts." },
  { id: "bil-2", category: "Billing", question: "Why was my card declined?", answer: "Most declines come from the bank. Check the card number, expiry date and billing address, or ask your bank to allow the payment." },
  { id: "bil-3", category: "Billing", question: "How do I get an invoice?", answer: "Invoices are emailed after every payment. You can also download them as PDF from Orders → Invoices." },
  { id: "bil-4", category: "Billing", question: "Can I pay in instalments?", answer: "Orders over €200 can be split into 3 interest-free instalments at checkout, subject to approval." },
  { id: "bil-5", category: "Billing", question: "Do prices include VAT?", answer: "Prices for EU customers include VAT. Business customers can add a VAT ID at checkout to remove it." },
  { id: "bil-6", category: "Billing", question: "What is the Pro plan (beta)?", answer: "Pro (beta) adds priority support and bulk export. It costs $12/month and you can cancel at any time." },
  { id: "bil-7", category: "Billing", question: "I was charged twice", answer: "A second charge is usually a pending authorization that disappears within 5 business days. If it doesn't, we'll refund the duplicate to your card." },
  // Shipping
  { id: "shp-1", category: "Shipping", question: "How long does delivery take?", answer: "Standard delivery takes 2–4 business days; express arrives the next business day if you order before 14:00." },
  { id: "shp-2", category: "Shipping", question: "Do you ship to Zürich and the rest of Switzerland?", answer: "Yes. Orders to Switzerland, including Zürich and Genève, ship with customs duties prepaid so there are no surprises on delivery." },
  { id: "shp-3", category: "Shipping", question: "Can I change my delivery address?", answer: "You can change the address until the order is packed. After that, ask the carrier to redirect the parcel using your tracking link." },
  { id: "shp-4", category: "Shipping", question: "How do I track my order?", answer: "Every shipping confirmation email has a tracking link. You can also find it under Orders → Track." },
  { id: "shp-5", category: "Shipping", question: "My parcel arrived damaged", answer: "Take photos of the box and the item, then report it within 48 hours from the order page. We'll send a replacement or refund your card." },
  { id: "shp-6", category: "Shipping", question: "Is shipping free?", answer: "Shipping is free on orders over €50. Below that, standard shipping costs €4.90." },
  { id: "shp-7", category: "Shipping", question: "Do you deliver to a café or office?", answer: "Yes, any address works, including a café, office or parcel locker. Add the business name so the courier can find you." },
  // Returns
  { id: "ret-1", category: "Returns", question: "What is your return policy?", answer: "You can return most items within 30 days of delivery, unused and in their original packaging." },
  { id: "ret-2", category: "Returns", question: "How do I get a refund?", answer: "Start a return from Orders. Once we receive the item, the refund goes back to your original payment method, usually your card, within 5 days." },
  { id: "ret-3", category: "Returns", question: "Can I exchange an item for another size?", answer: "Yes. Choose Exchange when starting the return and pick the new size; we ship it as soon as the original is scanned by the carrier." },
  { id: "ret-4", category: "Returns", question: "Are return labels free?", answer: "Return labels are free within the EU. For other countries, the label cost is deducted from your refund." },
  { id: "ret-5", category: "Returns", question: "Which items can't be returned?", answer: "Gift cards, personalised items and opened software (for example a C++ compiler licence) can't be returned." },
  { id: "ret-6", category: "Returns", question: "My refund hasn't arrived", answer: "Refunds can take up to 10 days to appear, depending on your bank. If it's been longer, contact us with your order number." },
  { id: "ret-7", category: "Returns", question: "Can I return a gift?", answer: "Yes, with the gift receipt. The refund is issued as store credit to the person returning the item." },
  // Privacy
  { id: "prv-1", category: "Privacy", question: "What data do you collect?", answer: "We collect what's needed to process orders: name, address, email and payment details. Analytics are anonymised." },
  { id: "prv-2", category: "Privacy", question: "How do I download my data?", answer: "Request an export from Settings → Privacy. You'll receive a ZIP with your data in JSON within 24 hours." },
  { id: "prv-3", category: "Privacy", question: "Do you sell my data?", answer: "No. We never sell personal data. We share it only with the payment and delivery partners needed for your order." },
  { id: "prv-4", category: "Privacy", question: "How do I opt out of marketing emails?", answer: "Use the unsubscribe link in any email, or turn off marketing under Settings → Notifications." },
  { id: "prv-5", category: "Privacy", question: "Which cookies do you use?", answer: "Essential cookies keep you signed in and your cart saved. Analytics cookies are optional and off until you accept them." },
  { id: "prv-6", category: "Privacy", question: "Is my payment information stored?", answer: "Card details are tokenised by our payment provider; we never store the full card number on our servers." },
  // Technical
  { id: "tec-1", category: "Technical", question: "Which browsers are supported?", answer: "The latest two versions of Chrome, Firefox, Safari and Edge. Older browsers may work but aren't tested." },
  { id: "tec-2", category: "Technical", question: "The app is slow. What can I do?", answer: "Clear your cache, disable heavy extensions, and check your connection. Version 1.5 and later load pages much faster." },
  { id: "tec-3", category: "Technical", question: "Is there a dark mode?", answer: "Yes. The app follows your system setting, so switching your device to dark mode switches the app too." },
  { id: "tec-4", category: "Technical", question: "Do you have an API?", answer: "A REST API is available on the Pro plan. Keys are created under Settings → Developers; requests are limited to 100 per minute." },
  { id: "tec-5", category: "Technical", question: "How do I mark a task as done in the app?", answer: "Tick the checkbox next to the task. In Markdown notes, type [x] to render a completed checkbox." },
  { id: "tec-6", category: "Technical", question: "Why do I see “naïve date” errors in exports?", answer: "Exports without a time zone are naïve dates. Set your time zone under Settings → Region to export full timestamps." },
];
