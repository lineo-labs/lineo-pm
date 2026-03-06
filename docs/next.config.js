import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
});

const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default withNextra({
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: isGithubPages ? '/lineo-pm' : '',
  assetPrefix: isGithubPages ? '/lineo-pm/' : '',
  trailingSlash: true
});
