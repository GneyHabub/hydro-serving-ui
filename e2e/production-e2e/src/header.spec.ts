import { Page, Browser, ElementHandle, HTMLOrSVGElementHandle } from 'playwright';
import appConfig from '../app-config';
import initializeBrowser from '../helpers/initializeBrowser';

describe('Header test', () => {
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    await initializeBrowser().then(config => {
      browser = config.browser;
      page = config.page;
    });

    await page.goto(appConfig.url);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('loaded', async () => {
    expect(page).toBeTruthy();
  });

  describe('header', () => {
    let header: ElementHandle<HTMLOrSVGElement>;

    beforeAll(async () => {
      header = await page.$('hs-header header');
    });

    it('exists', async () => {
      expect(header).toBeTruthy();
    });

    describe('navigation', () => {
      let navigation: HTMLOrSVGElementHandle;

      beforeEach(async () => {
        navigation = await header.$('.header-nav');
      });

      it('exists', async () => {
        expect(navigation).toBeTruthy();
      });

      it('has two main links', async () => {
        const linksCount = await navigation.$$eval('a', links => links.length);
        expect(linksCount).toBe(2);
      });

      describe('model link', () => {
        let link: HTMLOrSVGElementHandle;

        beforeAll(async () => {
          link = await navigation.$('a:first-of-type');
        });

        it('exist', () => {
          expect(link).toBeTruthy();
        });
        it('has right name', async () => {
          expect(await link.evaluate(el => el.textContent)).toBe('Models');
        });
        it('after clicked show models page', async () => {
          await link.click();
        });
      });
      describe('applications link', () => {
        let link: HTMLOrSVGElementHandle;

        beforeAll(async () => {
          link = await navigation.$('a:last-of-type');
        });

        it('exist', () => {
          expect(link).toBeTruthy();
        });
        it('has right name', async () => {
          expect(await link.evaluate(el => el.textContent)).toBe(
            'Applications'
          );
        });
        it('after clicked show applications page', async () => {
          await link.click();
        });
      });
    });
  });
});
