import '/public/css/globals.css'
import MCPStatusIndicator from '../components/MCPStatusIndicator';

function MyApp({ Component, pageProps }) {
  return (
    <>
      {/*<MCPStatusIndicator />*/}
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
