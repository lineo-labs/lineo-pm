import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add custom app logic if needed
  }, []);

  return <Component {...pageProps} />;
}
