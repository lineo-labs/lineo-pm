const basePath = process.env.GITHUB_PAGES === 'true' ? '/lineo-pm' : '';

const config = {
  logo: (
    <img
      src={`${basePath}/logo.png`}
      alt="Lineo PM"
      style={{ height: '22px', width: 'auto' }}
    />
  ),
  project: {
    link: 'https://github.com/lines-labs/lineo-pm'
  },
  docsRepositoryBase: 'https://github.com/lines-labs/lineo-pm',
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
  footer: {
    text: 'Lineo PM Documentation © 2026'
  }
};

export default config;
