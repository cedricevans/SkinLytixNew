import { test, expect } from '@playwright/test';

test.describe('SkinLytix E2E Smoke Test', () => {
  const email = 'cedric.evans@gmail.com';
  const password = 'pa55word';

  test('Sign up, login, upload, compare, save, delete', async ({ page }) => {
  // 1. Log in
    await page.goto('https://skin-lytix.vercel.app/auth');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Sign In")');
    // Wait for either navigation to a valid page or error toast
    const loginResult = await Promise.race([
      page.waitForURL(/\/(home|onboarding|walkthrough)$/i, { timeout: 15000 }).then(() => 'success'),
      // Wait for toast notification with 'Sign In Failed'
      page.locator('div[role="alert"]:has-text("Sign In Failed")').waitFor({ timeout: 15000 }).then(() => 'toast-error').catch(() => 'timeout')
    ]);
    if (loginResult !== 'success') {
      // Print toast error content if present
      const toastText = await page.locator('div[role="alert"]').allTextContents();
      if (toastText.length > 0) {
        console.log('Toast notifications after login:', toastText);
      }
      // Print the current URL and visible text for further debugging
      const currentUrl = page.url();
      const visibleText = await page.locator('body').innerText();
      console.log('Current URL after login:', currentUrl);
      console.log('Visible text after login:', visibleText);
      // Check for any modals or alerts
      const modalText = await page.locator('[role="dialog"], .modal, .alert').allTextContents();
      if (modalText.length > 0) {
        console.log('Modal/alert text after login:', modalText);
      }
      // Print the full page content for further debugging
      const pageContent = await page.content();
      console.log('Page content after login:', pageContent);
      throw new Error('Login failed or error message detected.');
    }

    // 3. Upload a product (manual entry)
    await page.click('text=Analyze a Product');
    await page.fill('input[placeholder*="Product Name"]', 'Test Serum');
    await page.fill('textarea[placeholder*="Ingredients"]', 'Water, Glycerin, Niacinamide');
    await page.click('button:has-text("Analyze")');
    await expect(page.locator('text=Analysis Complete')).toBeVisible();

    // 4. Compare
    await page.click('text=Compare');
    await page.click('button:has-text("Find Market Dupes")');
    await expect(page.locator('text=Dupe Discovery')).toBeVisible();
    await expect(page.locator('text=Market Dupes')).toBeVisible();

    // 5. Save a dupe (if any)
    const saveButtons = page.locator('button:has-text("Save")');
    if (await saveButtons.count() > 0) {
      await saveButtons.first().click();
      await expect(page.locator('text=Saved to favorites')).toBeVisible();
    }

    // 6. Delete product/analysis
    await page.click('text=Profile');
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=No products found')).toBeVisible();

    // 7. Log out
    await page.click('text=Logout');
    await expect(page).toHaveURL(/login/i);
  });
});
