import '../styles/globals.css';

// Components
import Header from '../components/Header';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Header>
        <Component {...pageProps} />
      </Header>
    </>
  );
}

export default MyApp;