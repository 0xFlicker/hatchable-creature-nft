import React, { FC } from "react";
import { Provider as CreatureERC721Provider } from "../hooks/useCreatureERC721";
import CreatureCard from "../components/creature/CreatureCard";

interface IProps {
  tokenId: number;
}
const Token: FC<IProps> = ({ tokenId }) => {
  return (
    <CreatureERC721Provider>
      <CreatureCard tokenId={tokenId} />
    </CreatureERC721Provider>
  );
};

export default Token;
