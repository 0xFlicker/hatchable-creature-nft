// Next.js component with an id parameter
import { GetServerSideProps } from "next";
import { ParsedUrlQuery } from "querystring";
import Token from "../../layouts/token";
import React from "react";
import { creatureContractFactory } from "../../web3/creature";

interface IParams {
  id: number;
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  // const creatureContract = creatureContractFactory();
  const params = context.params;
  const tokenId = Number(params?.id?.toString());
  // const tokenURI = await creatureContract.tokenURI(tokenId);

  // Pass data to the page via props
  return { props: { tokenId } };
};

export default Token;
