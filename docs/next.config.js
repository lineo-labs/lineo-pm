import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
});

const isGithubPages = process.env.GITHUB_PAGES === 'true';

export default withNextra({
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: []
  },
  basePath: isGithubPages ? '/lineo-pm' : '',
  trailingSlash: true,
  distDir: 'out'
});
