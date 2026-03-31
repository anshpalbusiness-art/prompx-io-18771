const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/dashboard');
  await page.waitForTimeout(3000);
  await page.fill('textarea', 'hello');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  const size = await page.evaluate(() => {
    const messages = document.querySelectorAll('.flex.gap-4');
    const scrollContainer = messages[0].parentElement;
    return {
      msgs: messages.length,
      containerClasses: scrollContainer.className,
      containerTop: scrollContainer.getBoundingClientRect().top,
      containerHeight: scrollContainer.getBoundingClientRect().height,
      firstMsgTop: messages[0].getBoundingClientRect().top
    }
  });
  console.log(size);
  await browser.close();
})();
