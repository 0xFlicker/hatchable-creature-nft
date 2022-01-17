import { FC, useEffect, useState } from "react";
import { utils as etherUtils } from "ethers";
import useCreatureERC721 from "../hooks/useCreatureERC721";

interface Props {
  className?: string;
  formatter: (value: string) => string;
}

const MintCost: FC<Props> = ({ className, formatter }) => {
  const { contract } = useCreatureERC721();
  const [mintCost, setMintCost] = useState<string | undefined>();
  useEffect(() => {
    if (contract) {
      contract.mintCost().then((bn) => {
        // Convert to ether
        const etherCost = etherUtils.formatEther(bn);
        setMintCost(etherCost);
      });
    }
  }, [contract]);

  return (
    <span className={className}>
      {mintCost ? formatter(mintCost) : undefined}
    </span>
  );
};

export default MintCost;
