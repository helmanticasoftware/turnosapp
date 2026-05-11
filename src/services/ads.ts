export const adUnits = {
  bannerAndroid:
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ??
    "ca-app-pub-3485168250647378/6442959343",
  bannerIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? "",
};

export const requiresEuropeanConsent = true;

export const adMobAppIds = {
  android:
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ??
    "ca-app-pub-3485168250647378~1198686158",
  ios: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? "",
};
