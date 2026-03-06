import { useEffect } from 'react';
import '../styles/feature-cards.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add custom app logic if needed
  }, []);

  return <Component {...pageProps} />;
}
