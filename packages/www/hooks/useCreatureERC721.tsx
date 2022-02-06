import { ethers } from "ethers";
import {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { networks } from "@creaturenft/contracts";
import {
  ChildCreatureERC721,
  ChildCreatureERC721__factory,
} from "@creaturenft/contracts/typechain";
import { findContractAddress } from "@creaturenft/web3";

import config from "../utils/config";

interface IContext {
  contract?: ChildCreatureERC721;
  provider?: ethers.providers.Web3Provider;
  accounts?: string[];
  connect?: () => void;
}

const ContractContext = createContext<IContext>({});

function useCreatureERC721(context: IContext = {}) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [accounts, setAccounts] = useState<string[]>();
  const [creatureERC721, setCreatureERC721] = useState<ChildCreatureERC721>();
  useEffect(() => {
    if (context.provider) {
      setProvider(context.provider);
    }
    if (context.contract) {
      setCreatureERC721(context.contract);
    }
    if (context.accounts) {
      setAccounts(context.accounts);
    }
  }, [context.accounts, context.contract, context.provider]);

  const connect = useCallback(async () => {
    if (!window.ethereum?.request) {
      // TODO: Handle this error
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setProvider(provider);
    setAccounts(accounts);

    // get contract address
    const contractAddress = findContractAddress(
      networks,
      config.chainId,
      config.network,
      "ChildCreatureERC721"
    );
    if (contractAddress) {
      const contract = ChildCreatureERC721__factory.connect(
        contractAddress,
        provider.getSigner(accounts[0])
      );
      setCreatureERC721(contract);
    }
  }, []);
  useEffect(() => {
    // get contract address
    const contractAddress = findContractAddress(
      networks,
      config.chainId,
      config.network,
      "ChildCreatureERC721"
    );
    if (contractAddress) {
      if (!window.ethereum?.request) {
        // TODO: Handle this error
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = ChildCreatureERC721__factory.connect(
        contractAddress,
        provider
      );
      setCreatureERC721(contract);
    }
  }, []);
  return useMemo(() => {
    return {
      provider,
      accounts,
      connect,
      contract: creatureERC721,
    };
  }, [provider, accounts, connect, creatureERC721]);
}

const Provider: FC = ({ children }) => {
  const [state, setState] = useState<IContext>({});
  const context = useCreatureERC721(state);
  useEffect(() => {
    setState({ ...context });
  }, [context]);

  return (
    <ContractContext.Provider value={state}>
      {children}
    </ContractContext.Provider>
  );
};

export default function () {
  return useContext(ContractContext);
}
export { Provider };
