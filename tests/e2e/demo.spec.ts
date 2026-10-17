import { test, expect } from '@playwright/test';
test('dashboard, theme and responsive navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Good decisions start with evidence.' }),
  ).toBeVisible();
  await expect(page.getByText('DEMO DATA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle colour theme' }).filter({ visible: true }).click();
  await expect(page.locator('.app')).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  if (test.info().project.name === 'mobile') {
    await page.getByText('More', { exact: true }).click();
    await page
      .getByRole('link', { name: 'Settings', exact: true })
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'The rules behind the research.' }),
    ).toBeVisible();
  }
});
test('explorer search filters pagination compare limit and empty state', async ({ page }) => {
  await page.goto('./#/products');
  await expect(page.getByText('20 candidates · stock and source dates unverified')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByRole('searchbox').count();
  await page.getByLabel('Search products', { exact: true }).fill('ratchet');
  await expect(page.getByText('1 candidates · stock and source dates unverified')).toBeVisible();
  await page.getByLabel('Search products', { exact: true }).fill('');
  await page.getByLabel('Rows per page').selectOption('20');
  const checks = page.getByRole('checkbox');
  for (let i = 0; i < 5; i++) await checks.nth(i).check();
  await checks.nth(5).click();
  await expect(checks.nth(5)).not.toBeChecked();
  await expect(page.getByRole('status')).toContainText('up to five');
  await expect(page.getByRole('link', { name: /Compare selected \(5\/5\)/ })).toBeVisible();
  await page.getByRole('link', { name: /Compare selected/ }).click();
  await expect(page.locator('.compare-grid>.card')).toHaveCount(5);
  const payments = page.getByLabel(/— supplier payment/);
  const orders = page.getByLabel(/— unsettled orders/);
  await payments.nth(0).fill('10');
  await orders.nth(0).fill('40');
  for (let i = 1; i < 5; i++) await orders.nth(i).fill('0');
  await expect(page.getByText('Budget exceeded', { exact: false })).toBeVisible();
  await expect(page.getByText('£450.00', { exact: true })).toBeVisible();
  await page.goto('./#/products');
  await page.getByLabel('Filter status').selectOption('APPROVED_FOR_REVIEW');
  await expect(page.getByRole('heading', { name: 'No matching leads' })).toBeVisible();
});
test('calculator recalc, stress, unknown shipping and threshold solver', async ({ page }) => {
  await page.goto('./#/profit');
  await page.getByLabel('Supplier delivery per order (£)', { exact: true }).fill('3');
  await page.getByLabel('Supplier handling per order (£)', { exact: true }).fill('0.40');
  await expect(page.locator('.big-result')).toHaveText('£2.80');
  await page.getByRole('button', { name: 'Calculate break-even & target scenarios' }).click();
  await expect(page.getByText('Smallest price at break-even:', { exact: false })).toBeVisible();
  await page.getByLabel('Supplier delivery per order (£)', { exact: true }).fill('');
  await expect(page.locator('.big-result')).toHaveText('Not verified');
  await expect(
    page.getByRole('button', { name: 'Calculate break-even & target scenarios' }),
  ).toBeDisabled();
  await page.getByLabel('Selling price per order (£)', { exact: true }).fill('-5');
  await expect(page.getByRole('alert')).toBeVisible();
});
test('synthetic evidence never overrides safety and missing demand withholds score', async ({
  page,
}) => {
  await page.goto('./#/research');
  await expect(page.getByRole('heading', { name: /Rating: withheld/ })).toBeVisible();
  await page.getByLabel('Evidence experiment').selectOption('complete');
  await expect(page.getByRole('heading', { name: /Rating: \d+ \/100/ })).toBeVisible();
  await expect(page.getByText('Profitability:', { exact: false })).toBeVisible();
  await page.getByLabel('Evidence experiment').selectOption('safety');
  await expect(page.getByRole('heading', { name: /Rating:.*blocked/ })).toBeVisible();
  await page.goto('./#/products/lead-001');
  await expect(
    page.getByRole('heading', { name: '58-piece ratchet screwdriver set' }),
  ).toBeVisible();
  await expect(page.getByText('rating withheld', { exact: false })).toBeVisible();
});
test('local run and CSV download with all leads', async ({ page }) => {
  await page.goto('./#/runs');
  await page.getByRole('button', { name: 'Run demo screen' }).click();
  await expect(page.getByRole('heading', { name: 'DEMO-1', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this snapshot' }).click();
  expect((await download).suggestedFilename()).toContain('DEMO-1');
});
