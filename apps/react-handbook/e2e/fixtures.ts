import { test as base } from "@playwright/test";

import { AccessibleModalPage } from "./pages/accessible-modal.page";
import { DebouncedSearchPage } from "./pages/debounced-search.page";
import { MultiStepFormPage } from "./pages/multi-step-form.page";
import { ToastPage } from "./pages/toast.page";

type Pages = {
  searchPage: DebouncedSearchPage;
  formPage: MultiStepFormPage;
  modalPage: AccessibleModalPage;
  toastPage: ToastPage;
};

// Each fixture opens its page in the test's own fresh browser context and
// hands the page object to the test; nothing is shared between tests.
export const test = base.extend<Pages>({
  searchPage: async ({ page }, use) => {
    const searchPage = new DebouncedSearchPage(page);
    await searchPage.goto();
    await use(searchPage);
  },
  formPage: async ({ page }, use) => {
    const formPage = new MultiStepFormPage(page);
    await formPage.goto();
    await use(formPage);
  },
  modalPage: async ({ page }, use) => {
    const modalPage = new AccessibleModalPage(page);
    await modalPage.goto();
    await use(modalPage);
  },
  toastPage: async ({ page }, use) => {
    // A fake clock lets the test move time forward instead of waiting for it.
    await page.clock.install();
    const toastPage = new ToastPage(page);
    await toastPage.goto();
    await use(toastPage);
  },
});

export { expect } from "@playwright/test";
