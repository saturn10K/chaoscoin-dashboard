import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { monadTestnet } from "./contracts";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});
