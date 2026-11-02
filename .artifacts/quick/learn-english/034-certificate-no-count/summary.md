---
slug: certificate-no-count
completed: 2026-11-02
---

# Summary: Drop the count from the certificate's English text

## What Changed

`englishAchievementText(kind, level)` no longer takes a total and always uses the plural ("words", "grammar topics", "irregular verbs"). The certificate drawing calls it without the count. The Vietnamese dialog description and the image's alt text are unchanged ("Bạn đã học xong 3 động từ bất quy tắc trình độ C1."). AC-004 in the 009 spec now says the image shows no count.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/profile/certificate.ts` | `englishAchievementText` drops the count; plural kind names |
| `apps/learn-english/src/components/profile/profile.test.tsx` | Expectations without the count |
| `.artifacts/features/learn-english/009-progress-certificates/spec.md` | AC-004 examples updated |
